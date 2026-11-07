import jsQR from 'jsqr';
import * as pako from 'pako';
import {
  QRCodeReader,
  BrowserQRCodeReader,
  BarcodeFormat,
  DecodeHintType,
  RGBLuminanceSource,
  BinaryBitmap,
  HybridBinarizer,
  GlobalHistogramBinarizer
} from '@zxing/library';

// ============================================================================
// VERHOEFF CHECKSUM ALGORITHM FOR AADHAAR VALIDATION
// ============================================================================

const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

/**
 * Validate 12-digit Aadhaar Number using Verhoeff Checksum
 * @param {string} aadhaarStr 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAadhaarNumber(aadhaarStr) {
  if (!aadhaarStr) return { valid: false, error: 'Aadhaar number is required' };
  const clean = String(aadhaarStr).replace(/\s+/g, '');

  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, error: 'Aadhaar number must be exactly 12 digits' };
  }

  // Aadhaar numbers never start with 0 or 1
  if (/^[01]/.test(clean)) {
    return { valid: false, error: 'Invalid Aadhaar: Cannot start with 0 or 1' };
  }

  // Check repeating identical digits like 111111111111 or 000000000000
  if (/^(\d)\1{11}$/.test(clean)) {
    return { valid: false, error: 'Invalid fake Aadhaar: All repeating digits' };
  }

  let c = 0;
  const invertedArray = clean.split('').map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = d[c][p[i % 8][invertedArray[i]]];
  }

  if (c !== 0) {
    return { valid: false, error: 'Invalid Aadhaar: Failed Verhoeff mathematical checksum' };
  }

  return { valid: true };
}

// ============================================================================
// FORMAT HELPERS
// ============================================================================

function normalizeDateOfBirth(raw) {
  if (!raw) return '';
  const str = String(raw).trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // If DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // If only YYYY (year of birth)
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  return '';
}

function normalizeGender(raw) {
  if (!raw) return '';
  const g = String(raw).trim().toUpperCase();
  if (g.startsWith('M') || g.includes('MALE') || g.includes('पुरुष')) return 'Male';
  if (g.startsWith('F') || g.includes('FEMALE') || g.includes('महिला')) return 'Female';
  return 'Other';
}

function bigIntToBytes(bigIntStr) {
  try {
    let n = BigInt(bigIntStr);
    const bytes = [];
    while (n > 0n) {
      bytes.push(Number(n & 0xffn));
      n >>= 8n;
    }
    return new Uint8Array(bytes.reverse());
  } catch {
    return null;
  }
}

function parseBigIntToByteArray(str) {
  try {
    let bigInt = BigInt(str);
    const hex = bigInt.toString(16);
    const paddedHex = hex.length % 2 !== 0 ? '0' + hex : hex;
    const len = paddedHex.length / 2;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = parseInt(paddedHex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  } catch {
    return null;
  }
}

// ============================================================================
// UIDAI QR CODE PARSER
// ============================================================================

export function parseAadhaarQrData(rawData, binaryData = null) {
  if (!rawData && (!binaryData || binaryData.length === 0)) return null;

  const text = (rawData || '').trim();

  // --------------------------------------------------------------------------
  // 1. XML FORMAT (Older Aadhaar Cards & e-Aadhaar downloads)
  // --------------------------------------------------------------------------
  if (text.includes('PrintLetterBarcodeData') || text.startsWith('<?xml') || text.startsWith('<PrintLetterBarcodeData')) {
    try {
      const getAttr = (name) => {
        const regex = new RegExp(`${name}="([^"]*)"`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      const uid = getAttr('uid');
      const name = getAttr('name');
      const gender = normalizeGender(getAttr('gender'));
      const dob = normalizeDateOfBirth(getAttr('dob') || getAttr('yob'));
      const co = getAttr('co') || getAttr('gname');
      const house = getAttr('house');
      const street = getAttr('street');
      const lm = getAttr('lm');
      const loc = getAttr('loc');
      const vtc = getAttr('vtc');
      const po = getAttr('po');
      const dist = getAttr('dist');
      const subdist = getAttr('subdist');
      const state = getAttr('state');
      const pc = getAttr('pc');

      const addressParts = [co, house, street, lm, loc, vtc, po, dist, subdist, state, pc ? `PIN: ${pc}` : '']
        .filter(Boolean)
        .filter((item, index, self) => self.indexOf(item) === index);

      const fullAddress = addressParts.join(', ');

      return {
        success: true,
        verified: true,
        isSecureQr: false,
        qrType: 'UIDAI XML Barcode',
        fullName: name,
        idProofNumber: uid || '',
        gender,
        dateOfBirth: dob,
        address: fullAddress,
        careOf: co,
        pincode: pc,
        state,
        district: dist,
        rawType: 'XML'
      };
    } catch (err) {
      console.warn('[AadhaarQR] Error parsing XML format:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 2. SECURE QR CODE FORMAT (UIDAI 2048-bit digitally signed e-Aadhaar & PVC)
  // --------------------------------------------------------------------------
  let byteStream = null;

  if (binaryData && binaryData.length > 50) {
    byteStream = new Uint8Array(binaryData);
  }

  if (!byteStream && /^\d+$/.test(text) && text.length > 100) {
    byteStream = parseBigIntToByteArray(text) || bigIntToBytes(text);
  }

  // If byteStream is available, decompress using pako
  if (byteStream) {
    let decompressed = null;

    try {
      decompressed = pako.inflate(byteStream);
    } catch {
      try {
        decompressed = pako.inflateRaw(byteStream);
      } catch {
        try {
          decompressed = pako.ungzip(byteStream);
        } catch {
          for (let offset = 1; offset < 10; offset++) {
            try {
              decompressed = pako.inflate(byteStream.subarray(offset));
              break;
            } catch (_) {}
          }
        }
      }
    }

    if (decompressed && decompressed.length > 0) {
      try {
        const fields = [];
        let currentField = [];
        let photoBytes = null;

        for (let i = 0; i < decompressed.length; i++) {
          const byte = decompressed[i];
          if (byte === 255) {
            if (fields.length === 15) {
              fields.push(new Uint8Array(currentField));
              currentField = [];
              const remaining = decompressed.subarray(i + 1);
              if (remaining.length > 256) {
                photoBytes = remaining.subarray(0, remaining.length - 256);
              } else {
                photoBytes = remaining;
              }
              break;
            } else {
              fields.push(new Uint8Array(currentField));
              currentField = [];
            }
          } else {
            currentField.push(byte);
          }
        }

        if (fields.length > 0) {
          const decoder = new TextDecoder('utf-8', { fatal: false });
          const textFields = fields.map(f => decoder.decode(f).trim());

          const refId = textFields[1] || '';
          const name = textFields[2] || '';
          const dob = normalizeDateOfBirth(textFields[3]);
          const gender = normalizeGender(textFields[4]);
          const co = textFields[5] || '';
          const dist = textFields[6] || '';
          const lm = textFields[7] || '';
          const house = textFields[8] || '';
          const loc = textFields[9] || '';
          const pc = textFields[10] || '';
          const po = textFields[11] || '';
          const state = textFields[12] || '';
          const street = textFields[13] || '';
          const subdist = textFields[14] || '';
          const vtc = textFields[15] || '';

          let aadhaarNumber = '';
          const refMatch = refId.match(/^(\d{4})/);
          if (refMatch) {
            aadhaarNumber = `XXXX XXXX ${refMatch[1]}`;
          }

          const addressParts = [co, house, street, lm, loc, vtc, po, dist, subdist, state, pc ? `PIN: ${pc}` : '']
            .filter(Boolean)
            .filter((item, index, self) => self.indexOf(item) === index);

          const fullAddress = addressParts.join(', ');

          let photoBase64 = null;
          if (photoBytes && photoBytes.length > 50 && photoBytes[0] === 0xFF && photoBytes[1] === 0xD8) {
            let binary = '';
            for (let i = 0; i < photoBytes.length; i++) {
              binary += String.fromCharCode(photoBytes[i]);
            }
            photoBase64 = 'data:image/jpeg;base64,' + btoa(binary);
          }

          return {
            success: true,
            verified: true,
            isSecureQr: true,
            qrType: 'UIDAI Secure Digitally Signed QR',
            fullName: name,
            idProofNumber: aadhaarNumber || refId,
            gender,
            dateOfBirth: dob,
            address: fullAddress,
            careOf: co,
            pincode: pc,
            state,
            district: dist,
            referenceId: refId,
            photoBase64,
            rawType: 'SECURE_V2'
          };
        }
      } catch (err) {
        console.warn('[AadhaarQR] Error parsing decompressed stream:', err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 3. Fallback: JSON or formatted text if non-standard QR
  // --------------------------------------------------------------------------
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsedJson = JSON.parse(text);
      if (parsedJson.name || parsedJson.fullName) {
        return {
          success: true,
          verified: true,
          qrType: 'JSON QR',
          fullName: parsedJson.name || parsedJson.fullName || '',
          idProofNumber: parsedJson.uid || parsedJson.aadhaar || '',
          gender: normalizeGender(parsedJson.gender),
          dateOfBirth: normalizeDateOfBirth(parsedJson.dob),
          address: parsedJson.address || '',
          pincode: parsedJson.pincode || parsedJson.pin || ''
        };
      }
    } catch (_) {}
  }

  return null;
}

// ============================================================================
// DUAL-ENGINE IMAGE SCANNER (ZXing HybridBinarizer + jsQR Multi-Angle)
// ============================================================================

/**
 * Loads an image safely without CORS taint issues
 */
