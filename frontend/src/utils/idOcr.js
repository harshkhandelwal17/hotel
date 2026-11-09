import { loadSafeImage, validateAadhaarNumber } from './aadhaarQrHelper';

let cachedEngWorkerPromise = null;

async function getOcrWorker() {
  if (!cachedEngWorkerPromise) {
    cachedEngWorkerPromise = (async () => {
      const Tesseract = (await import('tesseract.js')).default;
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: () => {}
      });
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO
      });
      return worker;
    })().catch((err) => {
      cachedEngWorkerPromise = null;
      throw err;
    });
  }
  return cachedEngWorkerPromise;
}

/**
 * Renders a rotated & cropped region of `img` onto a new canvas with auto-contrast stretching
 * and 3x3 sharpening so low-light/laminated Aadhaar cards look like crisp scanner documents.
 */
function renderPreprocessedCanvas(img, degrees = 0, crop = { x: 0, y: 0, w: 1, h: 1 }, maskQrRight = false) {
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  // Step 1: Rotate full image onto an upright working canvas
  const rotCanvas = document.createElement('canvas');
  const is90 = degrees === 90 || degrees === -90 || degrees === 270;
  const uprightW = is90 ? origH : origW;
  const uprightH = is90 ? origW : origH;
  rotCanvas.width = uprightW;
  rotCanvas.height = uprightH;

  const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
  rotCtx.translate(uprightW / 2, uprightH / 2);
  rotCtx.rotate((degrees * Math.PI) / 180);
  rotCtx.drawImage(img, -origW / 2, -origH / 2);

  // Step 2: Crop the requested normalized region from the upright canvas
  const sx = Math.round(crop.x * uprightW);
  const sy = Math.round(crop.y * uprightH);
  const sw = Math.max(1, Math.round(crop.w * uprightW));
  const sh = Math.max(1, Math.round(crop.h * uprightH));

  // Scale to an ideal OCR width (~1350px for full card, ~1100px for zone crop)
  const targetWidth = crop.w < 0.8 ? 1100 : 1400;
  const scale = Math.min(2.2, Math.max(1, targetWidth / sw));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const outCanvas = document.createElement('canvas');
  outCanvas.width = dw;
  outCanvas.height = dh;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rotCanvas, sx, sy, sw, sh, 0, 0, dw, dh);

  // Optional: Mask the right-side QR code box on full landscape card passes so QR dots don't pollute text lines
  if (maskQrRight && dw > dh) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(dw * 0.625), Math.round(dh * 0.24), Math.round(dw * 0.34), Math.round(dh * 0.44));
  }

  // Step 3: Percentile luminance contrast stretch (turns dark grey card background into clean white)
  const imgData = ctx.getImageData(0, 0, dw, dh);
  const d = imgData.data;
  const len = dw * dh;
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
    if (acc < len * 0.03) pLow = i;
    if (acc < len * 0.82) pHigh = i;
  }

  const range = Math.max(25, pHigh - pLow);
  for (let i = 0; i < len; i++) {
    let norm = ((lum[i] - pLow) * 255) / range;
    norm = norm < 0 ? 0 : norm > 255 ? 255 : norm;
    const idx = i * 4;
    d[idx] = norm;
    d[idx + 1] = norm;
    d[idx + 2] = norm;
  }
  ctx.putImageData(imgData, 0, 0);

  return outCanvas;
}

/**
 * Scores OCR text to determine whether the card orientation is upright
 */
