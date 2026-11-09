import jsQR from 'jsqr';
import * as pako from 'pako';
import {
  QRCodeReader,
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
  // 1. XML FORMAT (Older Aadhaar Cards, QPDB & e-Aadhaar downloads)
  // --------------------------------------------------------------------------
  if (text.includes('PrintLetterBarcodeData') || text.includes('<QPDB') || text.startsWith('<?xml') || text.startsWith('<PrintLetterBarcodeData')) {
    try {
      const getAttr = (name) => {
        const regex = new RegExp(`\\b${name}="([^"]*)"`, 'i');
        const match = text.match(regex);
        return match ? match[1].trim() : '';
      };

      const uid = getAttr('uid') || getAttr('u');
      const name = getAttr('name') || getAttr('n');
      const gender = normalizeGender(getAttr('gender') || getAttr('g'));
      const dob = normalizeDateOfBirth(getAttr('dob') || getAttr('yob') || getAttr('d'));
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
      const directAddr = getAttr('a');

      const addressParts = directAddr
        ? [directAddr]
        : [co, house, street, lm, loc, vtc, po, dist, subdist, state, pc ? `PIN: ${pc}` : '']
            .filter(Boolean)
            .filter((item, index, self) => self.indexOf(item) === index);

      const fullAddress = addressParts.join(', ');

      if (name) {
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
      }
    } catch (err) {
      console.warn('[AadhaarQR] Error parsing XML format:', err);
    }
  }

  // --------------------------------------------------------------------------
  // 2. SECURE QR CODE FORMAT (UIDAI 2048-bit digitally signed e-Aadhaar & PVC)
  // --------------------------------------------------------------------------
  const candidateStreams = [];
  const cleanDigits = text.replace(/\s+/g, '');

  // IMPORTANT: Numeric UIDAI Secure QR is a huge Base-10 integer string representing a gzip byte array.
  // In jsQR/ZXing, `binaryData` is just the ASCII bytes of the decimal digits, so ALWAYS try BigInt conversion FIRST!
  if (/^\d+$/.test(cleanDigits) && cleanDigits.length > 80) {
    const fromHex = parseBigIntToByteArray(cleanDigits);
    if (fromHex && fromHex.length > 20) candidateStreams.push(fromHex);
    const fromShift = bigIntToBytes(cleanDigits);
    if (fromShift && fromShift.length > 20) candidateStreams.push(fromShift);
  }

  if (binaryData && binaryData.length > 50) {
    candidateStreams.push(new Uint8Array(binaryData));
  }

  // Also support Byte-mode QR decoded as Latin-1 string (e.g. from Native BarcodeDetector)
  if (text.length > 50 && !/^\d+$/.test(cleanDigits)) {
    const latinBytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      latinBytes[i] = text.charCodeAt(i) & 0xff;
    }
    candidateStreams.push(latinBytes);
  }

  let decompressed = null;
  for (const byteStream of candidateStreams) {
    try {
      decompressed = pako.ungzip(byteStream);
    } catch {
      try {
        decompressed = pako.inflate(byteStream);
      } catch {
        try {
          decompressed = pako.inflateRaw(byteStream);
        } catch {
          for (let offset = 1; offset < 10; offset++) {
            try {
              decompressed = pako.inflate(byteStream.subarray(offset));
              if (decompressed && decompressed.length > 20) break;
            } catch (_) {}
          }
        }
      }
    }
    if (decompressed && decompressed.length > 20) break;
  }

  if (decompressed && decompressed.length > 0) {
    try {
      const fields = [];
      let currentField = [];
      let photoBytes = null;

      // Read up to 18 0xFF-delimited text fields (supports both legacy 16-field and V2-V5 17-field headers)
      for (let i = 0; i < decompressed.length; i++) {
        const byte = decompressed[i];
        if (byte === 255) {
          fields.push(new Uint8Array(currentField));
          currentField = [];
          if (fields.length >= 17) {
            const remaining = decompressed.subarray(i + 1);
            if (remaining.length > 256) {
              photoBytes = remaining.subarray(0, remaining.length - 256);
            } else {
              photoBytes = remaining;
            }
            break;
          }
        } else {
          currentField.push(byte);
        }
      }

      if (fields.length >= 5) {
        const decoder = new TextDecoder('iso-8859-1');
        const textFields = fields.map(f => decoder.decode(f).trim());

        // Auto-detect field offset:
        // Legacy Secure QR: [0:ind, 1:refId, 2:name, 3:dob, 4:gender, 5:co, 6:dist, 7:lm, 8:house, 9:loc, 10:pc, 11:po, 12:state, 13:street, 14:subdist, 15:vtc]
        // V2/V3/V4/V5 QR:  [0:'V2', 1:ind, 2:refId, 3:name, 4:dob, 5:gender, 6:co, 7:dist, 8:lm, 9:house, 10:loc, 11:pc, 12:po, 13:state, 14:street, 15:subdist, 16:vtc]
        let genderIdx = /^V\d/i.test(textFields[0]) ? 5 : 4;
        for (let idx = 3; idx <= 6 && idx < textFields.length; idx++) {
          if (/^(M|F|T|MALE|FEMALE|TRANSGENDER)$/i.test(textFields[idx])) {
            genderIdx = idx;
            break;
          }
        }

        const refId = textFields[genderIdx - 3] || '';
        const name = textFields[genderIdx - 2] || '';
        const dob = normalizeDateOfBirth(textFields[genderIdx - 1]);
        const gender = normalizeGender(textFields[genderIdx]);
        const co = textFields[genderIdx + 1] || '';
        const dist = textFields[genderIdx + 2] || '';
        const lm = textFields[genderIdx + 3] || '';
        const house = textFields[genderIdx + 4] || '';
        const loc = textFields[genderIdx + 5] || '';
        const pc = textFields[genderIdx + 6] || '';
        const po = textFields[genderIdx + 7] || '';
        const state = textFields[genderIdx + 8] || '';
        const street = textFields[genderIdx + 9] || '';
        const subdist = textFields[genderIdx + 10] || '';
        const vtc = textFields[genderIdx + 11] || '';

        let aadhaarNumber = '';
        const refMatch = refId.match(/^(\d{4})/);
        if (refMatch) {
          aadhaarNumber = `XXXX XXXX ${refMatch[1]}`;
        }

        const addressParts = [co, house, street, lm, loc, vtc, po, dist, subdist, state, pc && /^\d{6}$/.test(pc) ? `PIN: ${pc}` : '']
          .filter(Boolean)
          .filter((item, index, self) => self.indexOf(item) === index);

        const fullAddress = addressParts.join(', ');

        let photoBase64 = null;
        if (photoBytes && photoBytes.length > 50) {
          for (let k = 0; k < Math.min(photoBytes.length - 2, 32); k++) {
            if (photoBytes[k] === 0xFF && photoBytes[k + 1] === 0xD8) {
              let binary = '';
              for (let i = k; i < photoBytes.length; i++) {
                binary += String.fromCharCode(photoBytes[i]);
              }
              photoBase64 = 'data:image/jpeg;base64,' + btoa(binary);
              break;
            }
          }
        }

        if (name) {
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
      }
    } catch (err) {
      console.warn('[AadhaarQR] Error parsing decompressed stream:', err);
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
// FAST MULTI-ENGINE IMAGE SCANNER (Native BarcodeDetector + ZXing + jsQR)
// ============================================================================

/**
 * Loads an image safely without CORS taint issues (uses backend proxy for Cloudflare R2 URLs)
 */
export async function loadSafeImage(src) {
  const loadImgWithTimeout = (url, crossOrigin = null, cleanupFn = () => {}) => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanupFn();
        reject(new Error('Image load timed out'));
      }, 4000);
      const img = new Image();
      if (crossOrigin) img.crossOrigin = crossOrigin;
      img.onload = () => {
        clearTimeout(timer);
        resolve({ img, cleanup: cleanupFn });
      };
      img.onerror = () => {
        clearTimeout(timer);
        cleanupFn();
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });
  };

  if (src instanceof Blob || src instanceof File) {
    const objectUrl = URL.createObjectURL(src);
    return loadImgWithTimeout(objectUrl, null, () => URL.revokeObjectURL(objectUrl));
  }

  if (typeof src === 'string') {
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      return loadImgWithTimeout(src, null);
    }

    // 1. Try direct CORS fetch first
    try {
      const res = await fetch(src, { mode: 'cors', signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        return loadImgWithTimeout(objectUrl, null, () => URL.revokeObjectURL(objectUrl));
      }
    } catch (_) {
      // Expected for Cloudflare R2 URLs that lack Access-Control-Allow-Origin headers
    }

    // 2. Fallback: Fetch through our backend CORS-safe image proxy (/api/upload/proxy)
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const proxyUrl = `${apiBase}/api/upload/proxy?url=${encodeURIComponent(src)}`;
      const proxyRes = await fetch(proxyUrl, { mode: 'cors', signal: AbortSignal.timeout(5000) });
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        const objectUrl = URL.createObjectURL(blob);
        return loadImgWithTimeout(objectUrl, null, () => URL.revokeObjectURL(objectUrl));
      }
    } catch (proxyErr) {
      console.warn('[AadhaarQR] Proxy image fetch failed:', proxyErr.message);
    }

    return loadImgWithTimeout(src, 'Anonymous');
  }

  throw new Error('Invalid image source');
}

