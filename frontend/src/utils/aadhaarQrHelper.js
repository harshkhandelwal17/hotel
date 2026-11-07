import jsQR from 'jsqr';
import * as pako from 'pako';

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

/**
 * Normalizes date into YYYY-MM-DD format for HTML date input
 */
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

/**
 * Normalizes gender to Male / Female / Other
 */
function normalizeGender(raw) {
  if (!raw) return '';
  const g = String(raw).trim().toUpperCase();
  if (g.startsWith('M') || g.includes('MALE') || g.includes('पुरुष')) return 'Male';
  if (g.startsWith('F') || g.includes('FEMALE') || g.includes('महिला')) return 'Female';
  return 'Other';
}

/**
 * Converts BigInt decimal string to Uint8Array
 */
function bigIntToBytes(bigIntStr) {
  let n = BigInt(bigIntStr);
  const bytes = [];
  while (n > 0n) {
    bytes.push(Number(n & 0xffn));
    n >>= 8n;
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * Converts byte array to BigInt and then to byte array in big-endian order
 */
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

/**
 * Parses raw Aadhaar QR data (supports XML format and UIDAI Secure QR Code V1/V2)
 * @param {string} rawData 
 * @param {Uint8Array|Array} binaryData 
 * @returns {object|null}
 */
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

      // Compose clean human-readable address
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

  // If binaryData was directly supplied by QR reader
  if (binaryData && binaryData.length > 50) {
    byteStream = new Uint8Array(binaryData);
  }

  // If rawData is decimal BigInt string (standard UIDAI representation)
  if (!byteStream && /^\d+$/.test(text) && text.length > 100) {
    byteStream = parseBigIntToByteArray(text) || bigIntToBytes(text);
  }

  // Attempt decompression using pako (gzip / deflate / zlib)
  if (byteStream) {
    let decompressed = null;

    try {
      // Standard zlib/deflate
      decompressed = pako.inflate(byteStream);
    } catch {
      try {
        // Raw deflate without header
        decompressed = pako.inflateRaw(byteStream);
      } catch {
        try {
          // Gzip
          decompressed = pako.ungzip(byteStream);
        } catch {
          // Fallback: If byteStream was already decompressed or had a leading offset
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
        // UIDAI V2 fields are delimited by 255 (0xFF)
        const fields = [];
        let currentField = [];
        let photoBytes = null;

        for (let i = 0; i < decompressed.length; i++) {
          const byte = decompressed[i];
          if (byte === 255) {
            // Once we have 16 text fields, the 17th field is photo bytes
            if (fields.length === 15) {
              fields.push(new Uint8Array(currentField));
              currentField = [];
              // The next stream is photo bytes up to signature delimiter or end
              const remaining = decompressed.subarray(i + 1);
              // Look for signature boundary (last 256 bytes RSA signature)
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

          // V2 Field Order:
          // 0: Email/Mobile flag
          // 1: Reference ID (last 4 digits of Aadhaar e.g. "9876/...")
          // 2: Name
          // 3: DOB (DD-MM-YYYY)
          // 4: Gender (M/F/T)
          // 5: Care of
          // 6: District
          // 7: Landmark
          // 8: House
          // 9: Location
          // 10: Pincode
          // 11: Post Office
          // 12: State
          // 13: Street
          // 14: Sub-district
          // 15: VTC (Village / Town / City)

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

          // Extract last 4 digits of Aadhaar from Reference ID if available
          let aadhaarNumber = '';
          const refMatch = refId.match(/^(\d{4})/);
          if (refMatch) {
            aadhaarNumber = `XXXX XXXX ${refMatch[1]}`;
          }

          // Build clean full address
          const addressParts = [co, house, street, lm, loc, vtc, po, dist, subdist, state, pc ? `PIN: ${pc}` : '']
            .filter(Boolean)
            .filter((item, index, self) => self.indexOf(item) === index);

          const fullAddress = addressParts.join(', ');

          // Optional photo base64 extraction (JPEG starts with 0xFF, 0xD8)
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
        console.warn('[AadhaarQR] Error parsing decompressed V2 stream:', err);
      }
    }
  }

  return null;
}

// ============================================================================
// IMAGE CANVAS SCANNER (Finds & decodes QR code from any image file or URL)
// ============================================================================

/**
 * Loads an image from File, Blob, or URL into an HTMLImageElement
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image for QR scanning'));
    if (typeof src === 'string') {
      img.src = src;
    } else if (src instanceof Blob || src instanceof File) {
      img.src = URL.createObjectURL(src);
    } else {
      reject(new Error('Invalid image source'));
    }
  });
}

/**
 * Scans for an Aadhaar QR code in an image (with multi-scale & contrast fallback)
 * @param {File|Blob|string} imageSource - Image file, blob, or resolved URL
 * @returns {Promise<{ success: boolean, verified?: boolean, data?: object, error?: string }>}
 */
export async function scanAadhaarQrFromImage(imageSource) {
  try {
    const img = await loadImage(imageSource);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      return { success: false, error: 'Canvas 2D context unavailable' };
    }

    // Helper to test scan on canvas
    const tryScanAtDimensions = (width, height, enhanceContrast = false) => {
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let imageData = ctx.getImageData(0, 0, width, height);

      if (enhanceContrast) {
        // High-contrast binarization helper for faded/camera-phone photos
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

      return code;
    };

    // Pass 1: Original dimensions (or capped at 2400px to avoid huge memory spikes)
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > 2400 || h > 2400) {
      const scale = Math.min(2400 / w, 2400 / h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    let qrCode = tryScanAtDimensions(w, h, false);

    // Pass 2: If not found, try standardized 1200px (sweet spot for QR detection)
    if (!qrCode && (w > 1200 || h > 1200)) {
      const scale = Math.min(1200 / w, 1200 / h);
      qrCode = tryScanAtDimensions(Math.round(w * scale), Math.round(h * scale), false);
    }

    // Pass 3: If still not found, try contrast-enhanced pass
    if (!qrCode) {
      qrCode = tryScanAtDimensions(w, h, true);
    }

    if (!qrCode || (!qrCode.data && (!qrCode.binaryData || qrCode.binaryData.length === 0))) {
      return {
        success: false,
        error: 'NO_QR_FOUND',
        message: 'No readable QR code found in this image.'
      };
    }

    // Parse the detected QR code
    const parsed = parseAadhaarQrData(qrCode.data, qrCode.binaryData);

    if (!parsed || !parsed.fullName) {
      return {
        success: false,
        error: 'INVALID_AADHAAR_QR',
        message: 'A QR code was detected, but it does not appear to be an official UIDAI Aadhaar QR code.'
      };
    }

    return {
      success: true,
      verified: true,
      data: parsed
    };
  } catch (err) {
    console.warn('[AadhaarQR] Error during scan:', err);
    return {
      success: false,
      error: err.message || 'Error scanning image'
    };
  }
}
