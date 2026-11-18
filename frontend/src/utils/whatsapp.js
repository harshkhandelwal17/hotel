import { format } from 'date-fns';

/**
 * Lightweight WhatsApp link generator for Guest welcome & folio messages
 * Clean, zero-dependency, 100% fail-safe
 */
export const getStayWhatsAppUrl = (stay, type = 'bill', options = {}) => {
  if (!stay?.guest?.mobileNumber) return null;
  const rawPhone = stay.guest.mobileNumber.replace(/[^0-9]/g, '');
  if (!rawPhone) return null;
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
  const hostel = stay.hostel || {};
  const hotelName = hostel.name || 'Hotel';
  const guest = stay.guest || {};
  const guestName = guest.fullName || 'Guest';
  const roomNo = stay.room?.roomNumber || 'Assigned';

  if (type === 'welcome') {
    const msg = [
      `🏨 *Welcome to ${hotelName}!*`,
      `──────────────────────`,
      `Namaste *${guestName}* ji,`,
      `We are pleased to host you. Here are your reservation details:`,
      `🚪 *Room:* ${roomNo}`,
      hostel.contactNumber ? `📞 *Front Desk:* ${hostel.contactNumber}` : '',
      `──────────────────────`,
      `Please contact reception for room service or any assistance. Wish you a wonderful stay! ✨`
    ].filter(Boolean).join('\n');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }

  // Default: Bill & folio summary
  const total = Number(stay.totalAmount || 0);
  const paid = Number(stay.paidAmount || 0);
  const balance = Math.max(0, total - paid);

  const gstApplied = options.gstEnabled !== undefined 
    ? Boolean(options.gstEnabled) 
    : Boolean(stay.gstApplied);

  const gstRate = Number(options.gstRate ?? stay.gstRate ?? hostel.gstRate ?? 0);
  const companyName = (options.guestCompany || stay.companyName || guest.companyName || '').trim();
  const gstin = (options.guestGstin || stay.gstin || guest.gstin || '').trim().toUpperCase();

  // Invoice Number
  const prefix = hostel.invoicePrefix || 'INV';
  const stayDate = stay.createdAt ? new Date(stay.createdAt) : new Date();
  const dateStr = format(stayDate, 'yyyyMMdd');
  const roomStr = stay.room?.roomNumber || 'RM';
  const idStr = stay._id ? stay._id.toString().slice(-4).toUpperCase() : '001';
  const invoiceNumber = options.invoiceNumber || `${prefix}-${dateStr}-${roomStr}-${idStr}`;

  let taxBreakdown = [];
  if (gstApplied && gstRate > 0) {
    const isInc = stay.gstType !== 'exclusive';
    let taxable = total;
    let tax = Number(stay.taxAmount) || 0;
    if (isInc) {
      taxable = Math.round((total / (1 + gstRate / 100)) * 100) / 100;
      tax = Math.round((total - taxable) * 100) / 100;
    } else {
      tax = Math.round((taxable * (gstRate / 100)) * 100) / 100;
    }

    const hotelGstin = (hostel.gstin || '').trim().toUpperCase();
    const isInterState = Boolean(hotelGstin && gstin && hotelGstin.slice(0, 2) !== gstin.slice(0, 2));

    taxBreakdown = [
      `📑 *Taxable Value:* ₹${taxable.toLocaleString('en-IN')}`,
      isInterState 
        ? `📊 *IGST (${gstRate}%):* ₹${tax.toLocaleString('en-IN')}`
        : `📊 *GST (${gstRate}%):* ₹${tax.toLocaleString('en-IN')} (CGST ${(gstRate/2).toFixed(1)}% + SGST ${(gstRate/2).toFixed(1)}%)`
    ];
  }

  const msg = [
    `🏨 *${hotelName}* - ${gstApplied ? 'Tax Invoice' : 'Stay & Folio Summary'}`,
    `──────────────────────`,
    `🧾 *Invoice #:* ${invoiceNumber}`,
    `👤 *Guest:* ${guestName}`,
    companyName ? `🏢 *Company:* ${companyName}` : '',
    gstin ? `🏛️ *GSTIN:* ${gstin}` : '',
    `🚪 *Room:* ${roomNo}`,
    ...taxBreakdown,
    `💰 *Total Amount:* ₹${total.toLocaleString('en-IN')}`,
    `✅ *Paid / Advance:* ₹${paid.toLocaleString('en-IN')}`,
    balance > 0 ? `⚠️ *Balance Due:* ₹${balance.toLocaleString('en-IN')}` : `🎉 *Status:* Fully Paid & Settled`,
    `──────────────────────`,
    `Thank you for staying with us! ✨`
  ].filter(Boolean).join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
};

/** Alias for backward compatibility */
export const getInvoiceWhatsAppUrl = (stay, payments = [], options = {}) => {
  return getStayWhatsAppUrl(stay, 'bill');
};

export const getWelcomeWhatsAppUrl = (stay) => {
  return getStayWhatsAppUrl(stay, 'welcome');
};