/**
 * Decodes QR code from canvas using synchronous ZXing QRCodeReader with TRY_HARDER enabled
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

    // CRITICAL: TRY_HARDER sets FinderPatternFinder iSkip = MIN_SKIP (3px) so dense Version 25-40 Aadhaar QR codes are detected!
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new QRCodeReader();
    const result = reader.decode(bitmap, hints);
    if (result) {
      return {
        text: result.getText(),
        rawBytes: result.getRawBytes ? result.getRawBytes() : null
      };
    }
  } catch (_) {
    // Normal: QR not in this specific frame/binarization
  }
  return null;
}

/**
 * Decodes QR code from canvas using jsQR (with optional high-contrast stretching)
 */
function decodeJsQR(canvas, enhanceContrast = false) {
  try {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (enhanceContrast) {
      const d = imageData.data;
      // Local adaptive contrast stretch around mid-tone
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 306 + d[i + 1] * 601 + d[i + 2] * 117) >> 10;
        const v = lum < 115 ? 0 : lum > 155 ? 255 : ((lum - 115) * 255) / 40;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
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
 * Try hardware-accelerated Native Browser BarcodeDetector if supported (Chrome/macOS/Android/Edge)
 */
async function tryNativeBarcodeDetector(sourceElement) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const barcodes = await Promise.race([
      detector.detect(sourceElement),
      new Promise((_, reject) => setTimeout(() => reject(new Error('BarcodeDetector timeout')), 800))
    ]);
    if (Array.isArray(barcodes) && barcodes.length > 0) {
      for (const b of barcodes) {
        if (b.rawValue) {
          return { text: b.rawValue, rawBytes: null };
        }
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Applies percentile contrast normalization + 3x3 Unsharp Mask + Local Adaptive Binarization
 * specifically designed to neutralize lamination glare and shadows on Aadhaar QR codes.
 */
function applyUnsharpAndNormalize(canvas) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    if (w * h > 2400 * 2400) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const len = w * h;
    const lum = new Uint8Array(len);
    const hist = new Uint32Array(256);

    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const v = (d[idx] * 306 + d[idx + 1] * 601 + d[idx + 2] * 117) >> 10;
      lum[i] = v;
      hist[v]++;
    }

    let pLow = 0;
    let pHigh = 255;
    let acc = 0;
    for (let i = 0; i < 256; i++) {
      acc += hist[i];
      if (acc < len * 0.04) pLow = i;
      if (acc < len * 0.88) pHigh = i;
    }
    const range = Math.max(25, pHigh - pLow);
    const norm = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      let v = ((lum[i] - pLow) * 255) / range;
      norm[i] = v < 0 ? 0 : v > 255 ? 255 : v;
    }

    // 3x3 Unsharp Mask: 5*c - top - bottom - left - right
    for (let y = 1; y < h - 1; y++) {
      const row = y * w;
      for (let x = 1; x < w - 1; x++) {
        const i = row + x;
        let val = 5 * norm[i] - norm[i - w] - norm[i + w] - norm[i - 1] - norm[i + 1];
        val = val < 0 ? 0 : val > 255 ? 255 : val;
        const idx = i * 4;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}
}

/**
 * Local adaptive windowed thresholding to eliminate uneven lighting and plastic lamination reflections
 */
function applyAdaptiveThreshold(canvas, blockSize = 25, c = 7) {
  try {
    const w = canvas.width;
    const h = canvas.height;
    if (w * h > 2000 * 2000) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Integral image for O(1) local window mean calculation
    const integral = new Uint32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      const yOffset = (y + 1) * (w + 1);
      const prevYOffset = y * (w + 1);
      const imgRowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        const idx = imgRowOffset + x * 4;
        const lum = (d[idx] * 306 + d[idx + 1] * 601 + d[idx + 2] * 117) >> 10;
        rowSum += lum;
        integral[yOffset + (x + 1)] = integral[prevYOffset + (x + 1)] + rowSum;
      }
    }

    const r = Math.floor(blockSize / 2);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h, y + r + 1);
      const rowY0 = y0 * (w + 1);
      const rowY1 = y1 * (w + 1);
      const imgRow = y * w * 4;
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r);
        const x1 = Math.min(w, x + r + 1);
        const count = (x1 - x0) * (y1 - y0);
        const sum = integral[rowY1 + x1] - integral[rowY0 + x1] - integral[rowY1 + x0] + integral[rowY0 + x0];
        const mean = sum / count;
        const idx = imgRow + x * 4;
        const lum = (d[idx] * 306 + d[idx + 1] * 601 + d[idx + 2] * 117) >> 10;
        const val = lum < (mean - c) ? 0 : 255;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (_) {}
}