export function scoreAadhaarText(text) {
  if (!text) return 0;
  const lower = text.toLowerCase();
  const strongKeywords = [
    'unique identification',
    'authority of india',
    'government of india',
    'address',
    'c/o',
    's/o',
    'd/o',
    'w/o',
    'dist:',
    'dist ',
    'po:',
    'tahsil',
    'tehsil',
    'vid :',
    'vid:',
    'help@uidai',
    'uidai.gov.in',
    'dob',
    'year of birth',
    'male',
    'female',
    'madhya pradesh',
    'uttar pradesh',
    'maharashtra',
    'rajasthan',
    'gujarat',
    'bihar',
    'karnataka',
    'delhi',
    '1947'
  ];

  let score = 0;
  for (const kw of strongKeywords) {
    if (lower.includes(kw)) score += 2;
  }
  if (extractAadhaarNumberFromText(text)) {
    score += 5;
  }
  if (/\b[1-9]\d{5}\b/.test(text)) {
    score += 2;
  }
  return score;
}

/**
 * Extracts a 12-digit Aadhaar number (preferring Verhoeff-valid numbers and ignoring 16-digit VIDs)
 */
export function extractAadhaarNumberFromText(rawText) {
  if (!rawText) return '';

  // Remove 16-digit VID lines first so we never take 12 digits out of a 16-digit VID
  const withoutVid = rawText
    .replace(/VID\s*[:;.-]*\s*[\d\s-]{14,22}/gi, ' ')
    .replace(/\b\d{4}\s+\d{4}\s+\d{4}\s+\d{4}\b/g, ' ');

  const candidates = [];
  const regex = /\b([2-9][0-9OIlSBZ]{3})[\s-]?([0-9OIlSBZ]{4})[\s-]?([0-9OIlSBZ]{4})\b/g;
  let m;
  while ((m = regex.exec(withoutVid)) !== null) {
    const fixDigits = (s) =>
      s
        .replace(/O/g, '0')
        .replace(/[Il]/g, '1')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/Z/g, '2');
    const g1 = fixDigits(m[1]);
    const g2 = fixDigits(m[2]);
    const g3 = fixDigits(m[3]);
    const twelve = `${g1}${g2}${g3}`;
    if (/^[2-9]\d{11}$/.test(twelve)) {
      const formatted = `${g1} ${g2} ${g3}`;
      if (validateAadhaarNumber(twelve).valid) {
        return formatted;
      }
      candidates.push(formatted);
    }
  }

  return candidates[0] || '';
}

/**
 * Parses clean English address from Aadhaar Back OCR text (strictly skipping Hindi block above Address:)
 */
