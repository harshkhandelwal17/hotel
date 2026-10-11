const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  downloadContentFromMessage,
  fetchLatestWaWebVersion,
  Browsers,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const { saveMediaBuffer } = require('../utils/mediaStorage');

// In-memory active sockets, pending QR codes, connecting locks, pairing state, and explicit disconnects
const sessions = new Map();           // hostelId -> socket
const qrCodes = new Map();            // hostelId -> base64 qr image string
const connectingPromises = new Map(); // hostelId -> Promise<result>
const pairingStates = new Map();      // hostelId -> boolean (true when QR scanned and authenticating)
const explicitlyDisconnected = new Set(); // hostelId -> explicitly disconnected flag

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Recursively unwrap nested WhatsApp message structures to find image or ID document
 */
const extractTargetMedia = (message) => {
  if (!message) return null;

  // 1. Direct Image Message
  if (message.imageMessage) {
    return { type: 'image', media: message.imageMessage };
  }

  // 2. Direct Document Message (if image format or PDF ID)
  if (message.documentMessage) {
    const mime = (message.documentMessage.mimetype || '').toLowerCase();
    const fn = (message.documentMessage.fileName || '').toLowerCase();
    if (
      mime.startsWith('image/') ||
      mime.includes('pdf') ||
      fn.endsWith('.jpg') ||
      fn.endsWith('.jpeg') ||
      fn.endsWith('.png') ||
      fn.endsWith('.webp') ||
      fn.endsWith('.pdf')
    ) {
      return { type: 'document', media: message.documentMessage };
    }
  }

  // 3. Ephemeral Message wrapper (Disappearing messages)
  if (message.ephemeralMessage?.message) {
    return extractTargetMedia(message.ephemeralMessage.message);
  }

  // 4. View Once Message wrappers
  if (message.viewOnceMessage?.message) {
    return extractTargetMedia(message.viewOnceMessage.message);
  }
  if (message.viewOnceMessageV2?.message) {
    return extractTargetMedia(message.viewOnceMessageV2.message);
  }
  if (message.viewOnceMessageV2Extension?.message) {
    return extractTargetMedia(message.viewOnceMessageV2Extension.message);
  }

  // 5. Document with caption wrapper
  if (message.documentWithCaptionMessage?.message) {
    return extractTargetMedia(message.documentWithCaptionMessage.message);
  }

  // 6. Template or interactive wrappers
  if (message.templateMessage?.hydratedTemplate) {
    return extractTargetMedia(message.templateMessage.hydratedTemplate);
  }
  if (message.interactiveMessage?.header) {
    return extractTargetMedia(message.interactiveMessage.header);
  }

  // 7. Edited message wrapper
  if (message.protocolMessage?.editedMessage) {
    return extractTargetMedia(message.protocolMessage.editedMessage);
  }

  return null;
};

/**
 * Download media buffer with resilient fallback strategies
 */
const downloadMediaBuffer = async (sock, msg, target) => {
  let buffer = null;

  // Attempt 1: Direct stream with matching media type
  try {
    const stream = await downloadContentFromMessage(
      target.media,
      target.type === 'document' ? 'document' : 'image'
    );
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    buffer = Buffer.concat(chunks);
  } catch (err1) {
    console.warn(`[WhatsApp] Direct stream (${target.type}) error:`, err1.message);
  }

  // Attempt 2: Alternative media type
  if (!buffer || buffer.length === 0) {
    try {
      const altType = target.type === 'document' ? 'image' : 'document';
      const stream = await downloadContentFromMessage(target.media, altType);
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    } catch (_) {}
  }

  // Attempt 3: downloadMediaMessage with original msg
  if (!buffer || buffer.length === 0) {
    try {
      buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );
    } catch (err3) {
      console.warn('[WhatsApp] downloadMediaMessage original msg failed:', err3.message);
    }
  }

  // Attempt 4: downloadMediaMessage with unwrapped synthetic message
  if (!buffer || buffer.length === 0) {
    try {
      const syntheticMsg = {
        key: msg.key,
        message: {
          [target.type === 'image' ? 'imageMessage' : 'documentMessage']: target.media
        }
      };
      buffer = await downloadMediaMessage(
        syntheticMsg,
        'buffer',
        {},
        {
          logger: pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage
        }
      );
    } catch (err4) {
      console.warn('[WhatsApp] downloadMediaMessage synthetic msg failed:', err4.message);
    }
  }

  return buffer;
};

