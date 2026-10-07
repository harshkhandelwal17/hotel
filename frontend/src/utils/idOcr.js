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
      if ('filter' in ctx) ctx.filter = 'grayscale(1)';
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
  const upper = flat.toUpperCase();

  // PAN: AAAAA9999A (allow common letter/number swaps like 0/O, 1/I, 8/B)
  // Just look for a 10 char string that loosely matches
  const panTokens = upper.split(/[\s\n]+/).filter(t => t.length === 10);
  for (const t of panTokens) {
    if (/^[A-Z]{5}[0-9OIZS]{4}[A-Z]$/.test(t) || /^[A-Z]{3}[C|P|H|F|A|T|B|L|J|G][A-Z][0-9]{4}[A-Z]$/.test(t)) {
       // Correct common number mistakes in the middle 4 digits
       let corrected = t.substring(0, 5) + 
                       t.substring(5, 9).replace(/O/g, '0').replace(/I/g, '1').replace(/Z/g, '2').replace(/S/g, '5').replace(/B/g, '8') + 
                       t.substring(9);
       return { type: 'Other', label: 'PAN', number: corrected };
    }
  }

  // Aadhaar: 12 digits as 4-4-4
  // Normalize string for aadhaar (convert common misreads to digits)
  const digitStr = upper.replace(/O/g, '0').replace(/I/g, '1').replace(/L/g, '1').replace(/B/g, '8').replace(/S/g, '5').replace(/Z/g, '2');
  const digitsRuns = [...digitStr.matchAll(/(?<!\d)(\d{4})\s*(\d{4})\s*(\d{4})(?!\s*\d{4})(?!\d)/g)];
  const aadhaarCandidates = digitsRuns.map((m) => m[1] + m[2] + m[3]);
  const validAadhaar = aadhaarCandidates.find(verhoeff);
  if (validAadhaar && !/^[01]/.test(validAadhaar)) {
    return { type: 'Aadhaar', label: 'Aadhaar', number: validAadhaar };
  }

  // Driving licence: SS00 YYYY NNNNNNN
  const dl = upper.match(/\b[A-Z]{2}[-\s]?[0-9OIZS]{2}[-\s]?(?:19|20)[0-9OIZS]{2}[-\s]?[0-9OIZS]{7}\b/);
  if (dl) {
    let corrected = dl[0].replace(/[\s-]/g, '');
    return { type: 'DL', label: 'Driving Licence', number: corrected };
  }

  // Voter ID (EPIC): AAA9999999
  const voter = upper.match(/\b[A-Z]{3}[0-9OIZS]{7}\b/);
  if (voter) {
     let corrected = voter[0].substring(0, 3) + voter[0].substring(3).replace(/O/g, '0').replace(/I/g, '1').replace(/Z/g, '2').replace(/S/g, '5');
     return { type: 'Voter ID', label: 'Voter ID', number: corrected };
  }

  if (/PASSPORT/.test(upper)) {
    const pp = upper.match(/\b[A-Z][0-9OIZS]{7}\b/);
    if (pp) return { type: 'Passport', label: 'Passport', number: pp[0] };
  }

  if (aadhaarCandidates.length) {
    return { type: 'Aadhaar', label: 'Aadhaar', number: aadhaarCandidates[0], invalid: true };
  }
  return null;
};

const findName = (text, type) => {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1) Label based
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

  // 2) Look for DOB to find name above it
  const dobIdx = lines.findIndex((l) => /(dob|d\.o\.b|date|birth|yob|year|जन्म)/i.test(l));
  if (dobIdx > 0) {
    for (let i = dobIdx - 1; i >= Math.max(0, dobIdx - 4); i--) {
      const n = asNameLine(lines[i]);
      if (n) return n;
    }
  }
  
  // 3) PAN Card: Name is usually the line directly below "INCOME TAX DEPARTMENT" or "GOVT. OF INDIA"
  const taxIdx = lines.findIndex(l => /INCOME|TAX|DEPARTMENT|GOVT|INDIA/i.test(l));
  if (taxIdx >= 0 && taxIdx < lines.length - 1) {
      for (let i = taxIdx + 1; i <= Math.min(lines.length - 1, taxIdx + 3); i++) {
          const n = asNameLine(lines[i]);
          if (n) return n;
      }
  }

  // 4) Just pick the first capitalized string that looks like a name as a last resort
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > 4 && /^[A-Z\s]+$/.test(lines[i].replace(/[^A-Za-z\s]/g, ''))) {
       const n = asNameLine(lines[i]);
       // ignore if it contains known ID words
       if (n && !NOISE.test(n)) return n;
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

