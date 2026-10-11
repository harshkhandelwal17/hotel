const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const Hostel = require('../models/Hostel');
const WhatsAppMedia = require('../models/WhatsAppMedia');
const { saveMediaBuffer } = require('../utils/mediaStorage');

// In-memory active sockets and pending QR codes
const sessions = new Map(); // hostelId -> socket
const qrCodes = new Map();  // hostelId -> base64 qr image string

const SESSIONS_DIR = path.join(__dirname, '../../sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

/**
 * Initialize or get WhatsApp session for a specific hostel
 */
const startHostelWhatsApp = async (hostelId) => {
  if (!hostelId) throw new Error('Hostel ID is required');

  // Verify that Super Admin has enabled WhatsApp Sync for this hostel
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) throw new Error('Hostel not found');
  if (!hostel.whatsappSyncEnabled) {
    throw new Error('WhatsApp Live Sync is not enabled for this property. Contact Super Admin.');
  }

  // If already connected, return existing status
  if (sessions.has(hostelId)) {
    const existingSock = sessions.get(hostelId);
    if (existingSock?.user) {
      return { status: 'connected', phone: hostel.whatsappPhone };
    }
  }

  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: false,
    browser: ['Hotel PMS', 'Chrome', '120.0.0']
  });

  sessions.set(hostelId, sock);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        qrCodes.set(hostelId, qrDataUrl);
        await Hostel.findByIdAndUpdate(hostelId, { whatsappStatus: 'connecting' });
      } catch (qrErr) {
        console.error('Failed to generate QR data URL:', qrErr);
      }
    }

    if (connection === 'open') {
      const rawUser = sock.user?.id || '';
      const phone = rawUser.split(':')[0] || rawUser.split('@')[0];
      qrCodes.delete(hostelId);

      await Hostel.findByIdAndUpdate(hostelId, {
        whatsappStatus: 'connected',
        whatsappPhone: phone,
        whatsappLastActive: new Date()
      });

      console.log(`[WhatsApp] Hostel ${hostelId} successfully connected as ${phone}`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`[WhatsApp] Hostel ${hostelId} connection closed. Code: ${statusCode}, ShouldReconnect: ${shouldReconnect}`);

      if (!shouldReconnect) {
        // Logged out
        sessions.delete(hostelId);
        qrCodes.delete(hostelId);
        try {
          fs.rmSync(authPath, { recursive: true, force: true });
        } catch (_) {}

        await Hostel.findByIdAndUpdate(hostelId, {
          whatsappStatus: 'disconnected',
          whatsappPhone: ''
        });
      } else {
        // Reconnect after brief pause
        setTimeout(() => {
          startHostelWhatsApp(hostelId).catch(console.error);
        }, 5000);
      }
    }
  });

  // Listen for incoming messages and capture guest photos
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const messageContent = msg.message;
      const isImage = !!messageContent.imageMessage;

      if (isImage) {
        try {
          const rawSender = msg.key.remoteJid || '';
          const senderPhone = rawSender.split('@')[0];
          const senderName = msg.pushName || '';

          console.log(`[WhatsApp] Received guest ID image from ${senderPhone} for hostel ${hostelId}`);

          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            {
              logger: pino({ level: 'silent' }),
              reuploadRequest: sock.updateMediaMessage
            }
          );

          if (buffer) {
            const mimeType = messageContent.imageMessage.mimetype || 'image/jpeg';
            const uploadedUrl = await saveMediaBuffer(buffer, mimeType);

            await WhatsAppMedia.create({
              hostel: hostelId,
              senderPhone,
              senderName,
              imageUrl: uploadedUrl,
              status: 'new'
            });

            console.log(`[WhatsApp] Saved guest ID image to ${uploadedUrl}`);
          }
        } catch (mediaErr) {
          console.error('[WhatsApp] Failed to process incoming guest image:', mediaErr);
        }
      }
    }
  });

  return { status: 'connecting', qr: qrCodes.get(hostelId) || null };
};

/**
 * Get current session state and QR code
 */
const getHostelWhatsAppStatus = async (hostelId) => {
  const hostel = await Hostel.findById(hostelId);
  if (!hostel) return { status: 'disconnected', whatsappSyncEnabled: false };

  const activeSock = sessions.get(hostelId);
  const isConnected = !!(activeSock && activeSock.user);

  return {
    whatsappSyncEnabled: !!hostel.whatsappSyncEnabled,
    status: isConnected ? 'connected' : (hostel.whatsappStatus || 'disconnected'),
    phone: hostel.whatsappPhone || '',
    qr: qrCodes.get(hostelId) || null
  };
};

/**
 * Disconnect and remove WhatsApp session
 */
const disconnectHostelWhatsApp = async (hostelId) => {
  const sock = sessions.get(hostelId);
  if (sock) {
    try {
      await sock.logout();
    } catch (_) {
      try { sock.end(); } catch (__) {}
    }
    sessions.delete(hostelId);
  }
  qrCodes.delete(hostelId);

  const authPath = path.join(SESSIONS_DIR, `hostel_${hostelId}`);
  try {
    fs.rmSync(authPath, { recursive: true, force: true });
  } catch (_) {}

  await Hostel.findByIdAndUpdate(hostelId, {
    whatsappStatus: 'disconnected',
    whatsappPhone: ''
  });

  return { success: true, status: 'disconnected' };
};

module.exports = {
  startHostelWhatsApp,
  getHostelWhatsAppStatus,
  disconnectHostelWhatsApp
};