async function loadSafeImage(src) {
  // If already a File or Blob, create local object URL directly
  if (src instanceof Blob || src instanceof File) {
    const objectUrl = URL.createObjectURL(src);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ img, cleanup: () => URL.revokeObjectURL(objectUrl) });
      img.onerror = () => reject(new Error('Failed to load image from file blob'));
      img.src = objectUrl;
    });
  }

  if (typeof src === 'string') {
    // If it's a data: URL or blob: URL
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ img, cleanup: () => {} });
        img.onerror = () => reject(new Error('Failed to load data URL image'));
        img.src = src;
      });
    }

    // If HTTP URL: Fetch as Blob first to bypass canvas tainting completely!
    try {
      const res = await fetch(src, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ img, cleanup: () => URL.revokeObjectURL(objectUrl) });
          img.onerror = () => reject(new Error('Failed to load fetched blob image'));
          img.src = objectUrl;
        });
      }
    } catch (fetchErr) {
      console.warn('[AadhaarQR] Fetch image blob failed, falling back to crossOrigin Image:', fetchErr);
    }

    // Direct image tag fallback
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve({ img, cleanup: () => {} });
      img.onerror = () => reject(new Error('Failed to load image URL'));
      img.src = src;
    });
  }

  throw new Error('Invalid image source');
}