export function parseEnglishAddressFromText(rawText) {
  if (!rawText) return '';

  let t = rawText
    // Remove sideways border text like "Details as on: 24/10/2025"
    .replace(/Details\s+as\s+on\s*[:;.-]*\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/gi, ' ')
    // Remove headers & footers
    .replace(/Unique\s+Identification\s+Authority\s+of\s+India/gi, ' ')
    .replace(/Government\s+of\s+India/gi, ' ')
    .replace(/help@uidai\.gov\.in/gi, ' ')
    .replace(/www\.uidai\.gov\.in/gi, ' ')
    .replace(/VID\s*[:;.-]*\s*[\d\s-]{10,22}/gi, ' ')
    .replace(/\b[2-9]\d{3}\s+\d{4}\s+\d{4}\b/g, ' ')
    .replace(/\b1947\b/g, ' ');

  let addressBlock = '';

  // 1. PRIORITY 1: Match explicit English "Address:" label (never Hindi पता so we skip the top Hindi paragraph!)
  const engAddressMatch = t.match(/\b(?:Address|Addres|Addross|Adoress|Addr)\s*[:;.-]*\s*([\s\S]+)/i);
  if (engAddressMatch && engAddressMatch[1]) {
    addressBlock = engAddressMatch[1];
  }

  // 2. PRIORITY 2: Match English Care-Of / Relation prefix (C/O, S/O, D/O, W/O)
  if (!addressBlock) {
    const coMatch = t.match(/\b((?:C\/O|S\/O|D\/O|W\/O|C\/0|S\/0|D\/0|W\/0|CO\s*:|SO\s*:|DO\s*:|WO\s*:)\s*[:;.-]*\s*[\s\S]+)/i);
    if (coMatch && coMatch[1]) {
      addressBlock = coMatch[1];
    }
  }

  // 3. PRIORITY 3: If bilingual card has two 6-digit PINs (first at end of Hindi block, second at end of English block)
  if (!addressBlock) {
    const allPins = [...t.matchAll(/\b([1-9]\d{5})\b/g)];
    if (allPins.length >= 2) {
      const firstPinEnd = allPins[0].index + 6;
      addressBlock = t.substring(firstPinEnd);
    } else {
      addressBlock = t;
    }
  }

  // Truncate right after the 6-digit Indian PIN code inside the English address block
  const pinMatch = addressBlock.match(/\b([1-9]\d{5})\b/);
  if (pinMatch) {
    const pinEndIdx = addressBlock.indexOf(pinMatch[0]) + 6;
    addressBlock = addressBlock.substring(0, pinEndIdx);
  }

  // Clean up lines (drop lines that are pure garbage/symbols from borders)
  const cleanedLines = addressBlock
    .split(/[\r\n]+/)
    .map((line) =>
      line
        // Normalize C/0 -> C/O
        .replace(/\b([CSDW])\/0\b/gi, '$1/O')
        // Strip leading single-character sideways border artifacts
        .replace(/^\s*[^a-zA-Z0-9]+\s*/, '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/[^a-zA-Z0-9\s,./:-]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
    )
    .filter((line) => {
      if (!line || line.length < 3) return false;
      const alnumCount = (line.match(/[a-zA-Z0-9]/g) || []).length;
      return alnumCount >= 3;
    });

  const joined = cleanedLines
    .join(', ')
    .replace(/(\s*,\s*)+/g, ', ')
    .replace(/:\s*,/g, ': ')
    .replace(/^[,.\s:-]+/, '')
    .replace(/[,.\s:-]+$/, '')
    .trim();

  return joined.substring(0, 250);
}

/**
 * Extracts Front-side fields (Full Name, DOB, Gender) if present in OCR text
 */
export function parseFrontFieldsFromText(rawText) {
  if (!rawText) return { fullName: '', dateOfBirth: '', gender: '' };

  let gender = '';
  if (/\bFEMALE\b/i.test(rawText)) gender = 'Female';
  else if (/\bMALE\b/i.test(rawText)) gender = 'Male';
  else if (/\bTRANSGENDER\b/i.test(rawText)) gender = 'Other';

  let dateOfBirth = '';
  // Match DOB: DD/MM/YYYY (ignoring "Details as on: DD/MM/YYYY" or "Issue Date" or "Download Date")
  const dobLabeled = rawText.match(/(?:DOB|D\.O\.B|Birth)\s*[:;./-]*\s*(\d{1,2})[/-](\d{1,2})[/-]((?:19|20)\d{2})/i);
  if (dobLabeled) {
    const dd = dobLabeled[1].padStart(2, '0');
    const mm = dobLabeled[2].padStart(2, '0');
    const yyyy = dobLabeled[3];
    dateOfBirth = `${yyyy}-${mm}-${dd}`;
  } else {
    const yobMatch = rawText.match(/Year\s+of\s+Birth\s*[:;.-]*\s*((?:19|20)\d{2})/i);
    if (yobMatch) {
      dateOfBirth = `${yobMatch[1]}-01-01`;
    }
  }

  // Full Name on Front Aadhaar sits on the line immediately before DOB / Year of Birth
  let fullName = '';
  const lines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.replace(/[^a-zA-Z\s.]/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter((l) => l.length >= 3);

  const dobLineIdx = lines.findIndex((l) => /\b(DOB|Birth|Year|Male|Female)\b/i.test(l));
  if (dobLineIdx > 0) {
    for (let i = dobLineIdx - 1; i >= 0; i--) {
      const candidate = lines[i];
      if (
        !/\b(Government|India|Unique|Identification|Authority|Aadhaar|Address|Details|Issue|Download|Father|Husband|Wife)\b/i.test(
          candidate
        ) &&
        /^[A-Z][a-zA-Z]+(\s+[A-Z][a-zA-Z]+){0,3}$/.test(candidate)
      ) {
        fullName = candidate;
        break;
      }
    }
  }

  return { fullName, dateOfBirth, gender };
}

/**
 * Full Local Smart Aadhaar Scanner (100% Free, In-Browser WASM, Works with aiOcrEnabled = false)
 * Extracts Aadhaar Number (Verhoeff checked), Address, Name, DOB, and Gender across rotations.
 */
export async function scanIdCardLocally(imageSource, side = 'auto') {
  let loaded = null;
  try {
    loaded = await loadSafeImage(imageSource);
    const { img } = loaded;
    const origW = img.naturalWidth || img.width;
    const origH = img.naturalHeight || img.height;

    const worker = await getOcrWorker();

    // Smart rotation order: portrait photos of horizontal cards (like 768x1024) are rotated -90 or +90!
    const isPortrait = origH > origW * 1.1;
    const rotationOrder = isPortrait ? [-90, 90, 0] : [0, -90, 90];

    let bestText = '';
    let bestScore = -1;
    let bestAngle = 0;

    for (const deg of rotationOrder) {
      const preppedCanvas = renderPreprocessedCanvas(img, deg, { x: 0, y: 0, w: 1, h: 1 }, true);
      const res = await worker.recognize(preppedCanvas);
      const text = res?.data?.text || '';
      const score = scoreAadhaarText(text);

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
        bestAngle = deg;
      }

      // Stop rotating immediately once we hit a clear upright Aadhaar orientation
      if (score >= 6) {
        break;
      }
    }

    const idProofNumber = extractAadhaarNumberFromText(bestText);
    const { fullName, dateOfBirth, gender } = parseFrontFieldsFromText(bestText);
    let address = parseEnglishAddressFromText(bestText);

    // If this is the Back side (or has address indicators), run a fast ~300ms pass on the Clean Left Address Zone
    // (x: 0.095..0.625, y: 0.20..0.72) which completely excludes the QR code on the right and vertical border text!
    const looksLikeBack =
      side === 'back' ||
      /\b(Address|Addres|C\/O|S\/O|D\/O|W\/O|DIST|PO:|1947|help@uidai)\b/i.test(bestText) ||
      (!fullName && !dateOfBirth);

    if (looksLikeBack) {
      try {
        const cleanZoneCanvas = renderPreprocessedCanvas(
          img,
          bestAngle,
          { x: 0.095, y: 0.2, w: 0.535, h: 0.52 },
          false
        );
        const zoneRes = await worker.recognize(cleanZoneCanvas);
        const zoneText = zoneRes?.data?.text || '';
        const zoneAddress = parseEnglishAddressFromText(zoneText);

        // Prefer the clean zone address if it contains a valid 6-digit PIN or is cleaner/longer
        if (
          zoneAddress &&
          (/\b[1-9]\d{5}\b/.test(zoneAddress) || zoneAddress.length > address.length)
        ) {
          address = zoneAddress;
        }
      } catch (_) {}
    }

    const pinMatch = address.match(/\b([1-9]\d{5})\b/);
    const pincode = pinMatch ? pinMatch[1] : '';

    const hasAnyData = Boolean(idProofNumber || address || fullName || dateOfBirth || gender);

    return {
      success: hasAnyData,
      fullName,
      idProofNumber,
      gender,
      dateOfBirth,
      address,
      pincode,
      orientation: bestAngle
    };
  } catch (error) {
    console.error('[LocalIdOcr] Error during local ID scan:', error);
    return {
      success: false,
      fullName: '',
      idProofNumber: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      pincode: ''
    };
  } finally {
    if (loaded && loaded.cleanup) {
      loaded.cleanup();
    }
  }
}

export const extractAddressFromBackId = async (imageFile) => {
  const res = await scanIdCardLocally(imageFile, 'back');
  return res.address || '';
};