/**
 * Scans an image for Aadhaar QR code with fast multi-pass detection
 * @param {File|Blob|string} imageSource
 * @param {object} options
 * @param {string} options.side - 'front' | 'back' | 'auto' (front skips useless multi-angle search)
 * @returns {Promise<{ success: boolean, data?: object, error?: string, message?: string }>}
 */
export async function scanAadhaarQrFromImage(imageSource, options = {}) {
  const side = options.side || 'auto';
  let loaded = null;
  try {
    loaded = await loadSafeImage(imageSource);
    const { img } = loaded;

    const originalW = img.naturalWidth || img.width;
    const originalH = img.naturalHeight || img.height;

    if (!originalW || !originalH) {
      return { success: false, error: 'INVALID_IMAGE_DIMENSIONS', message: 'Image has 0 dimensions' };
    }

    let rawQr = null;

    // ========================================================================
    // PASS 0: Fast Hardware-Accelerated Native Browser BarcodeDetector (~10ms)
    // ========================================================================
    rawQr = await tryNativeBarcodeDetector(img);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!rawQr && ctx) {
      const MAX_SIDE = 3800;

      const drawRegion = (region, scale, angleDeg = 0) => {
        const sx = Math.round(region.x * originalW);
        const sy = Math.round(region.y * originalH);
        const sw = Math.max(1, Math.round(region.w * originalW));
        const sh = Math.max(1, Math.round(region.h * originalH));
        let dw = Math.round(sw * scale);
        let dh = Math.round(sh * scale);
        const longest = Math.max(dw, dh);
        if (longest > MAX_SIDE) {
          const f = MAX_SIDE / longest;
          dw = Math.round(dw * f);
          dh = Math.round(dh * f);
        }
        if (dw < 40 || dh < 40) return false;

        const isRotated90 = angleDeg === 90 || angleDeg === 270;
        canvas.width = isRotated90 ? dh : dw;
        canvas.height = isRotated90 ? dw : dh;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (angleDeg === 0) {
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
        } else {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((angleDeg * Math.PI) / 180);
          ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        }
        ctx.restore();
        return true;
      };

      const tryDecodeCanvas = (withEnhance = false) => {
        let hit = decodeZxing(canvas, false) || decodeJsQR(canvas, false) || decodeZxing(canvas, true);
        if (!hit && withEnhance) {
          applyUnsharpAndNormalize(canvas);
          hit = decodeZxing(canvas, false) || decodeJsQR(canvas, false) || decodeZxing(canvas, true);
          if (!hit) {
            applyAdaptiveThreshold(canvas, 29, 6);
            hit = decodeZxing(canvas, false) || decodeJsQR(canvas, false) || decodeZxing(canvas, true);
          }
        }
        return hit || null;
      };

      const FULL = { x: 0, y: 0, w: 1, h: 1 };
      const isPortrait = originalH > originalW * 1.1;

      // OPTIMIZATION: Front side of Aadhaar never has a dense QR.
      // So on front side, run only 1 fast native check (FULL scale 1) and exit in ~80ms.
      // Back side gets the deep multi-scale + multi-rotation QR scan.
      if (side === 'front') {
        if (drawRegion(FULL, 1, 0)) {
          rawQr = tryDecodeCanvas(false);
        }
      } else {
        const regions = isPortrait
          ? [
              FULL,
              { x: 0.15, y: 0.45, w: 0.75, h: 0.52 }, // bottom-center QR on portrait card
              { x: 0.15, y: 0.03, w: 0.75, h: 0.52 }, // top-center QR on portrait card
              { x: 0.35, y: 0.25, w: 0.65, h: 0.75 }
            ]
          : [
              FULL,
              { x: 0.38, y: 0.15, w: 0.60, h: 0.75 }, // right side QR on landscape card
              { x: 0.02, y: 0.15, w: 0.60, h: 0.75 }, // left side QR on landscape card
              { x: 0.25, y: 0.35, w: 0.75, h: 0.65 }
            ];

        const primaryAngles = isPortrait ? [270, 90, 0] : [0, 270, 90];
        const scales = [1, 1.4, 0.75];

        outer:
        for (const scale of scales) {
          for (const region of regions) {
            if (scale > 1 && region === FULL && Math.max(originalW, originalH) * scale > 2400) continue;
            const anglesForRegion = (scale === 1) ? primaryAngles : [primaryAngles[0]];
            for (const angle of anglesForRegion) {
              await new Promise(resolve => setTimeout(resolve, 0));
              if (!drawRegion(region, scale, angle)) continue;
              rawQr = tryDecodeCanvas(scale > 1 && region !== FULL);
              if (!rawQr && angle !== 0 && region !== FULL) {
                rawQr = await tryNativeBarcodeDetector(canvas);
              }
              if (rawQr) break outer;
            }
          }
        }
      }
    }

    if (!rawQr) {
      const longSide = Math.max(originalW, originalH);
      // Aadhaar Secure QR needs ~500px for the QR alone; a card fills ~1/3 of the frame,
      // so photos under ~1800px (e.g. WhatsApp-forwarded/compressed) usually cannot be decoded.
      const tooSmall = longSide < 1800;
      console.info(`[AadhaarQR] No QR decoded. Image ${originalW}x${originalH}px, nativeDetector=${'BarcodeDetector' in window}`);
      return {
        success: false,
        error: tooSmall ? 'IMAGE_TOO_SMALL' : 'NO_QR_FOUND',
        imageSize: `${originalW}x${originalH}`,
        message: tooSmall
          ? `Photo is too small (${originalW}x${originalH}px) - Aadhaar QR is very dense. Use the original camera photo (not WhatsApp/compressed) and keep the QR side close and flat.`
          : `QR not readable in this photo (${originalW}x${originalH}px). Move closer so the QR fills more of the frame, avoid glare/shadow, and keep the card flat.`
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