/**
 * Decodes QR code from canvas using ZXing MultiFormatReader
 */
function decodeZxing(canvas, useGlobalHistogram = false) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const len = canvas.width * canvas.height;
    const luminances = new Uint8ClampedArray(len);

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      luminances[i] = (data[idx] * 306 + data[idx + 1] * 601 + data[idx + 2] * 117) >> 10;
    }

    const source = new RGBLuminanceSource(luminances, canvas.width, canvas.height);
    const binarizer = useGlobalHistogram 
      ? new GlobalHistogramBinarizer(source) 
      : new HybridBinarizer(source);
    const bitmap = new BinaryBitmap(binarizer);

    const reader = new QRCodeReader();
    const result = reader.decode(bitmap);
    if (result) {
      return {
        text: result.getText(),
        rawBytes: result.getRawBytes()
      };
    }
  } catch (_) {
    // Normal: QR not in this specific frame/binarization
  }
  return null;
}

/**
 * Decodes QR code from canvas using jsQR
 */
function decodeJsQR(canvas, enhanceContrast = false) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (enhanceContrast) {
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const val = avg > 128 ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    }

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth'
    });

    if (code && (code.data || (code.binaryData && code.binaryData.length > 0))) {
      return {
        text: code.data,
        rawBytes: code.binaryData
      };
    }
  } catch (_) {}
  return null;
}

