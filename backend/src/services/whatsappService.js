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
const { maintainHostelMediaBuffer } = require('./mediaCleanupService');

// In-memory active sockets, pending QR codes, connecting locks, pairing state, and explicit disconnects
const sessions = new Map();           // hostelId -> socket
const qrCodes = new Map();            // hostelId -> base64 qr image string
const connectingPromises = new Map(); // hostelId -> Promise<result>
const pairingStates = new Map();      // hostelId -> boolean (true when QR scanned and authenticating)
const connectionLocks = new Map();    // hostelId -> { inFlight: boolean, startedAt: number }
const connectionStates = new Map();   // hostelId -> 'connecting' | 'connected' | 'restarting_515' | 'disconnected'
const explicitlyDisconnected = new Set(); // hostelId -> explicitly disconnected flag

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Checks whether a Baileys socket is genuinely connected or in active startup
 */
const isSocketAlive = (sock) => {
  if (!sock) return false;
  // During startup window (45s), socket is in handshake-in-progress, NOT dead
  if (sock._createdAt && (Date.now() - sock._createdAt < 45000)) {
    return true;
  }
  if (!sock.user) return false;
  try {
    const ws = sock.ws;
    if (!ws) return false;
    // WebSocket readyState: 0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED
    return ws.isOpen === true || ws.readyState === 1 || ws.readyState === 0;
  } catch (_) {
    return false;
  }
};

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
const startHostelWhatsApp = async (hostelId, options = {}) => {
  if (!hostelId || !mongoose.Types.ObjectId.isValid(hostelId)) {
    throw new Error('Valid Hostel ID is required');
  }

  const isPairingRequest = Boolean(options.isPairingRequest);

  // Deduplicate concurrent connection requests
  if (connectingPromises.has(hostelId)) {
    console.log(`[WhatsApp] Awaiting in-flight connection for Hostel ${hostelId}...`);
    return connectingPromises.get(hostelId);
  }

  // Connection lock: prevent multiple concurrent socket creations for same hotel
  const existingLock = connectionLocks.get(hostelId);
  if (existingLock && (Date.now() - existingLock.startedAt < 25000)) {
    console.log(`[WhatsApp] Socket connection lock active for Hostel ${hostelId}, reusing in-flight handshake...`);
    const s = sessions.get(hostelId);
    return {
      status: s?.user && isSocketAlive(s) ? 'connected' : 'connecting',
      phone: s?.user ? s.user.id.split(':')[0].split('@')[0] : '',
      qr: qrCodes.get(hostelId) || null,
      pairing: !!pairingStates.get(hostelId)
    };
  }
  connectionLocks.set(hostelId, { inFlight: true, startedAt: Date.now() });

  explicitlyDisconnected.delete(hostelId);

  const connectPromise = (async () => {
    try {
      // Ensure WhatsApp Sync is enabled for this property
      const hostel = await Hostel.findById(hostelId);
      if (!hostel) throw new Error('Hostel not found');
      if (!hostel.whatsappSyncEnabled) {
        hostel.whatsappSyncEnabled = true;
        await hostel.save({ validateBeforeSave: false }).catch(() => {});
        console.log(`[WhatsApp] Auto-enabled whatsappSyncEnabled for Hostel ${hostelId}`);
      }

      // If already connected, return existing active status
      if (sessions.has(hostelId)) {
        const existingSock = sessions.get(hostelId);
        if (existingSock?.user && isSocketAlive(existingSock)) {
          return {
            status: 'connected',
            phone: hostel.whatsappPhone || existingSock.user.id.split(':')[0].split('@')[0],
            qr: null,
            pairing: false
          };
        }
        // If socket was created within last 45s, it is actively handshaking - return connecting
        if (existingSock?._createdAt && (Date.now() - existingSock._createdAt < 45000)) {
          return {
            status: 'connecting',
            phone: hostel.whatsappPhone || '',
            qr: qrCodes.get(hostelId) || null,
            pairing: !!pairingStates.get(hostelId)
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
      
      // Guard against corrupted or 0-byte creds.json
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
          } else {
            const raw = fs.readFileSync(credsPath, 'utf8');
            JSON.parse(raw);
          }
        } catch (_) {
          console.warn(`[WhatsApp] Corrupted creds.json found for Hostel ${hostelId}. Purging session directory...`);
          try { fs.rmSync(authPath, { recursive: true, force: true }); } catch (_) {}
        }
      }

      const { state, saveCreds } = await useMultiFileAuthState(authPath);
      let version = [2, 3000, 1049994111];
      try {
        const waVersion = await Promise.race([
          fetchLatestWaWebVersion(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        if (waVersion?.version) {
          version = waVersion.version;
          console.log(`[WhatsApp] Using latest WhatsApp Web version: ${version.join('.')}`);
        }
      } catch (_) {
        console.log(`[WhatsApp] Using stable WhatsApp Web version: ${version.join('.')}`);
      }
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

      sock._createdAt = Date.now();
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

        if (qr && !isPairingRequest) {
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
          connectionStates.set(hostelId, 'connected');
          connectionLocks.delete(hostelId);

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

          // If explicitly disconnected by user, do not attempt to reconnect or restart!
          if (explicitlyDisconnected.has(hostelId)) {
            console.log(`[WhatsApp] Hostel ${hostelId} was explicitly disconnected. Skipping reconnect.`);
            sessions.delete(hostelId);
            qrCodes.delete(hostelId);
            pairingStates.delete(hostelId);
            connectionLocks.delete(hostelId);
            connectionStates.set(hostelId, 'disconnected');
            return;
          }

          if (isRestart) {
            // Normal WhatsApp protocol pairing restart right after phone scans QR or pair-success
            console.log(`[WhatsApp] 🔄 Post-pairing restart (515) for Hostel ${hostelId}. Reconnecting safely in 1.2s...`);
            qrCodes.delete(hostelId);
            pairingStates.set(hostelId, true);
            connectionStates.set(hostelId, 'restarting_515');

            // Strip old socket listeners to prevent duplicate event handling
            try {
              sock.ev.removeAllListeners('connection.update');
              sock.ev.removeAllListeners('creds.update');
              sock.ev.removeAllListeners('messages.upsert');
              sock.end();
            } catch (_) {}
            sessions.delete(hostelId);

            setTimeout(async () => {
              if (explicitlyDisconnected.has(hostelId)) return;
              try {
                connectionLocks.delete(hostelId);
                await startHostelWhatsApp(hostelId);
              } catch (err) {
                console.error(`[WhatsApp] Reconnection after 515 failed:`, err.message);
              } finally {
                connectionStates.delete(hostelId);
              }
            }, 1200);
            return;
          }

          sessions.delete(hostelId);
          connectionLocks.delete(hostelId);

          if (isLoggedOut || isForbidden) {
            console.log(`[WhatsApp] 🚨 Hostel ${hostelId} was logged out from companion device.`);
            qrCodes.delete(hostelId);
            pairingStates.delete(hostelId);
            connectionStates.set(hostelId, 'disconnected');
            try {
              fs.rmSync(authPath, { recursive: true, force: true });
            } catch (_) {}

            await Hostel.findByIdAndUpdate(hostelId, {
              whatsappStatus: 'disconnected',
              whatsappPhone: ''
            }).catch(() => {});
          } else if (isReplaced) {
            console.log(`[WhatsApp] Hostel ${hostelId} connection replaced by another instance.`);
            qrCodes.delete(hostelId);
            pairingStates.delete(hostelId);
          } else {
            // Transient network drop or handshake retry: ALWAYS attempt auto-reconnect
            console.log(`[WhatsApp] Hostel ${hostelId} socket closed (code: ${statusCode}). Auto-reconnecting in 2.5s...`);
            setTimeout(async () => {
              if (explicitlyDisconnected.has(hostelId)) return;
              const hasCreds = fs.existsSync(path.join(authPath, 'creds.json'));
              if (hasCreds && !sessions.has(hostelId)) {
                startHostelWhatsApp(hostelId).catch((err) => {
                  console.warn(`[WhatsApp] Reconnection retry warning:`, err.message);
                });
              }
            }, 2500);
          }
        }
      });

      // Listen for incoming messages and capture guest photos
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        console.log(`[WhatsApp] 📥 messages.upsert received ${messages ? messages.length : 0} message(s), type: ${type}`);
        for (const msg of (messages || [])) {
          await processIncomingMessage(sock, hostelId, msg, hostel).catch(() => {});
        }
      });

      // Listen for recent message history sync on socket reconnection (only recent 2 hours, max 15 items)
      sock.ev.on('messaging-history.set', async ({ messages }) => {
        if (messages && messages.length > 0) {
          console.log(`[WhatsApp] 📜 messaging-history.set received ${messages.length} message(s)`);
          const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
          const recentMediaMsgs = (messages || [])
            .filter(m => m.messageTimestamp && m.messageTimestamp >= twoHoursAgo)
            .slice(-15);
          for (const msg of recentMediaMsgs) {
            await processIncomingMessage(sock, hostelId, msg, hostel).catch(() => {});
          }
        }
      });

      // If QR code is not cached yet, wait up to 8 seconds ONLY IF NOT pairing-code request
      if (!isPairingRequest && !qrCodes.has(hostelId) && !sock.user) {
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
    } finally {
      connectingPromises.delete(hostelId);
      connectionLocks.delete(hostelId);
    }
  })();

  connectingPromises.set(hostelId, connectPromise);
  return connectPromise;
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
      digitalAadhaarEnabled: !!hostel.digitalAadhaarEnabled,
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

  // If currently in post-515 restart or active pairing handshake, return connecting safely
  if (connectionStates.get(hostelId) === 'restarting_515' || pairingStates.get(hostelId)) {
    return {
      whatsappSyncEnabled: !!hostel.whatsappSyncEnabled,
      aiOcrEnabled: !!hostel.aiOcrEnabled,
      digitalAadhaarEnabled: !!hostel.digitalAadhaarEnabled,
      hostelName: hostel.name,
      hostelAddress: hostel.address,
      hostelContact: hostel.contactNumber,
      hostelEmail: hostel.email,
      status: 'connecting',
      pairing: true,
      phone: hostel.whatsappPhone || '',
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

  // Auto-resume socket if saved credentials exist, in-memory socket is not active, and no lock
  if (!activeSock && hasCreds && hostel.whatsappSyncEnabled && !explicitlyDisconnected.has(hostelId) && !connectionLocks.has(hostelId)) {
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

  // ACCURATE LIVE CHECK: Socket must exist, user identity must exist, and WebSocket must be OPEN
  const isConnected = isSocketAlive(activeSock);

  // If socket is in sessions map but is DEAD/ZOMBIE (websocket closed and NOT newly created within 45s):
  if (activeSock && !isConnected && activeSock.user && (!activeSock._createdAt || Date.now() - activeSock._createdAt > 45000)) {
    console.warn(`[WhatsApp] Dead/Zombie socket detected for Hostel ${hostelId}. Cycling connection...`);
    try { activeSock.end(); } catch (_) {}
    sessions.delete(hostelId);
    if (hasCreds && !explicitlyDisconnected.has(hostelId)) {
      startHostelWhatsApp(hostelId).catch(() => {});
    }
  }

  let status = 'disconnected';
  if (isConnected) {
    status = 'connected';
  } else if (isPairing || qrCodes.has(hostelId) || connectingPromises.has(hostelId)) {
    status = 'connecting';
  }

  return {
    whatsappSyncEnabled: !!hostel.whatsappSyncEnabled,
    aiOcrEnabled: !!hostel.aiOcrEnabled,
    digitalAadhaarEnabled: !!hostel.digitalAadhaarEnabled,
    hostelName: hostel.name,
    hostelAddress: hostel.address,
    hostelContact: hostel.contactNumber,
    hostelEmail: hostel.email,
    status,
    pairing: isPairing,
    phone: (status === 'connected') ? (hostel.whatsappPhone || (activeSock?.user?.id ? activeSock.user.id.split(':')[0].split('@')[0] : '')) : '',
    qr: (status === 'connected' || isPairing) ? null : (qrCodes.get(hostelId) || null)
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
  connectionLocks.delete(hostelId);
  connectionStates.set(hostelId, 'disconnected');
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

  // 5. Clean up unused/unattached incoming photos so disconnected WhatsApp leaves no ghost media
  try {
    const { cleanupUnusedMedia } = require('./mediaCleanupService');
    await cleanupUnusedMedia({ olderThanHours: 0, forceAllUnused: true, hostelId }).catch(() => {});
  } catch (_) {}

  console.log(`[WhatsApp] 🔌 Hostel ${hostelId} completely disconnected and session wiped.`);
  return { success: true, status: 'disconnected' };
};

/**
 * Request an 8-character pairing code for phone number link
 */
const requestHostelPairingCode = async (hostelId, phoneNumber) => {
  if (!phoneNumber) throw new Error('Phone number is required');
  explicitlyDisconnected.delete(hostelId);
  const hCheck = await Hostel.findById(hostelId);
  if (hCheck && !hCheck.whatsappSyncEnabled) {
    hCheck.whatsappSyncEnabled = true;
    await hCheck.save({ validateBeforeSave: false }).catch(() => {});
  }
  let cleanPhone = phoneNumber.replace(/\D/g, '');
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone;
  }

  // If already connected, return immediately
  let existingSock = sessions.get(hostelId);
  if (existingSock?.user && isSocketAlive(existingSock)) {
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

  // Start or resume socket in pairing mode (skips waiting for QR)
  await startHostelWhatsApp(hostelId, { isPairingRequest: true });
  const sock = sessions.get(hostelId);
  if (!sock) throw new Error('WhatsApp service could not be initialized');

  if (sock.user) {
    const phone = sock.user.id.split(':')[0].split('@')[0];
    return { alreadyConnected: true, phone };
  }

  // Wait briefly for WebSocket connection to open or start handshake (max 4s)
  for (let i = 0; i < 20; i++) {
    if (sock.ws?.isOpen || sock.ws?.readyState === 1 || sock.ws?.readyState === 0) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  try {
    const rawCode = await sock.requestPairingCode(cleanPhone);
    const formattedCode = rawCode ? (rawCode.slice(0, 4) + '-' + rawCode.slice(4)) : rawCode;
    console.log(`[WhatsApp] 🔑 Pairing code generated for Hostel ${hostelId} (${cleanPhone}): ${formattedCode}`);
    return { success: true, pairingCode: formattedCode, rawCode, phone: cleanPhone };
  } catch (err) {
    console.error(`[WhatsApp] Failed to request pairing code for ${cleanPhone}:`, err);
    throw new Error('Could not generate pairing code. Please verify phone number (e.g. 9876543210).');
  }
};

/**
 * Active Background Health Watchdog:
 * Runs periodically to verify Baileys WebSocket sockets are genuinely alive.
 * Reconnects dropped sockets and detects device logouts.
 */
let watchdogHandle = null;

const checkSocketHealthAndHeartbeat = async (hostelId) => {
  if (explicitlyDisconnected.has(hostelId)) return;

  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  const credsPath = path.join(authPath, 'creds.json');
  let hasCreds = false;
  try {
    hasCreds = fs.existsSync(credsPath) && fs.statSync(credsPath).size > 50;
  } catch (_) {}

  const sock = sessions.get(hostelId);

  // If credentials exist but no active socket in memory: auto-resume
  if (!sock) {
    if (hasCreds) {
      console.log(`[WhatsApp Watchdog] 🔄 Auto-reconnecting saved session for Hostel ${hostelId}...`);
      startHostelWhatsApp(hostelId).catch((err) => {
        console.warn(`[WhatsApp Watchdog] Auto-resume warning for Hostel ${hostelId}:`, err.message);
      });
    }
    return;
  }

  // If socket is in memory, check if genuinely alive
  const alive = isSocketAlive(sock);
  if (!alive) {
    console.warn(`[WhatsApp Watchdog] ⚠️ Dead/stale socket found for Hostel ${hostelId}. Cycling connection...`);
    try { sock.end(); } catch (_) {}
    sessions.delete(hostelId);
    if (hasCreds) {
      startHostelWhatsApp(hostelId).catch((err) => {
        console.warn(`[WhatsApp Watchdog] Reconnection warning for Hostel ${hostelId}:`, err.message);
      });
    }
    return;
  }

  // Active presence ping to verify connection isn't in a zombie state
  try {
    if (sock.sendPresenceUpdate) {
      await sock.sendPresenceUpdate('available');
    }
  } catch (pingErr) {
    const msg = (pingErr.message || '').toLowerCase();
    if (msg.includes('logged out') || msg.includes('401') || msg.includes('forbidden') || msg.includes('403')) {
      console.log(`[WhatsApp Watchdog] 🚨 Session revoked on companion phone for Hostel ${hostelId}. Purging credentials.`);
      sessions.delete(hostelId);
      qrCodes.delete(hostelId);
      pairingStates.delete(hostelId);
      try { fs.rmSync(authPath, { recursive: true, force: true }); } catch (_) {}
      await Hostel.findByIdAndUpdate(hostelId, {
        whatsappStatus: 'disconnected',
        whatsappPhone: ''
      }).catch(() => {});
    }
  }
};

const startWhatsAppWatchdog = () => {
  if (watchdogHandle) return;
  // Repeat every 25 seconds
  watchdogHandle = setInterval(async () => {
    try {
      const activeHostels = await Hostel.find({ whatsappSyncEnabled: true }).select('_id');
      for (const h of activeHostels) {
        await checkSocketHealthAndHeartbeat(h._id.toString()).catch(() => {});
      }
    } catch (_) {}
  }, 25000);
};

/**
 * Auto-resume all active WhatsApp sessions on server startup
 */
const initAllSavedWhatsAppSessions = async () => {
  try {
    const activeHostels = await Hostel.find({
      whatsappSyncEnabled: true
    }).select('_id name');

    for (const h of activeHostels) {
      const authPath = path.join(SESSIONS_DIR, `hostel_${h._id}`);
      const credsPath = path.join(authPath, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const stats = fs.statSync(credsPath);
          if (stats.size > 50) {
            console.log(`[WhatsApp] 🔌 Boot auto-resuming WhatsApp session for ${h.name} (${h._id})...`);
            startHostelWhatsApp(h._id.toString()).catch((err) => {
              console.warn(`[WhatsApp] Failed to boot-resume session for ${h.name}:`, err.message);
            });
          }
        } catch (_) {}
      }
    }

    // Launch active health watchdog
    startWhatsAppWatchdog();
  } catch (err) {
    console.error('[WhatsApp] Error in initAllSavedWhatsAppSessions:', err);
  }
};

module.exports = {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp,
  requestHostelPairingCode,
  initAllSavedWhatsAppSessions,
  isSocketAlive
};

