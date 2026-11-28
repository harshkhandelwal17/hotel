/**
 * RFC 5545 iCalendar (.ics) Generator & Parser for OTAs
 * Compatible with MakeMyTrip IngoMMT, Booking.com, Agoda, Airbnb, Google Calendar
 */

function formatDateToIcal(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatDateTimeToIcal(dateObj) {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate standard RFC 5545 .ics calendar content
 */
function generateIcalFeed(hostel, stays = [], roomCategory = null) {
  const hostelName = (hostel.name || 'Hotel Property').replace(/[\\;,]/g, ' ');
  const nowIcal = formatDateTimeToIcal(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hotel PMS//OTA iCal Engine 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${hostelName}${roomCategory ? ' - ' + roomCategory : ''}`,
    'X-WR-TIMEZONE:Asia/Kolkata'
  ];

  stays.forEach(stay => {
    // Only include non-cancelled reservations
    if (stay.status === 'Cancelled') return;

    if (roomCategory && stay.room?.category && stay.room.category !== roomCategory) {
      return;
    }

    const checkInStr = formatDateToIcal(stay.checkInDate || stay.createdAt);
    // In iCal RFC 5545, VALUE=DATE DTEND is exclusive, which exactly represents hotel checkout day
    const checkOutStr = formatDateToIcal(stay.actualCheckOutDate || stay.expectedCheckOutDate || stay.checkInDate);

    const roomNum = stay.room?.roomNumber || 'Room';
    const source = stay.bookingSource || 'Direct';
    const ref = stay.bookingNumber || stay._id.toString();
    const guestName = stay.guest?.fullName ? ` - ${stay.guest.fullName}` : '';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:stay-${stay._id}@hotelpms.com`);
    lines.push(`DTSTAMP:${nowIcal}`);
    lines.push(`DTSTART;VALUE=DATE:${checkInStr}`);
    lines.push(`DTEND;VALUE=DATE:${checkOutStr}`);
    lines.push(`SUMMARY:Reserved: ${roomNum} (${source})${guestName}`);
    lines.push(`DESCRIPTION:Hotel: ${hostelName} | Room: ${roomNum} | Booking Ref: ${ref} | Source: ${source}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Parse an incoming .ics calendar string from an OTA
 */
function parseIcalFeed(icsString) {
  if (!icsString) return [];
  const events = [];
  const eventBlocks = icsString.split(/BEGIN:VEVENT/i).slice(1);

  eventBlocks.forEach(block => {
    const uidMatch = block.match(/UID:(.+)/i);
    const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:([0-9TZ]+)/i);
    const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:([0-9TZ]+)/i);
    const summaryMatch = block.match(/SUMMARY:(.+)/i);
    const descMatch = block.match(/DESCRIPTION:(.+)/i);

    const parseIcalDate = (str) => {
      if (!str) return null;
      const s = str.trim();
      if (s.length >= 8) {
        const y = parseInt(s.slice(0, 4), 10);
        const m = parseInt(s.slice(4, 6), 10) - 1;
        const d = parseInt(s.slice(6, 8), 10);
        return new Date(y, m, d);
      }
      return null;
    };

    if (startMatch && endMatch) {
      events.push({
        uid: uidMatch ? uidMatch[1].trim() : `ext-${Date.now()}`,
        startDate: parseIcalDate(startMatch[1]),
        endDate: parseIcalDate(endMatch[1]),
        summary: summaryMatch ? summaryMatch[1].trim() : 'OTA Booking',
        description: descMatch ? descMatch[1].trim() : ''
      });
    }
  });

  return events;
}

module.exports = {
  formatDateToIcal,
  formatDateTimeToIcal,
  generateIcalFeed,
  parseIcalFeed
};