/**
 * Process single incoming WhatsApp message and ingest ID photo
 */
const processIncomingMessage = async (sock, hostelId, msg, hostel) => {
  if (!msg || !msg.message) return;

  const target = extractTargetMedia(msg.message);
  if (!target) return;

  const rawSender = msg.key?.participant || msg.key?.remoteJid || '';
  if (rawSender === 'status@broadcast' || rawSender.includes('@broadcast')) return;

  const isFromSelf = !!msg.key?.fromMe;
  let senderPhone = '';

  if (isFromSelf) {
    senderPhone = hostel?.whatsappPhone || (sock.user?.id ? sock.user.id.split(':')[0].split('@')[0] : 'Reception');
  } else {
    // Strip @s.whatsapp.net or @lid
    const cleanJid = rawSender.split('@')[0].split(':')[0];
    senderPhone = cleanJid;
  }

  const senderName = isFromSelf ? 'Reception Phone' : (msg.pushName || 'Guest');
  const messageId = msg.key?.id;

  // Deduplicate against existing MongoDB entries
  if (messageId) {
    const existing = await WhatsAppMedia.findOne({ messageId, hostel: hostelId });
    if (existing) {
      return;
    }
  }

  console.log(`[WhatsApp] 📸 Processing incoming photo from ${senderPhone} (${senderName}, fromMe: ${isFromSelf}) [MsgID: ${messageId || 'unknown'}] for Hostel ${hostelId}`);

  try {
    const buffer = await downloadMediaBuffer(sock, msg, target);
    if (buffer && buffer.length > 0) {
      const mimeType = target.media.mimetype || 'image/jpeg';
      const uploadedUrl = await saveMediaBuffer(buffer, mimeType);

      const record = await WhatsAppMedia.create({
        hostel: hostelId,
        senderPhone,
        senderName,
        imageUrl: uploadedUrl,
        messageId: messageId || undefined,
        messageTimestamp: msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date(),
        status: 'new'
      });

      console.log(`[WhatsApp] ✅ Successfully ingested and saved ID photo: ${uploadedUrl} [ID: ${record._id}]`);
    } else {
      console.error(`[WhatsApp] ❌ Failed to extract media buffer for message ${messageId}`);
    }
  } catch (dlErr) {
    console.error(`[WhatsApp] ❌ Error saving incoming media:`, dlErr);
  }
};

/**
 * Initialize or get WhatsApp session for a specific hostel
 */
