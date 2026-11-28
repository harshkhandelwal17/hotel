/**
 * OTA Multi-Channel Email & Voucher Parser Service
 * Accurately extracts booking metadata from confirmation emails of:
 * - MakeMyTrip (IngoMMT)
 * - Goibibo
 * - Booking.com
 * - Agoda
 * - Airbnb
 * - Generic OTA Fallback
 */

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r\n|\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/^[a-z]+,?\s*/i, '').trim(); // Remove day name like "Friday, "
  
  // Try native parse
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const parsed = new Date(year, month - 1, day);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try DD MMM YYYY (e.g. 28 Nov 2026 or 28 November 2026)
  const monthMap = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const dMmmYMatch = cleaned.match(/(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})/);
  if (dMmmYMatch) {
    const [, day, mStr, year] = dMmmYMatch;
    const mIndex = monthMap[mStr.slice(0, 3).toLowerCase()];
    if (mIndex !== undefined) {
      return new Date(year, mIndex, parseInt(day, 10));
    }
  }

  return null;
}

function cleanAmount(amtStr) {
  if (!amtStr) return 0;
  const num = amtStr.replace(/[^0-9.]/g, '');
  return parseFloat(num) || 0;
}

function cleanPhone(phoneStr) {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/[^0-9]/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10); // Return 10 digit Indian mobile
  }
  return digits;
}

/**
 * Detect OTA Channel from Subject, Sender, or Content
 */
function detectChannel(subject = '', sender = '', text = '') {
  const combined = `${subject} ${sender} ${text}`.toLowerCase();
  if (combined.includes('makemytrip') || combined.includes('ingommt') || combined.includes('mmt.com')) {
    return 'MakeMyTrip';
  }
  if (combined.includes('goibibo') || combined.includes('ibibo')) {
    return 'Goibibo';
  }
  if (combined.includes('booking.com')) {
    return 'Booking.com';
  }
  if (combined.includes('agoda')) {
    return 'Agoda';
  }
  if (combined.includes('airbnb')) {
    return 'Airbnb';
  }
  return 'OTA';
}

/**
 * Parse MakeMyTrip / IngoMMT Email
 */
