// ---------------------------------------------------------------------------
// ID card OCR (runs fully in the browser via tesseract.js, no API key needed)
//   scanIdCard(file, onProgress) -> { type, number, name, numberValid, rawText }
// ---------------------------------------------------------------------------

/**
 * OCR needs more pixels than the 800px upload copy, so we make a separate
 * sharper, grayscale/high-contrast copy just for reading (never uploaded).
 */
export const prepareForOcr = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let { width, height } = img;
      const scale = Math.min(1, MAX / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if ('filter' in ctx) ctx.filter = 'grayscale(1) contrast(1.35)';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        canvas.width = 0;
        canvas.height = 0;
        blob ? resolve(blob) : reject(new Error('Could not prepare image'));
      }, 'image/jpeg', 0.92);
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });

// --- Verhoeff checksum (Aadhaar numbers are Verhoeff-valid) ----------------
const D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0]
];
const P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]
];
const verhoeff = (num) => {
  let c = 0;
  const arr = String(num).split('').reverse().map(Number);
  for (let i = 0; i < arr.length; i++) c = D[c][P[i % 8][arr[i]]];
  return c === 0;
};

// --- helpers ----------------------------------------------------------------
const titleCase = (s) =>
  s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

const NOISE = /government|india|authority|unique|identification|aadhaar|aadhar|male|female|transgender|help|www|uidai|income|tax|department|permanent|account|number|card|signature|father|mother|husband|date|birth|year|dob|address|licen[cs]e|driving|union|state|valid|issued|election|commission|elector|identity|passport|republic/i;

/** Returns a cleaned "name-looking" line or null. */
const asNameLine = (line) => {
  const cleaned = line.replace(/[^A-Za-z.' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length < 4) return null;
  const letters = cleaned.replace(/[^A-Za-z]/g, '').length;
  // reject lines that were mostly symbols/digits (OCR garbage from Hindi text)
  if (letters / line.trim().length < 0.8) return null;
  if (NOISE.test(cleaned)) return null;
  const words = cleaned.split(' ').filter(Boolean);
  if (words.some((w) => w.replace(/\./g, '').length < 2 && words.length < 3)) return null;
  if (words.length > 5) return null;
  return titleCase(cleaned);
};

const findNumbers = (text) => {
  const flat = text.replace(/[\u200e\u200f]/g, '');

  // PAN: AAAAA9999A
  const pan = flat.toUpperCase().match(/\b[A-Z]{5}\s?\d{4}\s?[A-Z]\b/);
  if (pan) return { type: 'Other', label: 'PAN', number: pan[0].replace(/\s/g, '') };

  // Aadhaar: 12 digits as 4-4-4 (ignore 16-digit VID)
  const digitsRuns = [...flat.matchAll(/(?<!\d)(\d{4})\s*(\d{4})\s*(\d{4})(?!\s*\d{4})(?!\d)/g)];
  const aadhaarCandidates = digitsRuns.map((m) => m[1] + m[2] + m[3]);
  const validAadhaar = aadhaarCandidates.find(verhoeff);
  if (validAadhaar && !/^[01]/.test(validAadhaar)) {
    return { type: 'Aadhaar', label: 'Aadhaar', number: validAadhaar };
  }

  const upper = flat.toUpperCase();

  // Driving licence: SS00 YYYY NNNNNNN (e.g. MP09 20110012345), separators vary
  const dl = upper.match(/\b[A-Z]{2}[-\s]?\d{2}[-\s]?(?:19|20)\d{2}[-\s]?\d{7}\b/);
  if (dl) return { type: 'DL', label: 'Driving Licence', number: dl[0].replace(/[\s-]/g, '') };

  // Voter ID (EPIC): AAA9999999
  const voter = upper.match(/\b[A-Z]{3}\d{7}\b/);
  if (voter) return { type: 'Voter ID', label: 'Voter ID', number: voter[0] };

  // Passport: A1234567 (only if the word passport appears)
  if (/PASSPORT/.test(upper)) {
    const pp = upper.match(/\b[A-Z]\d{7}\b/);
    if (pp) return { type: 'Passport', label: 'Passport', number: pp[0] };
  }

  // Aadhaar-looking but failed checksum (OCR misread): still return, flagged
  if (aadhaarCandidates.length) {
    return { type: 'Aadhaar', label: 'Aadhaar', number: aadhaarCandidates[0], invalid: true };
  }
  return null;
};

const findName = (text, type) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1) Label based: "Name: RAHUL SHARMA" or "Name" followed by the next line
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/father|mother|husband|guardian|s\/o|d\/o|w\/o|c\/o/i.test(l)) continue;
    const m = l.match(/^(?:elector'?s\s+)?name\b\s*[:\-]?\s*(.*)$/i);
    if (m) {
      const inline = asNameLine(m[1] || '');
      if (inline) return inline;
      const next = asNameLine(lines[i + 1] || '');
      if (next) return next;
    }
  }

  // 2) Aadhaar: name sits just above the DOB / Year of Birth line
  const dobIdx = lines.findIndex((l) => /(dob|d\.o\.b|date of birth|year of birth|yob|जन्म)/i.test(l));
  if (dobIdx > 0) {
    for (let i = dobIdx - 1; i >= Math.max(0, dobIdx - 4); i--) {
      const n = asNameLine(lines[i]);
      if (n) return n;
    }
  }
  return null;
};

export const parseIdText = (text) => {
  const found = findNumbers(text);
  const name = findName(text, found?.type);
  return {
    type: found?.type || null,
    label: found?.label || null,
    number: found?.number || '',
    numberValid: found ? !found.invalid : false,
    name: name || ''
  };
};

/**
 * Reads an ID photo. onProgress(0..100) is optional.
 * tesseract.js is imported lazily so it never slows the rest of the app.
 */
export const scanIdCard = async (file, onProgress) => {
  const [{ createWorker }, prepared] = await Promise.all([
    import('tesseract.js'),
    prepareForOcr(file)
  ]);

  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100));
    }
  });

  try {
    const { data } = await worker.recognize(prepared);
    return { ...parseIdText(data.text || ''), rawText: data.text || '' };
  } finally {
    await worker.terminate();
  }
};