const startHostelWhatsApp = async (hostelId) => {
  if (!hostelId || !mongoose.Types.ObjectId.isValid(hostelId)) {
    throw new Error('Valid Hostel ID is required');
  }

  // Deduplicate concurrent connection requests
  if (connectingPromises.has(hostelId)) {
    console.log(`[WhatsApp] Awaiting in-flight connection for Hostel ${hostelId}...`);
    return connectingPromises.get(hostelId);
  }

  explicitlyDisconnected.delete(hostelId);

  const connectPromise = (async () => {
    // Verify that Super Admin has enabled WhatsApp Sync for this hostel
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) throw new Error('Hostel not found');
    if (!hostel.whatsappSyncEnabled) {
      throw new Error('WhatsApp Live Sync is not enabled for this property. Contact Super Admin.');
    }

    // If already connected, return existing active status
    if (sessions.has(hostelId)) {
      const existingSock = sessions.get(hostelId);
      if (existingSock?.user) {
        return {
          status: 'connected',
          phone: hostel.whatsappPhone || existingSock.user.id.split(':')[0].split('@')[0],
          qr: null,
          pairing: false
        };
      }
      // If socket is currently active and waiting for QR or in pairing handshake, DO NOT KILL IT!
      if (qrCodes.has(hostelId) || pairingStates.get(hostelId)) {
        return {
          status: 'connecting',
          phone: hostel.whatsappPhone || '',
          qr: qrCodes.get(hostelId) || null,
          pairing: !!pairingStates.get(hostelId)
        };
      }
      // Clean dead socket only if disconnected
      try { existingSock.end(); } catch (_) {}
      sessions.delete(hostelId);
    }

    const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
    
    // Guard against corrupted 0-byte creds.json (allow ongoing flush to finish)
    const credsPath = path.join(authPath, 'creds.json');
    if (fs.existsSync(credsPath)) {
      try {
        let stats = fs.statSync(credsPath);
        if (stats.size === 0) {
          await new Promise((r) => setTimeout(r, 200));
          if (fs.existsSync(credsPath)) {
            stats = fs.statSync(credsPath);
            if (stats.size === 0) {
              fs.rmSync(authPath, { recursive: true, force: true });
            }
          }
        }
      } catch (_) {}
    }

    const { state, saveCreds } = await useMultiFileAuthState(authPath);
    let version = [2, 3000, 1049994111];
    try {
      const waVersion = await fetchLatestWaWebVersion();
      if (waVersion?.version) {
        version = waVersion.version;
        console.log(`[WhatsApp] Using latest WhatsApp Web version: ${version.join('.')}`);
      }
    } catch (_) {}
    const logger = pino({ level: 'warn' });

    console.log(`[WhatsApp] Initializing Baileys socket for Hostel ${hostelId} (v${version.join('.')})...`);

    const sock = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'), // Standard WhatsApp Web companion fingerprint
      syncFullHistory: false,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      emitOwnEvents: true,
      fireInitQueries: true,
      retryRequestDelayMs: 500,
      maxMsgRetryCount: 5,
      getMessage: async () => ({ conversation: '' })
    });

    sessions.set(hostelId, sock);

    sock.ev.on('creds.update', async (update) => {
      await saveCreds();
      // Only mark pairing progress when user identity (update.me) is actually received from phone
      if (update?.me) {
        const phone = update.me.id?.split(':')[0]?.split('@')[0] || '';
        const isAlreadyConnected = !!(sock.user || sessions.get(hostelId)?.user);
        if (!isAlreadyConnected) {
          console.log(`[WhatsApp] 📲 Handshake credentials received for Hostel ${hostelId} (+${phone}), pairing in progress...`);
          pairingStates.set(hostelId, true);
          qrCodes.delete(hostelId);
          await Hostel.findByIdAndUpdate(hostelId, {
            whatsappStatus: 'connecting',
            whatsappPhone: phone
          }).catch(() => {});
        } else {
          await Hostel.findByIdAndUpdate(hostelId, {
            whatsappPhone: phone,
            whatsappStatus: 'connected'
          }).catch(() => {});
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;

      if (isNewLogin) {
        console.log(`[WhatsApp] 📲 QR Scanned / New Login detected for Hostel ${hostelId}`);
        qrCodes.delete(hostelId);
        pairingStates.set(hostelId, true);
        await Hostel.findByIdAndUpdate(hostelId, { whatsappStatus: 'connecting' }).catch(() => {});
      }

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
          qrCodes.set(hostelId, qrDataUrl);
          pairingStates.delete(hostelId);
          await Hostel.findByIdAndUpdate(hostelId, { whatsappStatus: 'connecting' }).catch(() => {});
          console.log(`[WhatsApp] New QR generated for Hostel ${hostelId}`);
        } catch (qrErr) {
          console.error('Failed to generate QR data URL:', qrErr);
        }
      }

      if (connection === 'open') {
        const rawUser = sock.user?.id || '';
        const phone = rawUser.split(':')[0].split('@')[0];
        qrCodes.delete(hostelId);
        pairingStates.delete(hostelId);

        await Hostel.findByIdAndUpdate(hostelId, {
          whatsappStatus: 'connected',
          whatsappPhone: phone,
          whatsappLastActive: new Date()
        });

        console.log(`[WhatsApp] ✅ Hostel ${hostelId} successfully connected as +${phone}`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const isForbidden = statusCode === DisconnectReason.forbidden;
        const isRestart = statusCode === DisconnectReason.restartRequired; // 515
        const isReplaced = statusCode === DisconnectReason.connectionReplaced; // 440

        console.log(`[WhatsApp] Hostel ${hostelId} connection closed. Code: ${statusCode}, Restart: ${isRestart}, LoggedOut: ${isLoggedOut}`);

        sessions.delete(hostelId);

        // If explicitly disconnected by user, do not attempt to reconnect or restart!
        if (explicitlyDisconnected.has(hostelId)) {
          console.log(`[WhatsApp] Hostel ${hostelId} was explicitly disconnected. Skipping reconnect.`);
          qrCodes.delete(hostelId);
          pairingStates.delete(hostelId);
          return;
        }

        if (isRestart) {
          // Normal WhatsApp protocol pairing restart right after phone scans QR or pair-success
          console.log(`[WhatsApp] 🔄 Post-pairing restart (515) for Hostel ${hostelId}. Reconnecting in 600ms...`);
          qrCodes.delete(hostelId);

          setTimeout(() => {
            if (explicitlyDisconnected.has(hostelId)) return;
            startHostelWhatsApp(hostelId).catch((err) => {
              console.error(`[WhatsApp] Reconnection after 515 failed:`, err);
            });
          }, 600);
        } else if (isLoggedOut || isForbidden) {
          console.log(`[WhatsApp] Hostel ${hostelId} was logged out from device.`);
          qrCodes.delete(hostelId);
          pairingStates.delete(hostelId);
          try {
            fs.rmSync(authPath, { recursive: true, force: true });
          } catch (_) {}

          await Hostel.findByIdAndUpdate(hostelId, {
            whatsappStatus: 'disconnected',
            whatsappPhone: ''
          });
        } else if (isReplaced) {
          console.log(`[WhatsApp] Hostel ${hostelId} connection replaced by another instance.`);
          qrCodes.delete(hostelId);
          pairingStates.delete(hostelId);
        } else {
          // Transient network drop or handshake retry
          console.log(`[WhatsApp] Hostel ${hostelId} socket closed (code: ${statusCode}). Reconnecting in 2s...`);
          setTimeout(async () => {
            if (explicitlyDisconnected.has(hostelId)) return;
            const hCheck = await Hostel.findById(hostelId).select('whatsappStatus whatsappSyncEnabled');
            if (!hCheck || hCheck.whatsappStatus === 'disconnected' || !hCheck.whatsappSyncEnabled) return;

            const hasCreds = fs.existsSync(path.join(authPath, 'creds.json'));
            if (hasCreds && !sessions.has(hostelId)) {
              startHostelWhatsApp(hostelId).catch(console.error);
            }
          }, 2000);
        }
      }
    });

  // Listen for incoming messages and capture guest photos
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    console.log(`[WhatsApp] 📥 messages.upsert received ${messages ? messages.length : 0} message(s), type: ${type}`);
    for (const msg of (messages || [])) {
      await processIncomingMessage(sock, hostelId, msg, hostel);
    }
  });

  // Also listen for recent message history sync on socket reconnection
  sock.ev.on('messaging-history.set', async ({ messages }) => {
    if (messages && messages.length > 0) {
      console.log(`[WhatsApp] 📜 messaging-history.set received ${messages.length} message(s)`);
      const dayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
      for (const msg of messages) {
        if (msg.messageTimestamp && msg.messageTimestamp >= dayAgo) {
          await processIncomingMessage(sock, hostelId, msg, hostel);
        }
      }
    }
  });

  // If QR code is not cached yet, wait up to 8 seconds for the first QR code or open connection
    if (!qrCodes.has(hostelId) && !sock.user) {
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          sock.ev.off('connection.update', checkUpdate);
          resolve();
        }, 8000);

        function checkUpdate(up) {
          if (up.qr || up.connection === 'open') {
            clearTimeout(timer);
            sock.ev.off('connection.update', checkUpdate);
            resolve();
          }
        }

        sock.ev.on('connection.update', checkUpdate);
      });
    }

    return {
      status: sock.user ? 'connected' : (qrCodes.has(hostelId) || pairingStates.get(hostelId) ? 'connecting' : 'disconnected'),
      qr: qrCodes.get(hostelId) || null,
      pairing: !!pairingStates.get(hostelId),
      phone: hostel.whatsappPhone || ''
    };
  })();

  connectingPromises.set(hostelId, connectPromise);
  try {
    const res = await connectPromise;
    return res;
  } finally {
    connectingPromises.delete(hostelId);
  }
};