function parseMakeMyTrip(text, subject) {
  const result = {
    channel: 'MakeMyTrip',
    bookingNumber: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkInDate: null,
    checkOutDate: null,
    roomCategory: 'Standard',
    totalAmount: 0,
    paidAmount: 0,
    paymentStatus: 'Prepaid'
  };

  // Booking Number / ID (usually starts with NH or standard digits)
  const bNumMatch = text.match(/(?:Booking\s*ID|Booking\s*Reference|MMT\s*ID|Reservation\s*ID|NH\s*Number)[:\s]*([A-Z0-9_-]{6,25})/i) ||
                    subject.match(/\b(NH[0-9]{8,16})\b/i) ||
                    text.match(/\b(NH[0-9]{8,16})\b/i);
  if (bNumMatch) result.bookingNumber = bNumMatch[1].trim();

  // Guest Name
  const nameMatch = text.match(/(?:Primary\s*Guest|Guest\s*Name|Lead\s*Guest|Booked\s*By|Guest)[:\s]*([A-Za-z\s.]{3,40})(?:\n|<|$)/i);
  if (nameMatch) result.guestName = nameMatch[1].replace(/\b(?:Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();

  // Mobile Number
  const phoneMatch = text.match(/(?:Contact\s*No|Phone|Mobile|Contact|Guest\s*Contact)[:\s]*([+0-9\s-]{10,18})/i) ||
                     text.match(/\b(?:(?:\+91|0)?[6-9]\d{9})\b/);
  if (phoneMatch) result.guestPhone = cleanPhone(phoneMatch[1] || phoneMatch[0]);

  // Check-In & Check-Out
  const checkInMatch = text.match(/Check-?in(?: Date)?[:\s]*([^\n\r|,]{6,30})/i);
  const checkOutMatch = text.match(/Check-?out(?: Date)?[:\s]*([^\n\r|,]{6,30})/i);
  if (checkInMatch) result.checkInDate = parseDate(checkInMatch[1]);
  if (checkOutMatch) result.checkOutDate = parseDate(checkOutMatch[1]);

  // Room Category
  const roomMatch = text.match(/(?:Room\s*Type|Room\s*Category|Category|Booked\s*Room)[:\s]*([^\n\r|,]{3,40})/i);
  if (roomMatch) result.roomCategory = roomMatch[1].trim();

  // Tariff / Amount
  const amtMatch = text.match(/(?:Total\s*Amount|Grand\s*Total|Total\s*Tariff|Booking\s*Amount|Amount\s*Paid|Net\s*Payable)[:\s]*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (amtMatch) result.totalAmount = cleanAmount(amtMatch[1]);

  // Payment Status
  if (/pay at hotel|collect at hotel|cash on arrival/i.test(text)) {
    result.paymentStatus = 'Pay at Hotel';
    result.paidAmount = 0;
  } else {
    result.paymentStatus = 'Prepaid Online';
    result.paidAmount = result.totalAmount;
  }

  return result;
}

/**
 * Parse Booking.com Email
 */
function parseBookingCom(text, subject) {
  const result = {
    channel: 'Booking.com',
    bookingNumber: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkInDate: null,
    checkOutDate: null,
    roomCategory: 'Standard',
    totalAmount: 0,
    paidAmount: 0,
    paymentStatus: 'Prepaid'
  };

  // Booking Number
  const bNumMatch = text.match(/(?:Booking\s*number|Reservation\s*number|Confirmation\s*number)[:\s]*([0-9]{8,15})/i) ||
                    subject.match(/\b([0-9]{9,12})\b/);
  if (bNumMatch) result.bookingNumber = bNumMatch[1].trim();

  // Guest Name
  const nameMatch = text.match(/(?:Guest\s*name|Guest)[:\s]*([A-Za-z\s.]{3,40})(?:\n|<|$)/i);
  if (nameMatch) result.guestName = nameMatch[1].replace(/\b(?:Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();

  // Phone
  const phoneMatch = text.match(/(?:Phone|Telephone|Mobile)[:\s]*([+0-9\s-]{10,18})/i) ||
                     text.match(/\b(?:(?:\+91|0)?[6-9]\d{9})\b/);
  if (phoneMatch) result.guestPhone = cleanPhone(phoneMatch[1] || phoneMatch[0]);

  // Dates
  const checkInMatch = text.match(/Check-?in[:\s]*([^\n\r|,]{6,30})/i);
  const checkOutMatch = text.match(/Check-?out[:\s]*([^\n\r|,]{6,30})/i);
  if (checkInMatch) result.checkInDate = parseDate(checkInMatch[1]);
  if (checkOutMatch) result.checkOutDate = parseDate(checkOutMatch[1]);

  // Room
  const roomMatch = text.match(/(?:Room\s*type|Accommodation)[:\s]*([^\n\r|,]{3,40})/i);
  if (roomMatch) result.roomCategory = roomMatch[1].trim();

  // Price
  const amtMatch = text.match(/(?:Price|Total\s*price|Commissionable\s*amount)[:\s]*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (amtMatch) result.totalAmount = cleanAmount(amtMatch[1]);

  if (/payments by booking\.com|virtual credit card|vcc/i.test(text)) {
    result.paymentStatus = 'Prepaid (Virtual Card)';
    result.paidAmount = result.totalAmount;
  } else if (/guest will pay at property|pay at hotel/i.test(text)) {
    result.paymentStatus = 'Pay at Hotel';
    result.paidAmount = 0;
  } else {
    result.paymentStatus = 'Prepaid';
    result.paidAmount = result.totalAmount;
  }

  return result;
}

/**
 * Generic Fallback Parser (For Agoda, Airbnb, Goibibo or custom OTAs)
 */
function parseGenericOta(text, subject, channel) {
  const result = {
    channel: channel || 'OTA',
    bookingNumber: '',
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkInDate: null,
    checkOutDate: null,
    roomCategory: 'Standard',
    totalAmount: 0,
    paidAmount: 0,
    paymentStatus: 'Prepaid'
  };

  // Find booking number
  const bMatch = text.match(/(?:Booking\s*ID|Reservation\s*ID|Confirmation\s*Code|Order\s*ID|Reference)[:\s]*([A-Z0-9_-]{6,25})/i) ||
                 subject.match(/#?([A-Z0-9]{8,16})/);
  if (bMatch) result.bookingNumber = bMatch[1].trim();

  // Find guest name
  const nameMatch = text.match(/(?:Guest|Name|Customer|Guest\s*Name)[:\s]*([A-Za-z\s.]{3,35})(?:\n|<|$)/i);
  if (nameMatch) result.guestName = nameMatch[1].replace(/\b(?:Mr|Mrs|Ms|Dr)\.?\s+/i, '').trim();

  // Find phone
  const phoneMatch = text.match(/\b(?:(?:\+91|0)?[6-9]\d{9})\b/) ||
                     text.match(/(?:Phone|Mobile|Contact)[:\s]*([+0-9\s-]{10,16})/i);
  if (phoneMatch) result.guestPhone = cleanPhone(phoneMatch[1] || phoneMatch[0]);

  // Find dates
  const checkInMatch = text.match(/Check-?in[:\s]*([^\n\r|,]{6,30})/i);
  const checkOutMatch = text.match(/Check-?out[:\s]*([^\n\r|,]{6,30})/i);
  if (checkInMatch) result.checkInDate = parseDate(checkInMatch[1]);
  if (checkOutMatch) result.checkOutDate = parseDate(checkOutMatch[1]);

  // Find room category
  const roomMatch = text.match(/(?:Room|Category|Unit|Apartment)[:\s]*([^\n\r|,]{3,40})/i);
  if (roomMatch) result.roomCategory = roomMatch[1].trim();

  // Find amount
  const amtMatch = text.match(/(?:Total|Amount|Price|Paid)[:\s]*(?:INR|Rs\.?|₹)?\s*([0-9,.]+)/i);
  if (amtMatch) result.totalAmount = cleanAmount(amtMatch[1]);
  result.paidAmount = result.totalAmount;

  return result;
}

/**
 * Master Parse Function
 */
function parseBookingEmail(rawBody, subject = '', sender = '') {
  const text = cleanText(rawBody);
  const channel = detectChannel(subject, sender, text);

  let parsed = null;
  if (channel === 'MakeMyTrip' || channel === 'Goibibo') {
    parsed = parseMakeMyTrip(text, subject);
    parsed.channel = channel;
  } else if (channel === 'Booking.com') {
    parsed = parseBookingCom(text, subject);
  } else {
    parsed = parseGenericOta(text, subject, channel);
  }

  // Fallback default dates if missing: Check-in = Today, Check-out = Tomorrow
  if (!parsed.checkInDate) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    parsed.checkInDate = today;
  }
  if (!parsed.checkOutDate) {
    const tomorrow = new Date(parsed.checkInDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);
    parsed.checkOutDate = tomorrow;
  }

  // Fallback booking number if still missing
  if (!parsed.bookingNumber) {
    parsed.bookingNumber = `${channel.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  }

  // Fallback guest name if still missing
  if (!parsed.guestName) {
    parsed.guestName = `${channel} Guest`;
  }

  return {
    ...parsed,
    rawSnippet: text.slice(0, 300)
  };
}

module.exports = {
  cleanText,
  parseDate,
  detectChannel,
  parseBookingEmail
};
