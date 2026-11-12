/**
 * Lightweight WhatsApp link generator for Guest welcome & folio messages
 * Clean, zero-dependency, 100% fail-safe
 */
export const getStayWhatsAppUrl = (stay, type = 'bill') => {
  if (!stay?.guest?.mobileNumber) return null;
  const rawPhone = stay.guest.mobileNumber.replace(/[^0-9]/g, '');
  if (!rawPhone) return null;
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const hotelName = stay.hostel?.name || 'Hotel';
  const guestName = stay.guest?.fullName || 'Guest';
  const roomNo = stay.room?.roomNumber || 'Assigned';

  if (type === 'welcome') {
    const msg = [
      `🏨 *Welcome to ${hotelName}!*`,
      `──────────────────────`,
      `Namaste *${guestName}* ji,`,
      `We are pleased to host you. Here are your reservation details:`,
      `🚪 *Room:* ${roomNo}`,
      stay.hostel?.contactNumber ? `📞 *Front Desk:* ${stay.hostel.contactNumber}` : '',
      `──────────────────────`,
      `Please contact reception for room service or any assistance. Wish you a wonderful stay! ✨`
    ].filter(Boolean).join('\n');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }

  // Default: Bill & folio summary
  const total = Number(stay.totalAmount || 0);
  const paid = Number(stay.paidAmount || 0);
  const balance = Math.max(0, total - paid);

  const msg = [
    `🏨 *${hotelName}* - Stay & Folio Summary`,
    `──────────────────────`,
    `👤 *Guest:* ${guestName}`,
    `🚪 *Room:* ${roomNo}`,
    `💰 *Total Bill:* ₹${total.toLocaleString('en-IN')}`,
    `✅ *Paid:* ₹${paid.toLocaleString('en-IN')}`,
    balance > 0 ? `⚠️ *Balance Due:* ₹${balance.toLocaleString('en-IN')}` : `🎉 *Status:* Fully Paid & Settled`,
    `──────────────────────`,
    `Thank you for staying with us! ✨`
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
};

/** Alias for backward compatibility */
export const getInvoiceWhatsAppUrl = (stay, payments = [], options = {}) => {
  return getStayWhatsAppUrl(stay, 'bill');
};

export const getWelcomeWhatsAppUrl = (stay) => {
  return getStayWhatsAppUrl(stay, 'welcome');
};