/**
 * Get current session state and QR code
 */
const getHostelWhatsAppStatus = async (hostelId) => {
  if (!hostelId || !mongoose.Types.ObjectId.isValid(hostelId)) {
    return { status: 'disconnected', whatsappSyncEnabled: false, aiOcrEnabled: false, pairing: false };
  }

  const hostel = await Hostel.findById(hostelId);
  if (!hostel) return { status: 'disconnected', whatsappSyncEnabled: false, aiOcrEnabled: false, pairing: false };

  // If user explicitly disconnected or marked disconnected in database or sync is disabled:
  if (hostel.whatsappStatus === 'disconnected' || explicitlyDisconnected.has(hostelId) || !hostel.whatsappSyncEnabled) {
    return {
      whatsappSyncEnabled: !!hostel.whatsappSyncEnabled,
      aiOcrEnabled: !!hostel.aiOcrEnabled,
      hostelName: hostel.name,
      hostelAddress: hostel.address,
      hostelContact: hostel.contactNumber,
      hostelEmail: hostel.email,
      status: 'disconnected',
      pairing: false,
      phone: '',
      qr: null
    };
  }

  let activeSock = sessions.get(hostelId);
  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  const credsPath = path.join(authPath, 'creds.json');
  let hasCreds = false;
  try {
    hasCreds = fs.existsSync(credsPath) && fs.statSync(credsPath).size > 100;
  } catch (_) {}
  const isPairing = !!pairingStates.get(hostelId);

  // Auto-resume socket if saved credentials exist and in-memory socket is not currently active
  if (!activeSock && hasCreds && hostel.whatsappSyncEnabled && hostel.whatsappStatus === 'connected' && !isPairing) {
    console.log(`[WhatsApp] Auto-resuming saved WhatsApp session for Hostel ${hostelId}...`);
    try {
      startHostelWhatsApp(hostelId).catch((err) => {
        console.warn(`[WhatsApp] Auto-resume warning for Hostel ${hostelId}:`, err.message);
      });
      activeSock = sessions.get(hostelId);
    } catch (err) {
      console.warn(`[WhatsApp] Auto-resume synchronous warning for Hostel ${hostelId}:`, err.message);
    }
  }

  const isConnected = !!(activeSock && (activeSock.user || activeSock.ws?.isOpen));

  let status = 'disconnected';
  if (isConnected) {
    status = 'connected';
  } else if (isPairing || qrCodes.has(hostelId) || (activeSock && !activeSock.ws?.isClosed)) {
    status = 'connecting';
  }

  return {
    whatsappSyncEnabled: !!hostel.whatsappSyncEnabled,
    aiOcrEnabled: !!hostel.aiOcrEnabled,
    hostelName: hostel.name,
    hostelAddress: hostel.address,
    hostelContact: hostel.contactNumber,
    hostelEmail: hostel.email,
    status,
    pairing: isPairing,
    phone: (status === 'connected') ? (hostel.whatsappPhone || (activeSock?.user?.id ? activeSock.user.id.split(':')[0].split('@')[0] : '')) : '',
    qr: (status === 'connected') ? null : (qrCodes.get(hostelId) || null)
  };
};