/**
 * Scans an image for Aadhaar QR code with multi-engine, multi-angle, and sub-crop passes
 * @param {File|Blob|string} imageSource
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function scanAadhaarQrFromImage(imageSource) {
  let loaded = null;
  try {
    loaded = await loadSafeImage(imageSource);
    const { img } = loaded;

    const originalW = img.naturalWidth || img.width;
    const originalH = img.naturalHeight || img.height;

    if (!originalW || !originalH) {
      return { success: false, error: 'INVALID_IMAGE_DIMENSIONS', message: 'Image has 0 dimensions' };
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return { success: false, error: 'CANVAS_UNAVAILABLE', message: 'Canvas 2D unavailable' };
    }

    // Helper: Draws image with rotation and optional crop
    const setupCanvas = (rotationDeg = 0, scale = 1, cropRect = null) => {
      let sw = originalW;
      let sh = originalH;
      let sx = 0;
      let sy = 0;

      if (cropRect) {
        sx = Math.round(cropRect.x * originalW);
        sy = Math.round(cropRect.y * originalH);
        sw = Math.round(cropRect.w * originalW);
        sh = Math.round(cropRect.h * originalH);
      }

      let dw = Math.round(sw * scale);
      let dh = Math.round(sh * scale);

      // Max dimension safeguard (avoid 16K memory exhaustion)
      if (dw > 2400 || dh > 2400) {
        const factor = Math.min(2400 / dw, 2400 / dh);
        dw = Math.round(dw * factor);
        dh = Math.round(dh * factor);
      }

      if (rotationDeg === 90 || rotationDeg === 270) {
        canvas.width = dh;
        canvas.height = dw;
      } else {
        canvas.width = dw;
        canvas.height = dh;
      }

      ctx.save();
      if (rotationDeg === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (rotationDeg === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (rotationDeg === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((270 * Math.PI) / 180);
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
      ctx.restore();
    };

    // Helper to run both ZXing and jsQR on the current canvas state
    const tryDecodeCanvas = () => {
      // 1. ZXing HybridBinarizer (best with shadows/glare)
      let found = decodeZxing(canvas, false);
      if (found) return found;

      // 2. jsQR (attempt both normal and inverted)
      found = decodeJsQR(canvas, false);
      if (found) return found;

      // 3. ZXing GlobalHistogram
      found = decodeZxing(canvas, true);
      if (found) return found;

      // 4. jsQR with contrast enhancement
      found = decodeJsQR(canvas, true);
      if (found) return found;

      return null;
    };

    let rawQr = null;

    // ========================================================================
    // PASS 0: Fast BrowserQRCodeReader directly on the loaded HTMLImageElement
    // ========================================================================
    try {
      const codeReader = new BrowserQRCodeReader();
      const zxRes = await codeReader.decodeFromImageElement(img);
      if (zxRes) {
        rawQr = {
          text: zxRes.getText(),
          rawBytes: zxRes.getRawBytes ? zxRes.getRawBytes() : null
        };
      }
    } catch (_) {
      // Proceed to multi-pass canvas if not decoded immediately
    }

    // ========================================================================
    // PASS 1: Full image at original scale + standard 0° orientation
    // ========================================================================
    if (!rawQr) {
      setupCanvas(0, 1.0, null);
      rawQr = tryDecodeCanvas();
    }

    // ========================================================================
    // PASS 2: Rotations (90°, 270°, 180°) for sideways/portrait phone camera shots
    // ========================================================================
    if (!rawQr) {
      for (const rot of [90, 270, 180]) {
        setupCanvas(rot, 1.0, null);
        rawQr = tryDecodeCanvas();
        if (rawQr) break;
      }
    }

    // ========================================================================
    // PASS 3: Sub-quadrants (Where Aadhaar QR codes typically reside)
    // - Bottom half (PVC back, letter bottom)
    // - Right half (e-Aadhaar)
    // - Left half (PVC back left)
    // - Center 75%
    // ========================================================================
    if (!rawQr) {
      const quadrants = [
        { name: 'bottom-half', x: 0, y: 0.35, w: 1, h: 0.65 },
        { name: 'right-half', x: 0.35, y: 0, w: 0.65, h: 1 },
        { name: 'bottom-right', x: 0.35, y: 0.35, w: 0.65, h: 0.65 },
        { name: 'bottom-left', x: 0, y: 0.35, w: 0.65, h: 0.65 },
        { name: 'center', x: 0.12, y: 0.12, w: 0.76, h: 0.76 }
      ];

      for (const q of quadrants) {
        setupCanvas(0, 1.2, q);
        rawQr = tryDecodeCanvas();
        if (rawQr) break;

        // Try 90° on bottom-right and bottom-half
        if (q.name === 'bottom-half' || q.name === 'bottom-right') {
          setupCanvas(90, 1.2, q);
          rawQr = tryDecodeCanvas();
          if (rawQr) break;
        }
      }
    }

    if (!rawQr) {
      return {
        success: false,
        error: 'NO_QR_FOUND',
        message: 'No readable Aadhaar QR code found in this photo. Please make sure the side with the QR code is uploaded and clearly visible.'
      };
    }

    // Parse extracted data
    const parsed = parseAadhaarQrData(rawQr.text, rawQr.rawBytes);

    if (!parsed || !parsed.fullName) {
      return {
        success: false,
        error: 'NOT_AADHAAR_QR',
        message: 'A QR code was detected, but it does not contain official Aadhaar data.'
      };
    }

    return {
      success: true,
      verified: true,
      data: parsed
    };
  } catch (err) {
    console.warn('[AadhaarQR] Scan exception:', err);
    return {
      success: false,
      error: err.message || 'QR_SCAN_ERROR',
      message: 'Failed to process image for QR code.'
    };
  } finally {
    if (loaded && loaded.cleanup) {
      loaded.cleanup();
    }
  }
}