/**
 * Disconnect and remove WhatsApp session
 */
const disconnectHostelWhatsApp = async (hostelId) => {
  if (!hostelId || !mongoose.Types.ObjectId.isValid(hostelId)) {
    return { status: 'disconnected' };
  }

  // 1. Mark explicitly disconnected so no background reconnection occurs
  explicitlyDisconnected.add(hostelId);
  connectingPromises.delete(hostelId);
  pairingStates.delete(hostelId);
  qrCodes.delete(hostelId);

  // 2. Terminate socket and strip event listeners so saveCreds or reconnect handlers never run
  const sock = sessions.get(hostelId);
  if (sock) {
    try {
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.ev.removeAllListeners('messages.upsert');
    } catch (_) {}

    try {
      // Race logout with 2s timeout so unresponsive WhatsApp Web doesn't hang request
      await Promise.race([
        sock.logout(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 2000))
      ]);
    } catch (_) {}

    try {
      sock.end();
    } catch (_) {}

    sessions.delete(hostelId);
  }
  qrCodes.delete(hostelId);

  // 3. Delete session directory on disk with retry
  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  for (let i = 0; i < 3; i++) {
    try {
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
      break;
    } catch (_) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // 4. Update MongoDB to disconnected
  await Hostel.findByIdAndUpdate(hostelId, {
    whatsappStatus: 'disconnected',
    whatsappPhone: '',
    whatsappLastActive: null
  });

  console.log(`[WhatsApp] 🔌 Hostel ${hostelId} completely disconnected and session wiped.`);
  return { success: true, status: 'disconnected' };
};

/**
 * Request an 8-character pairing code for phone number link
 */
const requestHostelPairingCode = async (hostelId, phoneNumber) => {
  if (!phoneNumber) throw new Error('Phone number is required');
  explicitlyDisconnected.delete(hostelId);
  let cleanPhone = phoneNumber.replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

  // If already connected, return immediately
  let existingSock = sessions.get(hostelId);
  if (existingSock?.user) {
    const phone = existingSock.user.id.split(':')[0].split('@')[0];
    return { alreadyConnected: true, phone };
  }

  // Clear QR and mark pairing in progress
  qrCodes.delete(hostelId);
  pairingStates.set(hostelId, true);

  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  const hasSavedCreds = fs.existsSync(path.join(authPath, 'creds.json'));

  // Only reset unauthenticated socket if no saved credentials exist
  if (existingSock && !existingSock.user && !hasSavedCreds) {
    console.log(`[WhatsApp] Resetting unauthenticated socket for fresh pairing on Hostel ${hostelId}`);
    try { existingSock.end(); } catch (_) {}
    sessions.delete(hostelId);
  }

  // Start or resume socket
  await startHostelWhatsApp(hostelId);
  const sock = sessions.get(hostelId);
  if (!sock) throw new Error('WhatsApp service could not be initialized');

  if (sock.user) {
    const phone = sock.user.id.split(':')[0].split('@')[0];
    return { alreadyConnected: true, phone };
  }

  // If socket is still establishing WS connection, wait up to 4s
  if (!sock.ws?.isOpen) {
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, 4000);
      sock.ev.once('connection.update', (up) => {
        if (up.qr || sock.ws?.isOpen) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }

  try {
    const rawCode = await sock.requestPairingCode(cleanPhone);
    const formattedCode = rawCode ? (rawCode.slice(0, 4) + '-' + rawCode.slice(4)) : rawCode;
    console.log(`[WhatsApp] 🔑 Pairing code generated for Hostel ${hostelId} (${cleanPhone}): ${formattedCode}`);
    return { success: true, pairingCode: formattedCode, rawCode, phone: cleanPhone };
  } catch (err) {
    console.error(`[WhatsApp] Failed to request pairing code for ${cleanPhone}:`, err);
    throw new Error('Could not generate pairing code. Please verify phone number with country code (e.g. 91...)');
  }
};

/**
 * Auto-resume all active WhatsApp sessions on server startup
 */
const initAllSavedWhatsAppSessions = async () => {
  try {
    const activeHostels = await Hostel.find({
      whatsappSyncEnabled: true,
      whatsappStatus: { $ne: 'disconnected' }
    }).select('_id name');

    for (const h of activeHostels) {
      const authPath = path.join(SESSIONS_DIR, `hostel_${h._id}`);
      const credsPath = path.join(authPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const stats = fs.statSync(credsPath);
          if (stats.size > 100) {
            console.log(`[WhatsApp] 🔌 Boot auto-resuming WhatsApp session for ${h.name} (${h._id})...`);
            startHostelWhatsApp(h._id.toString()).catch((err) => {
              console.warn(`[WhatsApp] Failed to boot-resume session for ${h.name}:`, err.message);
            });
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Error in initAllSavedWhatsAppSessions:', err);
  }
};

module.exports = {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp,
  requestHostelPairingCode,
  initAllSavedWhatsAppSessions
};

