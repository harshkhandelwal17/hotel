import { format } from 'date-fns';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Standard 2-digit Indian GST State Codes mapping
 */
export const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh'
};

/**
 * Converts numbers into Indian Currency Words (e.g. 4500 -> "Rupees Four Thousand Five Hundred Only")
 */
export const numberToWordsINR = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return 'Rupees Zero Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const twoDigits = (num) => {
    if (num < 20) return a[num];
    const digit = num % 10;
    return b[Math.floor(num / 10)] + (digit ? ' ' + a[digit] : '');
  };

  let words = '';
  let crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = Math.floor(remainder / 100);
  let rest = remainder % 100;

  if (crore > 0) words += twoDigits(crore) + ' Crore ';
  if (lakh > 0) words += twoDigits(lakh) + ' Lakh ';
  if (thousand > 0) words += twoDigits(thousand) + ' Thousand ';
  if (hundred > 0) words += twoDigits(hundred) + ' Hundred ';
  if (rest > 0) words += (words ? 'and ' : '') + twoDigits(rest) + ' ';

  return 'Rupees ' + words.trim() + ' Only';
};

/**
 * Calculates itemized charges, taxes, and balances based on GST/Non-GST settings
 */
export const calculateInvoiceData = (stay, payments = [], options = {}) => {
  const hostel = stay.hostel || {};
  const guest = stay.guest || {};
  const room = stay.room || {};

  // Check GST configuration
  const gstEnabled = options.gstEnabled !== undefined 
    ? Boolean(options.gstEnabled) 
    : Boolean(stay.gstApplied);

  const gstRate = Number(options.gstRate ?? stay.gstRate ?? hostel.gstRate ?? 12);
  // If stay was already booked with GST, totalAmount already contains the tax, so back-calculate (taxInclusive = true)
  const taxInclusive = options.taxInclusive !== undefined 
    ? Boolean(options.taxInclusive) 
    : (stay.gstApplied ? true : (hostel.taxInclusive !== undefined ? Boolean(hostel.taxInclusive) : true));

  // Dates & Duration
  const checkIn = stay.checkInDate ? new Date(stay.checkInDate) : new Date();
  const outDate = stay.actualCheckOutDate || stay.expectedCheckOutDate || new Date();
  const durationMs = Math.max(0, new Date(outDate) - new Date(checkIn));
  const calcNights = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
  const nights = Math.max(1, calcNights);

  // Inter-State (IGST) vs Intra-State (CGST + SGST) detection
  const guestCompany = (options.guestCompany || stay.companyName || guest.companyName || '').trim();
  const guestGstin = (options.guestGstin || stay.gstin || guest.gstin || '').trim().toUpperCase();
  const billingAddress = (options.billingAddress || stay.billingAddress || guest.address || '').trim();

  const hotelGstin = (hostel.gstin || '').trim().toUpperCase();
  const hotelStateCode = hostel.stateCode || (hotelGstin.length >= 2 ? hotelGstin.slice(0, 2) : '');
  const guestStateCode = guestGstin.length >= 2 ? guestGstin.slice(0, 2) : '';
  const isInterState = Boolean(hotelStateCode && guestStateCode && hotelStateCode !== guestStateCode);

  const charges = Array.isArray(stay.charges) ? stay.charges : [];
  const chargesTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const totalBilled = Number(stay.totalAmount) || 0;
  const roomRent = Math.max(0, totalBilled - chargesTotal);
  const perNightRent = Math.round((roomRent / nights) * 100) / 100;

  const discountAmount = Number(options.discountAmount ?? stay.discountAmount ?? 0);
  const paymentsTotal = Array.isArray(payments) && payments.length > 0
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : 0;
  const totalPaid = Math.max(Number(stay.paidAmount) || 0, paymentsTotal);

  let taxableAmount = totalBilled;
  let totalGst = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstEnabled && gstRate > 0) {
    if (taxInclusive) {
      // Room tariff includes GST: Back-calculate base taxable amount
      taxableAmount = Math.round((totalBilled / (1 + gstRate / 100)) * 100) / 100;
      totalGst = Math.round((totalBilled - taxableAmount) * 100) / 100;
    } else {
      // GST is added on top of tariff
      taxableAmount = totalBilled;
      totalGst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
    }

    if (isInterState) {
      igst = totalGst;
      cgst = 0;
      sgst = 0;
    } else {
      cgst = Math.round((totalGst / 2) * 100) / 100;
      sgst = Math.round((totalGst - cgst) * 100) / 100;
      igst = 0;
    }
  }

  const baseGross = taxInclusive || !gstEnabled ? totalBilled : (taxableAmount + totalGst);
  const grandTotalExact = Math.max(0, baseGross - discountAmount);

  // Standard Indian GST Round-Off (to nearest Rupee)
  const grandTotal = Math.round(grandTotalExact);
  const roundOff = Math.round((grandTotal - grandTotalExact) * 100) / 100;

  // Effective Total Paid & Real Balance Due
  const effectivePaid = options.markAllPaid ? grandTotal : totalPaid;
  const balance = Math.max(0, Math.round((grandTotal - effectivePaid) * 100) / 100);

  // Auto-generate invoice number if not explicitly provided
  const prefix = hostel.invoicePrefix || 'INV';
  const stayDate = stay.createdAt ? new Date(stay.createdAt) : new Date();
  const dateStr = format(stayDate, 'yyyyMMdd');
  const roomStr = room.roomNumber || 'RM';
  const idStr = stay._id ? stay._id.toString().slice(-4).toUpperCase() : '001';
  const invoiceNumber = options.invoiceNumber || `${prefix}-${dateStr}-${roomStr}-${idStr}`;

  // Co-guests array
  const coGuests = Array.isArray(stay.coGuests) ? stay.coGuests.filter(Boolean) : [];

  return {
    hostel,
    guest,
    room,
    charges,
    roomRent,
    perNightRent,
    nights,
    chargesTotal,
    discountAmount,
    totalBilled,
    totalPaid: effectivePaid,
    balance,
    gstEnabled,
    gstRate,
    taxInclusive,
    isInterState,
    taxableAmount,
    totalGst,
    taxAmount: totalGst,
    cgst,
    sgst,
    igst,
    grandTotalExact,
    grandTotal,
    roundOff,
    invoiceNumber,
    guestGstin,
    guestCompany,
    billingAddress,
    coGuests,
    hsnSacCode: hostel.hsnSacCode || '996311'
  };
};

/**
 * Creates a prefilled WhatsApp link to share the bill with the guest
 */
export const getInvoiceWhatsAppUrl = (stay, payments = [], options = {}) => {
  const inv = calculateInvoiceData(stay, payments, options);
  const rawPhone = (inv.guest.mobileNumber || '').replace(/[^0-9]/g, '');
  if (!rawPhone) return null;
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  // Invoice Date defaults to the guest's checkout date (or options.invoiceDate)
  const defaultInvoiceDate = stay.actualCheckOutDate 
    ? new Date(stay.actualCheckOutDate) 
    : (stay.expectedCheckOutDate ? new Date(stay.expectedCheckOutDate) : new Date());
  const effectiveInvoiceDate = options.invoiceDate
    ? (options.invoiceDate instanceof Date
        ? options.invoiceDate
        : (typeof options.invoiceDate === 'string' && options.invoiceDate.length === 10
            ? new Date(`${options.invoiceDate}T12:00:00`)
            : new Date(options.invoiceDate)))
    : defaultInvoiceDate;

  const msg = [
    `🏨 *${inv.hostel.name || 'Hotel'}* - Invoice & Receipt`,
    `──────────────────────`,
    `👤 *Guest Name:* ${inv.guest.fullName || 'Guest'}`,
    inv.guestCompany ? `🏢 *Company:* ${inv.guestCompany}` : '',
    inv.guestGstin ? `🏛️ *Company GSTIN:* ${inv.guestGstin}` : '',
    `🚪 *Room Number:* ${inv.room.roomNumber || 'N/A'}`,
    `🧾 *Invoice No:* ${inv.invoiceNumber}`,
    `📅 *Invoice Date:* ${format(effectiveInvoiceDate, 'dd MMM yyyy')}`,
    `📅 *Check-In:* ${format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a')}`,
    `📅 *Check-Out:* ${format(new Date(stay.actualCheckOutDate || stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}`,
    `⏳ *Stay Duration:* ${inv.nights} Night${inv.nights > 1 ? 's' : ''}`,
    `──────────────────────`,
    `💰 *Total Bill:* ₹${inv.grandTotal.toLocaleString('en-IN')}`,
    `✅ *Paid Amount:* ₹${inv.totalPaid.toLocaleString('en-IN')}`,
    inv.balance > 0 
      ? `⚠️ *Balance Due:* ₹${inv.balance.toLocaleString('en-IN')}` 
      : `🎉 *Status:* Fully Paid & Settled`,
    inv.balance > 0 && inv.hostel.upiId ? `📲 *Pay Online via UPI:* ${inv.hostel.upiId}` : '',
    `──────────────────────`,
    inv.hostel.gstEnabled && inv.hostel.gstin ? `🏛️ *Hotel GSTIN:* ${inv.hostel.gstin}` : '',
    `Thank you for staying with us! Visit again. ✨`
  ].filter(Boolean).join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
};

/**
 * Builds the centralized, print-ready HTML bill template
 */
export const generateInvoiceHtml = (stay, payments = [], options = {}) => {
  const inv = calculateInvoiceData(stay, payments, options);
  const waUrl = getInvoiceWhatsAppUrl(stay, payments, options);
  const outDate = stay.actualCheckOutDate || stay.expectedCheckOutDate || new Date();
  const checkInFormatted = format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a');
  const checkOutFormatted = format(new Date(outDate), 'dd MMM yyyy, hh:mm a');

  // Invoice Date defaults to the guest's checkout date (or options.invoiceDate)
  const defaultInvoiceDate = stay.actualCheckOutDate 
    ? new Date(stay.actualCheckOutDate) 
    : (stay.expectedCheckOutDate ? new Date(stay.expectedCheckOutDate) : new Date());
  const effectiveInvoiceDate = options.invoiceDate
    ? (options.invoiceDate instanceof Date
        ? options.invoiceDate
        : (typeof options.invoiceDate === 'string' && options.invoiceDate.length === 10
            ? new Date(`${options.invoiceDate}T12:00:00`)
            : new Date(options.invoiceDate)))
    : defaultInvoiceDate;
  const invoiceDateFormatted = format(effectiveInvoiceDate, 'dd MMM yyyy, hh:mm a');

  // SAC Codes
  const roomSac = inv.hsnSacCode || '996311';

  // Itemized Charge Rows
  const chargeRows = inv.charges.map((c, i) => {
    const sac = c.category === 'Food' || c.category === 'Beverage' ? '996331' : (c.category === 'Laundry' ? '999712' : '996311');
    return `
      <tr>
        <td class="c">${i + 2}</td>
        <td>
          <b>${esc(c.description)}</b>
          <div class="muted small">${esc(c.category)} ${c.quantity > 1 ? ` &bull; Qty: ${c.quantity}` : ''}</div>
        </td>
        <td class="c font-mono">${inv.gstEnabled ? sac : '-'}</td>
        <td class="c">${c.quantity || 1}</td>
        <td class="r font-mono">₹${Number(c.amount).toLocaleString('en-IN')}</td>
        <td class="r font-mono">₹${Number(c.amount).toLocaleString('en-IN')}</td>
      </tr>
    `;
  }).join('');

  // Payment Records (Auto-fallback to advance check-in payment if no separate payments recorded)
  const effectivePayments = payments.length > 0
    ? payments
    : (inv.totalPaid > 0 ? [{
        paymentDate: stay.createdAt || stay.checkInDate || new Date(),
        paymentMethod: stay.paymentMethod || 'Advance Payment',
        notes: 'Advance Paid at Check-in',
        amount: inv.totalPaid
      }] : []);

  const paymentRows = effectivePayments.map(p => `
    <tr>
      <td>${format(new Date(p.paymentDate || p.createdAt || new Date()), 'dd MMM yyyy, hh:mm a')}</td>
      <td><span class="badge">${esc(p.paymentMethod || 'Payment')}</span></td>
      <td class="muted">${esc(p.notes || '-')}</td>
      <td class="r font-mono font-bold">₹${Number(p.amount).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  // Dynamic UPI Payment QR Code (when balance > 0 and hostel upiId exists)
  let qrCodeHtml = '';
  if (inv.balance > 0 && inv.hostel.upiId) {
    const payeeName = inv.hostel.upiPayeeName || inv.hostel.name || 'Hotel';
    const upiUri = `upi://pay?pa=${encodeURIComponent(inv.hostel.upiId)}&pn=${encodeURIComponent(payeeName)}&am=${inv.balance}&cu=INR&tn=${encodeURIComponent('Bill ' + inv.invoiceNumber)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=2&data=${encodeURIComponent(upiUri)}`;

    qrCodeHtml = `
      <div class="upi-box">
        <img src="${qrUrl}" alt="Scan to Pay UPI QR" width="105" height="105" />
        <div class="upi-info">
          <div class="upi-title">SCAN & PAY BALANCE</div>
          <div class="upi-vpa">${esc(inv.hostel.upiId)}</div>
          <div class="upi-amount">Due: ₹${inv.balance.toLocaleString('en-IN')}</div>
          <div class="muted small">Supports GPay, PhonePe, Paytm & UPI</div>
        </div>
      </div>
    `;
  }

  // Terms and conditions
  const termsText = inv.hostel.billTerms || '1. Check-out time is 11:00 AM.\n2. Valid Govt ID proof required at check-in.\n3. Goods & services once billed are non-refundable.\n4. Disputes subject to local jurisdiction only.';
  const termsHtml = termsText.split('\n').filter(Boolean).map(t => `<li>${esc(t.replace(/^[0-9]+[.)]\s*/, ''))}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(inv.invoiceNumber)} - ${esc(inv.guest.fullName || 'Guest Bill')}</title>
  <style>
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      font-size: 13px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #0f172a;
      padding: 12px 20px;
      border-radius: 12px;
      color: #ffffff;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-print { background: #3b82f6; color: #ffffff; }
    .btn-print:hover { background: #2563eb; }
    .btn-wa { background: #22c55e; color: #ffffff; }
    .btn-wa:hover { background: #16a34a; }
    .btn-close { background: #334155; color: #ffffff; }
    .btn-close:hover { background: #475569; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .hotel-name {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .hotel-meta { color: #64748b; font-size: 12px; line-height: 1.5; }
    .invoice-title-box { text-align: right; }
    .invoice-type {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .badge-gst {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .badge-nongst {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      font-size: 10px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .info-title {
      font-size: 10px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .info-val { font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 3px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th {
      background: #f1f5f9;
      color: #334155;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
    }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12.5px; vertical-align: middle; }
    .c { text-align: center; }
    .r { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }

    /* Summary & Totals */
    .summary-section {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      margin-top: 8px;
      margin-bottom: 24px;
    }
    .amount-words-box {
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 10px;
      padding: 14px 16px;
      height: fit-content;
    }
    .words-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
    .words-val { font-size: 12px; font-weight: 700; color: #0f172a; font-style: italic; }

    .totals-table { width: 100%; margin: 0; }
    .totals-table td { padding: 6px 8px; font-size: 13px; border: none; }
    .totals-table tr.total-row td {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-weight: 900;
      font-size: 16px;
      color: #0f172a;
      padding: 10px 8px;
    }
    .totals-table tr.paid-row td { color: #16a34a; font-weight: 700; }
    .totals-table tr.due-row td {
      font-weight: 900;
      font-size: 15px;
      color: ${inv.balance > 0 ? '#dc2626' : '#16a34a'};
      background: ${inv.balance > 0 ? '#fef2f2' : '#f0fdf4'};
      border-radius: 6px;
    }

    /* Watermark / Stamp */
    .status-stamp {
      display: inline-block;
      padding: 4px 14px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stamp-paid { background: #dcfce7; color: #15803d; border: 1.5px solid #86efac; }
    .stamp-due { background: #fee2e2; color: #b91c1c; border: 1.5px solid #fca5a5; }

    /* UPI QR Box */
    .upi-box {
      margin-top: 14px;
      display: flex;
      align-items: center;
      gap: 14px;
      background: #fdf4ff;
      border: 1px solid #f0abfc;
      border-radius: 12px;
      padding: 12px 16px;
    }
    .upi-info { flex: 1; }
    .upi-title { font-size: 11px; font-weight: 900; color: #701a75; letter-spacing: 0.5px; }
    .upi-vpa { font-size: 12px; font-weight: 800; font-family: monospace; color: #4a044e; margin: 2px 0; }
    .upi-amount { font-size: 13px; font-weight: 900; color: #dc2626; }

    /* Footer */
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 24px;
    }
    .terms-box ul { margin: 4px 0 0 16px; padding: 0; color: #64748b; font-size: 11px; }
    .terms-box li { margin-bottom: 3px; }
    .signatures {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-end;
      text-align: right;
    }
    .sign-line {
      width: 180px;
      border-top: 1px solid #94a3b8;
      margin-top: 48px;
      padding-top: 4px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      text-align: center;
    }
    .thankyou {
      text-align: center;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px dashed #e2e8f0;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      background: #f1f5f9;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
    }
    .muted { color: #64748b; }
    .small { font-size: 11px; }

    @page {
      size: A4 portrait;
      margin: 8mm 12mm;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        height: 100% !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        font-size: 11.5px !important;
        line-height: 1.4 !important;
        color: #0f172a !important;
      }
      .no-print-bar { display: none !important; }
      .invoice-card {
        box-sizing: border-box !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        min-height: 272mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .invoice-content-top {
        flex: 1 0 auto !important;
        display: block !important;
      }
      .invoice-footer-wrap {
        flex-shrink: 0 !important;
        margin-top: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .header {
        padding-bottom: 8px !important;
        margin-bottom: 10px !important;
        border-bottom: 2px solid #0f172a !important;
      }
      .hotel-name {
        font-size: 20px !important;
        margin-bottom: 2px !important;
      }
      .hotel-meta {
        font-size: 11px !important;
        line-height: 1.35 !important;
      }
      .invoice-type {
        font-size: 16px !important;
        margin-bottom: 2px !important;
      }
      .info-grid {
        padding: 8px 12px !important;
        margin-bottom: 10px !important;
        gap: 10px !important;
        background: #f8fafc !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 8px !important;
      }
      .info-title {
        font-size: 9.5px !important;
        margin-bottom: 2px !important;
      }
      .info-val {
        font-size: 12.5px !important;
      }
      table {
        margin-bottom: 10px !important;
        page-break-inside: auto !important;
      }
      thead {
        display: table-header-group !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      th {
        background-color: #0f172a !important;
        color: #ffffff !important;
        padding: 6px 8px !important;
        font-size: 10px !important;
        border: 1px solid #0f172a !important;
      }
      td {
        padding: 5px 8px !important;
        font-size: 11px !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .summary-section {
        margin-top: 6px !important;
        margin-bottom: 8px !important;
        padding-top: 4px !important;
        gap: 12px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .amount-words-box {
        padding: 6px 10px !important;
        margin-bottom: 6px !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
      }
      .words-label {
        font-size: 9px !important;
      }
      .words-val {
        font-size: 11px !important;
      }
      .totals-table td {
        padding: 3px 6px !important;
        font-size: 11px !important;
      }
      .totals-table tr.total-row td {
        font-size: 13.5px !important;
        padding: 5px 6px !important;
        border-top: 2px solid #0f172a !important;
        border-bottom: 2px solid #0f172a !important;
      }
      .footer {
        margin-top: 14px !important;
        padding-top: 10px !important;
        gap: 16px !important;
        border-top: 1.5px solid #0f172a !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .terms-box {
        font-size: 9.5px !important;
        line-height: 1.4 !important;
      }
      .terms-box ul {
        margin: 3px 0 0 14px !important;
      }
      .terms-box li {
        margin-bottom: 2px !important;
      }
      .signatures {
        text-align: right !important;
      }
      .sign-line {
        width: 170px !important;
        font-size: 11px !important;
        padding-top: 5px !important;
        margin-top: 24px !important;
        border-top: 1.5px solid #0f172a !important;
      }
      .thankyou {
        margin-top: 12px !important;
        padding-top: 8px !important;
        font-size: 11px !important;
        border-top: 1px dashed #cbd5e1 !important;
        color: #475569 !important;
      }
      .badge-gst, .badge-nongst, .status-stamp, .stamp-paid, .stamp-due {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Actions Bar (Hidden when printed) -->
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 13px;">
      📄 ${esc(inv.invoiceNumber)} &bull; ${esc(inv.guest.fullName)}
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">🖨️ Print / Save PDF</button>
      ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn btn-wa">💬 WhatsApp Bill</a>` : ''}
      <button onclick="window.close()" class="btn btn-close">✕ Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="invoice-content-top">
    
    <!-- HEADER -->
    <div class="header">
      <div>
        <h1 class="hotel-name">${esc(inv.hostel.name || 'HOTEL PROPERTY')}</h1>
        <div class="hotel-meta">
          ${inv.hostel.address ? `<div>${esc(inv.hostel.address)}</div>` : ''}
          <div>
            ${inv.hostel.contactNumber ? `Phone: <b>${esc(inv.hostel.contactNumber)}</b> &nbsp;|&nbsp; ` : ''}
            ${inv.hostel.email ? `Email: <b>${esc(inv.hostel.email)}</b>` : ''}
          </div>
          ${inv.gstEnabled && inv.hostel.gstin ? `<div style="margin-top: 3px;">GSTIN: <b class="font-mono" style="color: #0f172a;">${esc(inv.hostel.gstin)}</b> &nbsp;|&nbsp; State: <b>${esc(inv.hostel.state || 'India')}</b></div>` : ''}
        </div>
      </div>
      <div class="invoice-title-box">
        <div class="invoice-type">${inv.gstEnabled ? 'TAX INVOICE' : 'HOTEL RECEIPT'}</div>
        <div>
          ${inv.gstEnabled 
            ? '<span class="badge-gst">GST Registered Tax Invoice</span>' 
            : '<span class="badge-nongst">Bill of Supply / Non-GST</span>'}
        </div>
        <div class="font-mono font-bold" style="font-size: 13px; color: #0f172a; margin-top: 4px;">
          Invoice #: ${esc(inv.invoiceNumber)}
        </div>
        <div class="muted small">Date: ${invoiceDateFormatted}</div>
        <div style="margin-top: 8px;">
          <span class="status-stamp ${inv.balance <= 0 ? 'stamp-paid' : 'stamp-due'}">
            ${inv.balance <= 0 ? '✓ FULLY PAID' : `BALANCE DUE: ₹${inv.balance.toLocaleString('en-IN')}`}
          </span>
        </div>
      </div>
    </div>

    <!-- GUEST & STAY INFORMATION GRID -->
    <div class="info-grid">
      <div>
        <div class="info-title">Guest / Customer Details</div>
        <div class="info-val" style="font-size: 15px; font-weight: 800; color: #0f172a;">${esc(inv.guest.fullName || 'Valued Guest')}</div>
        <div class="muted">${esc(inv.guest.mobileNumber ? '+91 ' + inv.guest.mobileNumber : 'Contact: N/A')}</div>
        ${inv.guest.idProofType ? `<div class="muted small" style="margin-top: 2px;"><b>ID Proof:</b> ${esc(inv.guest.idProofType)}${inv.guest.idProofNumber ? ` &bull; <span class="font-mono font-bold">${esc(inv.guest.idProofNumber)}</span>` : ''}</div>` : ''}
        ${inv.guestCompany ? `<div style="margin-top: 4px;"><b>Company:</b> ${esc(inv.guestCompany)}</div>` : ''}
        ${inv.guestGstin ? `<div><b>Company GSTIN:</b> <span class="font-mono font-bold" style="color: #0f172a;">${esc(inv.guestGstin)}</span></div>` : ''}
        ${inv.billingAddress ? `<div class="muted small" style="margin-top: 2px;">${esc(inv.billingAddress)}</div>` : ''}
        ${inv.coGuests && inv.coGuests.length > 0 ? `
          <div class="muted small" style="margin-top: 4px; padding-top: 3px; border-top: 1px dashed #cbd5e1;">
            <b>Co-Guests:</b> ${esc(inv.coGuests.map(cg => cg.fullName).filter(Boolean).join(', '))}
          </div>
        ` : ''}
      </div>
      <div>
        <div class="info-title">Stay & Reservation</div>
        <div class="info-val">Room No: <b style="font-size: 16px; color: #0f172a;">${esc(inv.room.roomNumber || 'N/A')}</b> &bull; ${esc(inv.room.category || 'Standard Room')}</div>
        <div class="muted small"><b>Check-In:</b> ${checkInFormatted}</div>
        <div class="muted small"><b>Check-Out:</b> ${checkOutFormatted}</div>
        <div class="muted small"><b>Stay Duration:</b> ${inv.nights} Night${inv.nights > 1 ? 's' : ''} &bull; ${stay.occupants || 1} Occupant(s)</div>
        <div class="muted small"><b>Place of Supply:</b> ${esc(inv.hostel.state || 'India')} ${inv.isInterState ? '(Inter-State IGST)' : '(Intra-State)'}</div>
      </div>
    </div>

    <!-- ITEMISED BILL PARTICULARS -->
    <table>
      <thead>
        <tr>
          <th class="c" style="width: 40px;">#</th>
          <th>Particulars / Description</th>
          <th class="c font-mono" style="width: 90px;">SAC / HSN</th>
          <th class="c" style="width: 70px;">Duration / Qty</th>
          <th class="r font-mono" style="width: 100px;">Rate</th>
          <th class="r font-mono" style="width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">1</td>
          <td>
            <b>Room Accommodation Charges</b>
            <div class="muted small">Room ${esc(inv.room.roomNumber)} &bull; ${checkInFormatted.split(',')[0]} to ${checkOutFormatted.split(',')[0]} (${inv.nights} Night${inv.nights > 1 ? 's' : ''})</div>
          </td>
          <td class="c font-mono">${inv.gstEnabled ? roomSac : '-'}</td>
          <td class="c font-bold">${inv.nights} Night${inv.nights > 1 ? 's' : ''}</td>
          <td class="r font-mono">₹${Number(inv.perNightRent).toLocaleString('en-IN')}</td>
          <td class="r font-mono font-bold" style="color: #0f172a;">₹${Number(inv.roomRent).toLocaleString('en-IN')}</td>
        </tr>
        ${chargeRows}
      </tbody>
    </table>

    <!-- TOTALS & TAX BREAKDOWN -->
    <div class="summary-section">
      <div>
        <div class="amount-words-box">
          <div class="words-label">Amount in Words</div>
          <div class="words-val">${numberToWordsINR(inv.grandTotal)}</div>
        </div>
        ${qrCodeHtml}
      </div>

      <div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td class="muted">Sub Total:</td>
              <td class="r font-mono">₹${inv.totalBilled.toLocaleString('en-IN')}</td>
            </tr>

            ${inv.discountAmount > 0 ? `
              <tr>
                <td class="muted">Discount / Concession:</td>
                <td class="r font-mono" style="color: #047857;">-₹${inv.discountAmount.toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}

            ${inv.gstEnabled ? `
              <tr>
                <td class="muted small">Taxable Value:</td>
                <td class="r font-mono small">₹${inv.taxableAmount.toLocaleString('en-IN')}</td>
              </tr>
              ${inv.isInterState ? `
                <tr>
                  <td class="muted small">IGST (${inv.gstRate}%):</td>
                  <td class="r font-mono small">₹${inv.igst.toLocaleString('en-IN')}</td>
                </tr>
              ` : `
                <tr>
                  <td class="muted small">CGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono small">₹${inv.cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="muted small">SGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono small">₹${inv.sgst.toLocaleString('en-IN')}</td>
                </tr>
              `}
              ${inv.taxInclusive ? `
                <tr>
                  <td class="muted small">Total GST (${inv.gstRate}% Included):</td>
                  <td class="r font-mono small font-bold">₹${inv.totalGst.toLocaleString('en-IN')}</td>
                </tr>
              ` : ''}
            ` : `
              <tr>
                <td class="muted small" colspan="2" style="font-style: italic; color: #94a3b8;">
                  * Regular Commercial Folio / Non-GST Bill
                </td>
              </tr>
            `}

            ${inv.roundOff !== 0 ? `
              <tr>
                <td class="muted small">Round Off:</td>
                <td class="r font-mono small">${inv.roundOff > 0 ? `+₹${inv.roundOff}` : `-₹${Math.abs(inv.roundOff)}`}</td>
              </tr>
            ` : ''}

            <tr class="total-row">
              <td>Total Amount:</td>
              <td class="r font-mono">₹${inv.grandTotal.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="paid-row">
              <td>Paid / Advance:</td>
              <td class="r font-mono">₹${inv.totalPaid.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="due-row">
              <td>${inv.balance > 0 ? 'Balance Due:' : 'Net Balance:'}</td>
              <td class="r font-mono">₹${inv.balance.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PAYMENTS RECEIVED TABLE (OPTIONAL, OFF BY DEFAULT TO KEEP INVOICE ON 1 PAGE) -->
    ${options.showPaymentHistory && effectivePayments.length > 0 ? `
      <div style="margin-top: 8px; page-break-inside: avoid; break-inside: avoid;">
        <div class="info-title" style="margin-bottom: 4px;">Payments Received / Settlement Log</div>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Mode</th>
              <th>Notes / Ref</th>
              <th class="r">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows}
          </tbody>
        </table>
      </div>
    ` : ''}

    </div>

    <!-- FOOTER & SIGNATURES WRAPPER -->
    <div class="invoice-footer-wrap">
      <div class="footer">
        <div class="terms-box">
          <div class="info-title">Terms & Conditions</div>
          <ul>${termsHtml}</ul>
        </div>
        <div class="signatures">
          <div class="sign-line">Authorized Signatory<br/><small style="font-weight: normal; color: #94a3b8;">(${esc(inv.hostel.name || 'Hotel Front Desk')})</small></div>
        </div>
      </div>

      <div class="thankyou">
        ✨ Thank you for choosing ${esc(inv.hostel.name || 'us')}! Have a safe journey & visit again. ✨
      </div>
    </div>

  </div>

  <script>
    // Auto trigger print dialog after page renders
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 350);
    });
  </script>
</body>
</html>`;
};

/**
 * Opens a print window with the centralized, professional invoice
 */
export const printInvoice = (stay, payments = [], options = {}) => {
  const html = generateInvoiceHtml(stay, payments, options);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups for this site to print invoice');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
};

/**
 * Creates a prefilled WhatsApp welcome message for check-in
 */
export const getWelcomeWhatsAppUrl = (stay) => {
  const guest = stay.guest || {};
  const hostel = stay.hostel || {};
  const room = stay.room || {};
  const rawPhone = (guest.mobileNumber || '').replace(/[^0-9]/g, '');
  if (!rawPhone) return null;
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const msg = [
    `🏨 *Welcome to ${hostel.name || 'our Hotel'}!*`,
    `──────────────────────`,
    `Namaste *${guest.fullName || 'Guest'}* ji,`,
    `We are pleased to host you. Here are your reservation details:`,
    `🚪 *Room:* ${room.roomNumber || 'Assigned'}`,
    `📅 *Check-In:* ${stay.checkInDate ? format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a') : 'Today'}`,
    `📅 *Expected Check-Out:* ${stay.expectedCheckOutDate ? format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a') : 'Scheduled'}`,
    hostel.contactNumber ? `📞 *Front Desk / Reception:* ${hostel.contactNumber}` : '',
    `──────────────────────`,
    `Please contact reception for room service, housekeeping, or any queries. Wish you a wonderful stay! ✨`
  ].filter(Boolean).join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
};

/**
 * =========================================================================
 * 🏢 CONSOLIDATED / MERGED MULTI-ROOM CORPORATE INVOICE ENGINE
 * =========================================================================
 */

/**
 * Calculates itemized charges, multi-room ledger, and taxes for merged corporate folios
 */
export const calculateMergedInvoiceData = (stays = [], payments = [], options = {}) => {
  if (!Array.isArray(stays) || stays.length === 0) {
    throw new Error('At least one stay is required for corporate invoice calculation');
  }

  const leaderStay = stays.find(s => s.isGroupLeader) || stays.find(s => s.guest?.mobileNumber) || stays[0];
  const primaryStay = leaderStay;
  const hostel = options.hostel || primaryStay.hostel || {};
  const primaryGuest = primaryStay.guest || {};

  // Corporate Entity Details
  const guestCompany = (options.guestCompany || primaryStay.companyName || primaryGuest.companyName || '').trim();
  const guestGstin = (options.guestGstin || primaryStay.gstin || primaryGuest.gstin || '').trim().toUpperCase();
  const billingAddress = (options.billingAddress || primaryStay.billingAddress || primaryGuest.address || '').trim();
  const bookerName = (options.bookerName || primaryGuest.fullName || 'Corporate Representative').trim();
  const bookerPhone = (options.bookerPhone || primaryGuest.mobileNumber || '').trim();
  const poNumber = (options.poNumber || '').trim();

  // GST Configuration
  const staysAlreadyHaveGst = stays.some(s => s.gstApplied);
  const gstEnabled = options.gstEnabled !== undefined
    ? Boolean(options.gstEnabled)
    : (staysAlreadyHaveGst || Boolean(hostel.gstEnabled));

  const gstRate = Number(options.gstRate ?? primaryStay.gstRate ?? hostel.gstRate ?? 12);
  // Stays already booked with GST already include tax in totalAmount; always back-calculate (taxInclusive = true)
  // so GST is never doubled on top of an already-taxed tariff!
  const taxInclusive = options.taxInclusive !== undefined
    ? Boolean(options.taxInclusive)
    : (staysAlreadyHaveGst ? true : (hostel.taxInclusive !== undefined ? Boolean(hostel.taxInclusive) : true));

  // Inter-State (IGST) vs Intra-State (CGST + SGST) detection
  const hotelGstin = (hostel.gstin || '').trim().toUpperCase();
  const hotelStateCode = hostel.stateCode || (hotelGstin.length >= 2 ? hotelGstin.slice(0, 2) : '');
  const guestStateCode = guestGstin.length >= 2 ? guestGstin.slice(0, 2) : '';
  const isInterState = Boolean(hotelStateCode && guestStateCode && hotelStateCode !== guestStateCode);

  // Pre-calculate raw room rents across all stays to detect skewed/zero tariff allocations
  const rawRents = stays.map(s => {
    const charges = Array.isArray(s.charges) ? s.charges : [];
    const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const roomTot = Number(s.totalAmount) || 0;
    return Math.max(0, roomTot - chargesTotal);
  });
  const totalRentSum = rawRents.reduce((sum, r) => sum + r, 0);

  // If group tariff > 0, but any room is ₹0 (e.g. unconfigured room rate or lump sum dumped onto 1 room),
  // automatically equalize the tariff evenly across all rooms so no room displays ₹0.
  const hasZeroRentSkew = stays.length > 1 && totalRentSum > 0 && rawRents.some(r => r <= 0);
  const shouldEqualize = Boolean(hasZeroRentSkew || options.forceEqualSplit);

  const baseRentPerRoom = shouldEqualize ? Math.floor(totalRentSum / stays.length) : 0;
  const remRent = shouldEqualize ? (totalRentSum % stays.length) : 0;
  const rateDisplayMode = options.rateDisplayMode || 'detailed'; // 'detailed' | 'package'

  // Breakdown of each room stay
  const roomBreakdown = stays.map((s, idx) => {
    const room = s.room || {};
    const guest = s.guest || {};
    const charges = Array.isArray(s.charges) ? s.charges : [];
    const chargesTotal = charges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    
    // Equalized rent ensures fair per-room billing without confusing ₹0 lines
    const roomRent = shouldEqualize
      ? (idx === stays.length - 1 ? baseRentPerRoom + remRent : baseRentPerRoom)
      : rawRents[idx];

    const roomTotal = roomRent + chargesTotal;
    const paid = Number(s.paidAmount) || 0;
    const balance = Math.max(0, roomTotal - paid);

    const checkIn = s.checkInDate ? new Date(s.checkInDate) : new Date();
    const checkOut = s.actualCheckOutDate || s.expectedCheckOutDate ? new Date(s.actualCheckOutDate || s.expectedCheckOutDate) : new Date();
    const nights = Math.max(1, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));

    return {
      index: idx + 1,
      stayId: s._id,
      roomNumber: room.roomNumber || `Room ${idx + 1}`,
      category: room.category || 'Standard Room',
      guestName: guest.fullName || 'Occupant',
      guestPhone: guest.mobileNumber || '',
      occupants: s.occupants || 1,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      nights,
      roomRent,
      charges,
      chargesTotal,
      roomTotal,
      paid,
      balance,
      hsnSacCode: hostel.hsnSacCode || '996311'
    };
  });

  const totalRoomRent = roomBreakdown.reduce((sum, r) => sum + r.roomRent, 0);
  const totalCharges = roomBreakdown.reduce((sum, r) => sum + r.chargesTotal, 0);
  const totalBilled = roomBreakdown.reduce((sum, r) => sum + r.roomTotal, 0);

  // Combined Payments across all rooms (or custom payments list)
  const paymentsSum = Array.isArray(payments) && payments.length > 0 
    ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    : 0;
  const roomPaidSum = roomBreakdown.reduce((sum, r) => sum + r.paid, 0);
  const totalPaid = Math.max(paymentsSum, roomPaidSum);

  let taxableAmount = totalBilled;
  let totalGst = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstEnabled && gstRate > 0) {
    if (taxInclusive) {
      taxableAmount = Math.round((totalBilled / (1 + gstRate / 100)) * 100) / 100;
      totalGst = Math.round((totalBilled - taxableAmount) * 100) / 100;
    } else {
      taxableAmount = totalBilled;
      totalGst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
    }

    if (isInterState) {
      igst = totalGst;
      cgst = 0;
      sgst = 0;
    } else {
      cgst = Math.round((totalGst / 2) * 100) / 100;
      sgst = Math.round((totalGst - cgst) * 100) / 100;
      igst = 0;
    }
  }

  const discountAmount = Number(options.discountAmount || 0);
  const baseGross = taxInclusive || !gstEnabled ? totalBilled : (taxableAmount + totalGst);
  const grandTotalExact = Math.max(0, baseGross - discountAmount);

  // Standard Indian GST Round-Off (to nearest Rupee)
  const grandTotal = Math.round(grandTotalExact);
  const roundOff = Math.round((grandTotal - grandTotalExact) * 100) / 100;

  // Effective Total Paid & Real Balance Due
  const effectivePaid = options.markAllPaid ? grandTotal : totalPaid;
  const balance = Math.max(0, Math.round((grandTotal - effectivePaid) * 100) / 100);

  // Auto-generate Master Corporate Invoice Number
  const prefix = hostel.invoicePrefix || 'CORP';
  const dateStr = format(new Date(), 'yyyyMMdd');
  const roomCountStr = `${stays.length}RMS`;
  const randSuffix = primaryStay._id ? primaryStay._id.toString().slice(-4).toUpperCase() : '001';
  const invoiceNumber = options.invoiceNumber || `${prefix}-${dateStr}-${roomCountStr}-${randSuffix}`;

  return {
    hostel,
    primaryStay,
    guestCompany,
    guestGstin,
    billingAddress,
    bookerName,
    bookerPhone,
    poNumber,
    gstEnabled,
    gstRate,
    taxInclusive,
    isInterState,
    roomBreakdown,
    totalRoomRent,
    totalCharges,
    totalBilled,
    totalPaid: effectivePaid,
    balance,
    taxableAmount,
    totalGst,
    taxAmount: totalGst,
    cgst,
    sgst,
    igst,
    grandTotalExact,
    grandTotal,
    roundOff,
    invoiceNumber,
    rateDisplayMode,
    isEqualized: shouldEqualize,
    hsnSacCode: hostel.hsnSacCode || '996311'
  };
};

/**
 * Builds the centralized, print-ready HTML consolidated corporate bill
 */
export const generateMergedInvoiceHtml = (stays = [], payments = [], options = {}) => {
  const inv = calculateMergedInvoiceData(stays, payments, options);

  // Invoice Date defaults to latest checkout date among merged rooms (or options.invoiceDate)
  const latestCheckout = stays.reduce((latest, s) => {
    const d = new Date(s.actualCheckOutDate || s.expectedCheckOutDate || s.checkInDate || Date.now());
    return d > latest ? d : latest;
  }, new Date(0));
  const effectiveInvoiceDate = options.invoiceDate
    ? (options.invoiceDate instanceof Date
        ? options.invoiceDate
        : (typeof options.invoiceDate === 'string' && options.invoiceDate.length === 10
            ? new Date(`${options.invoiceDate}T12:00:00`)
            : new Date(options.invoiceDate)))
    : (latestCheckout.getTime() > 0 ? latestCheckout : new Date());
  const invoiceDateFormatted = format(effectiveInvoiceDate, 'dd MMM yyyy, hh:mm a');
  const isPackageMode = inv.rateDisplayMode === 'package';

  // Room Accommodation Table Rows
  const roomRows = inv.roomBreakdown.map((r, i) => {
    const checkInStr = format(r.checkInDate, 'dd MMM yyyy, hh:mm a');
    const checkOutStr = format(r.checkOutDate, 'dd MMM yyyy, hh:mm a');
    const sac = r.hsnSacCode || '996311';

    // Itemized charges snippet for this room if any
    const extraChargesSnippet = r.charges && r.charges.length > 0 ? `
      <div style="margin-top: 4px; padding-left: 8px; border-left: 2px solid #e2e8f0; font-size: 11px; color: #475569;">
        ${r.charges.map(c => `<div>&bull; ${esc(c.description)} (${esc(c.category)}): <b>₹${Number(c.amount).toLocaleString('en-IN')}</b></div>`).join('')}
      </div>
    ` : '';

    const tariffDisplay = isPackageMode
      ? '<span class="muted" style="font-size: 11px; font-weight: 600;">Package</span>'
      : `₹${Number(r.roomRent).toLocaleString('en-IN')}`;

    const totalDisplay = isPackageMode
      ? (r.chargesTotal > 0 ? `₹${Number(r.chargesTotal).toLocaleString('en-IN')}` : '<span class="muted" style="font-size: 11px; font-weight: 600;">Included</span>')
      : `₹${Number(r.roomTotal).toLocaleString('en-IN')}`;

    return `
      <tr>
        <td class="c">${i + 1}</td>
        <td>
          <b style="font-size: 13.5px; color: #0f172a;">Room ${esc(r.roomNumber)} &bull; ${esc(r.category)}</b>
          <div class="muted small">Guest: <b>${esc(r.guestName)}</b> ${r.guestPhone ? `(+91 ${esc(r.guestPhone)})` : ''} &bull; Occupants: ${r.occupants}</div>
          <div class="muted small">${checkInStr} to ${checkOutStr} (<b>${r.nights} Night${r.nights > 1 ? 's' : ''}</b>)</div>
          ${extraChargesSnippet}
        </td>
        <td class="c font-mono">${inv.gstEnabled ? sac : '-'}</td>
        <td class="c">${r.nights}</td>
        <td class="r font-mono">${tariffDisplay}</td>
        <td class="r font-mono">${r.chargesTotal > 0 ? `₹${Number(r.chargesTotal).toLocaleString('en-IN')}` : '-'}</td>
        <td class="r font-mono font-bold" style="color: #0f172a;">${totalDisplay}</td>
      </tr>
    `;
  }).join('');

  const packageSummaryRow = isPackageMode ? `
    <tr style="background: #f8fafc; border-top: 1.5px solid #cbd5e1;">
      <td class="c" style="font-weight: 800; color: #64748b;">&bull;</td>
      <td colspan="3" style="font-weight: 800; color: #0f172a; font-size: 12.5px;">
        Consolidated Room Accommodation Package (${inv.roomBreakdown.length} Rooms Total)
      </td>
      <td class="r font-mono font-bold" style="color: #0f172a;">₹${Number(inv.totalRoomRent).toLocaleString('en-IN')}</td>
      <td class="r font-mono font-bold" style="color: #64748b;">${inv.totalCharges > 0 ? `₹${Number(inv.totalCharges).toLocaleString('en-IN')}` : '-'}</td>
      <td class="r font-mono font-bold" style="color: #0f172a;">₹${Number(inv.totalBilled).toLocaleString('en-IN')}</td>
    </tr>
  ` : '';

  // Payment Records (Auto-fallback to individual room advance payments)
  let effectiveMergedPayments = payments.length > 0 ? [...payments] : [];
  if (effectiveMergedPayments.length === 0) {
    stays.forEach(s => {
      const p = Number(s.paidAmount || 0);
      if (p > 0) {
        effectiveMergedPayments.push({
          paymentDate: s.checkInDate || s.createdAt || new Date(),
          paymentMethod: s.paymentMode || 'Advance',
          notes: `Room ${s.room?.roomNumber || ''} Advance / Payment`,
          amount: p
        });
      }
    });

    if (options.markAllPaid && inv.balance === 0) {
      const alreadyListed = effectiveMergedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const diff = inv.grandTotal - alreadyListed;
      if (diff > 0) {
        effectiveMergedPayments.push({
          paymentDate: new Date(),
          paymentMethod: options.balancePaymentMethod || 'Corporate Settlement',
          notes: 'Consolidated balance settled at checkout',
          amount: diff
        });
      }
    }
  }

  const paymentRows = effectiveMergedPayments.map(p => `
    <tr>
      <td>${format(new Date(p.paymentDate || p.createdAt || new Date()), 'dd MMM yyyy, hh:mm a')}</td>
      <td><span class="badge">${esc(p.paymentMethod || 'Corporate Payment')}</span></td>
      <td class="muted">${esc(p.notes || p.reference || '-')}</td>
      <td class="r font-mono font-bold">₹${Number(p.amount).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  // Dynamic UPI Payment QR Code
  let qrCodeHtml = '';
  if (inv.balance > 0 && inv.hostel.upiId) {
    const payeeName = inv.hostel.upiPayeeName || inv.hostel.name || 'Hotel';
    const upiUri = `upi://pay?pa=${encodeURIComponent(inv.hostel.upiId)}&pn=${encodeURIComponent(payeeName)}&am=${inv.balance}&cu=INR&tn=${encodeURIComponent('Corp Bill ' + inv.invoiceNumber)}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=2&data=${encodeURIComponent(upiUri)}`;

    qrCodeHtml = `
      <div class="upi-box">
        <img src="${qrUrl}" alt="Scan to Pay UPI QR" width="105" height="105" />
        <div class="upi-info">
          <div class="upi-title">SCAN & PAY BALANCE</div>
          <div class="upi-vpa">${esc(inv.hostel.upiId)}</div>
          <div class="upi-amount">Due: ₹${inv.balance.toLocaleString('en-IN')}</div>
          <div class="muted small">Supports GPay, PhonePe, Paytm & NetBanking</div>
        </div>
      </div>
    `;
  }

  // Terms and conditions
  const termsText = inv.hostel.billTerms || '1. Official Consolidated Corporate Tax Invoice.\n2. Goods & hospitality services once billed are non-refundable.\n3. GST ITC eligibility requires accurate corporate GSTIN on filing.\n4. Disputes subject to local jurisdiction only.';
  const termsHtml = termsText.split('\n').filter(Boolean).map(t => `<li>${esc(t.replace(/^[0-9]+[.)]\s*/, ''))}</li>`).join('');

  // Build WhatsApp Message Payload
  const waMsg = [
    `🏨 *${inv.hostel.name || 'Hotel'}* - Consolidated Corporate Bill`,
    `──────────────────────`,
    inv.guestCompany ? `🏢 *Company:* ${inv.guestCompany}` : '',
    inv.guestGstin ? `🏛️ *Company GSTIN:* ${inv.guestGstin}` : '',
    `👤 *Booker / Rep:* ${inv.bookerName} ${inv.bookerPhone ? `(+91 ${inv.bookerPhone})` : ''}`,
    `🧾 *Invoice No:* ${inv.invoiceNumber}`,
    `🚪 *Consolidated Rooms (${inv.roomBreakdown.length} Rooms):*`,
    ...inv.roomBreakdown.map(r => `  • Room ${r.roomNumber} (${r.guestName}): ₹${r.roomTotal.toLocaleString('en-IN')}`),
    `──────────────────────`,
    `💰 *Grand Total:* ₹${inv.grandTotal.toLocaleString('en-IN')}`,
    `✅ *Paid / Advance:* ₹${inv.totalPaid.toLocaleString('en-IN')}`,
    inv.balance > 0 
      ? `⚠️ *Balance Due:* ₹${inv.balance.toLocaleString('en-IN')}` 
      : `🎉 *Status:* Fully Settled & Paid`,
    `──────────────────────`,
    inv.hostel.gstEnabled && inv.hostel.gstin ? `🏛️ *Hotel GSTIN:* ${inv.hostel.gstin}` : '',
    `Thank you for your corporate partnership! Have a safe journey. ✨`
  ].filter(Boolean).join('\n');

  const waUrl = inv.bookerPhone ? `https://wa.me/91${inv.bookerPhone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(waMsg)}` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(inv.invoiceNumber)} - ${esc(inv.guestCompany || inv.bookerName || 'Corporate Bill')}</title>
  <style>
    *, *:before, *:after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      line-height: 1.45;
      font-size: 13px;
    }
    .invoice-card {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
      position: relative;
    }
    .no-print-bar {
      max-width: 860px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      background: #0f172a;
      padding: 12px 20px;
      border-radius: 12px;
      color: #ffffff;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-print { background: #3b82f6; color: #ffffff; }
    .btn-print:hover { background: #2563eb; }
    .btn-wa { background: #22c55e; color: #ffffff; }
    .btn-wa:hover { background: #16a34a; }
    .btn-close { background: #334155; color: #ffffff; }
    .btn-close:hover { background: #475569; }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 22px;
      border-bottom: 2px solid #0f172a;
      margin-bottom: 22px;
    }
    .hotel-name {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }
    .hotel-meta {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .invoice-title-box {
      text-align: right;
    }
    .invoice-type {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.3px;
      margin-bottom: 3px;
    }
    .badge-gst {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-nongst {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-interstate {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 2px 8px;
      border-radius: 5px;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-left: 6px;
    }

    /* Status stamp */
    .status-stamp {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stamp-paid {
      background: #ecfdf5;
      color: #047857;
      border: 1.5px solid #a7f3d0;
    }
    .stamp-due {
      background: #fef2f2;
      color: #b91c1c;
      border: 1.5px solid #fecaca;
    }

    /* Grids */
    .info-grid {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 20px;
      padding: 16px 20px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin-bottom: 24px;
    }
    .info-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .info-val {
      font-weight: 700;
      color: #0f172a;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 12px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    th.r, td.r { text-align: right; }
    th.c, td.c { text-align: center; }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 12.5px;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }

    /* Summary */
    .summary-section {
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 24px;
      margin-top: 10px;
      padding-top: 14px;
    }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 8px;
      border-bottom: 1px dashed #e2e8f0;
      font-size: 12.5px;
    }
    .totals-table tr:nth-child(even) td { background: transparent; }
    .total-row td {
      font-size: 14.5px !important;
      font-weight: 900 !important;
      border-top: 2px solid #0f172a !important;
      border-bottom: 2px solid #0f172a !important;
      color: #0f172a;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
    }
    .paid-row td {
      color: #047857;
      font-weight: 800;
    }
    .due-row td {
      color: ${inv.balance > 0 ? '#b91c1c' : '#047857'} !important;
      font-weight: 900;
      font-size: 13.5px;
    }

    .amount-words-box {
      padding: 12px 14px;
      background: #f8fafc;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 14px;
    }
    .words-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .words-val {
      font-weight: 800;
      color: #0f172a;
      font-size: 12.5px;
    }

    /* UPI Box */
    .upi-box {
      display: flex;
      gap: 14px;
      align-items: center;
      padding: 12px 14px;
      border: 1.5px dashed #cbd5e1;
      border-radius: 10px;
      background: #ffffff;
    }
    .upi-info { line-height: 1.4; }
    .upi-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .upi-vpa {
      font-family: monospace;
      font-weight: 700;
      color: #1d4ed8;
      font-size: 12px;
    }
    .upi-amount {
      font-size: 12.5px;
      font-weight: 900;
      color: #b91c1c;
    }

    /* Footer */
    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
      align-items: flex-end;
    }
    .terms-box {
      font-size: 10.5px;
      color: #64748b;
    }
    .terms-box ul {
      margin: 4px 0 0 0;
      padding-left: 16px;
    }
    .terms-box li {
      margin-bottom: 2px;
    }
    .signatures {
      text-align: right;
    }
    .sign-line {
      display: inline-block;
      border-top: 1.5px solid #0f172a;
      width: 190px;
      padding-top: 6px;
      font-weight: 800;
      font-size: 11.5px;
      color: #0f172a;
    }
    .thankyou {
      text-align: center;
      margin-top: 24px;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748b;
    }

    .muted { color: #64748b; }
    .small { font-size: 11px; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .badge {
      display: inline-block;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    @page {
      size: A4 portrait;
      margin: 8mm 12mm;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        height: 100% !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        font-size: 11.5px !important;
        line-height: 1.4 !important;
        color: #0f172a !important;
      }
      .no-print-bar { display: none !important; }
      .invoice-card {
        box-sizing: border-box !important;
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
        min-height: 272mm !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .invoice-content-top {
        flex: 1 0 auto !important;
        display: block !important;
      }
      .invoice-footer-wrap {
        flex-shrink: 0 !important;
        margin-top: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .header {
        padding-bottom: 8px !important;
        margin-bottom: 10px !important;
        border-bottom: 2px solid #0f172a !important;
      }
      .hotel-name {
        font-size: 20px !important;
        margin-bottom: 2px !important;
      }
      .hotel-meta {
        font-size: 11px !important;
        line-height: 1.35 !important;
      }
      .invoice-type {
        font-size: 16px !important;
        margin-bottom: 2px !important;
      }
      .info-grid {
        padding: 8px 12px !important;
        margin-bottom: 10px !important;
        gap: 10px !important;
        background: #f8fafc !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 8px !important;
      }
      .info-title {
        font-size: 9.5px !important;
        margin-bottom: 2px !important;
      }
      .info-val {
        font-size: 12.5px !important;
      }
      table {
        margin-bottom: 10px !important;
        page-break-inside: auto !important;
      }
      thead {
        display: table-header-group !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      th {
        background-color: #0f172a !important;
        color: #ffffff !important;
        padding: 6px 8px !important;
        font-size: 10px !important;
        border: 1px solid #0f172a !important;
      }
      td {
        padding: 5px 8px !important;
        font-size: 11px !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      .summary-section {
        margin-top: 6px !important;
        margin-bottom: 8px !important;
        padding-top: 4px !important;
        gap: 12px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .amount-words-box {
        padding: 6px 10px !important;
        margin-bottom: 6px !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 8px !important;
      }
      .words-label {
        font-size: 9px !important;
      }
      .words-val {
        font-size: 11px !important;
      }
      .totals-table td {
        padding: 3px 6px !important;
        font-size: 11px !important;
      }
      .totals-table tr.total-row td {
        font-size: 13.5px !important;
        padding: 5px 6px !important;
        border-top: 2px solid #0f172a !important;
        border-bottom: 2px solid #0f172a !important;
      }
      .footer {
        margin-top: 14px !important;
        padding-top: 10px !important;
        gap: 16px !important;
        border-top: 1.5px solid #0f172a !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .terms-box {
        font-size: 9.5px !important;
        line-height: 1.4 !important;
      }
      .terms-box ul {
        margin: 3px 0 0 14px !important;
      }
      .terms-box li {
        margin-bottom: 2px !important;
      }
      .signatures {
        text-align: right !important;
      }
      .sign-line {
        width: 170px !important;
        font-size: 11px !important;
        padding-top: 5px !important;
        margin-top: 24px !important;
        border-top: 1.5px solid #0f172a !important;
      }
      .thankyou {
        margin-top: 12px !important;
        padding-top: 8px !important;
        font-size: 11px !important;
        border-top: 1px dashed #cbd5e1 !important;
        color: #475569 !important;
      }
      .badge-gst, .badge-nongst, .badge-interstate, .status-stamp, .stamp-paid, .stamp-due {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Actions Bar (Hidden when printed) -->
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 13px;">
      📄 ${esc(inv.invoiceNumber)} &bull; Consolidated Corporate Bill (${inv.roomBreakdown.length} Rooms)
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">🖨️ Print / Save PDF</button>
      ${waUrl ? `<a href="${waUrl}" target="_blank" class="btn btn-wa">💬 WhatsApp Corporate Bill</a>` : ''}
      <button onclick="window.close()" class="btn btn-close">✕ Close</button>
    </div>
  </div>

  <div class="invoice-card">
    <div class="invoice-content-top">
    
    <!-- HEADER -->
    <div class="header">
      <div>
        <h1 class="hotel-name">${esc(inv.hostel.name || 'HOTEL PROPERTY')}</h1>
        <div class="hotel-meta">
          ${inv.hostel.address ? `<div>${esc(inv.hostel.address)}</div>` : ''}
          <div>
            ${inv.hostel.contactNumber ? `Phone: <b>${esc(inv.hostel.contactNumber)}</b> &nbsp;|&nbsp; ` : ''}
            ${inv.hostel.email ? `Email: <b>${esc(inv.hostel.email)}</b>` : ''}
          </div>
          ${inv.gstEnabled && inv.hostel.gstin ? `<div style="margin-top: 3px;">GSTIN: <b class="font-mono" style="color: #0f172a;">${esc(inv.hostel.gstin)}</b> &nbsp;|&nbsp; State: <b>${esc(inv.hostel.state || 'India')}</b></div>` : ''}
        </div>
      </div>
      <div class="invoice-title-box">
        <div class="invoice-type">${inv.gstEnabled ? 'TAX INVOICE' : 'CONSOLIDATED FOLIO'}</div>
        <div>
          ${inv.gstEnabled 
            ? '<span class="badge-gst">Corporate GST Tax Invoice</span>' 
            : '<span class="badge-nongst">Corporate Bill of Supply</span>'}
          ${inv.isInterState ? '<span class="badge-interstate">Inter-State (IGST)</span>' : ''}
        </div>
        <div class="font-mono font-bold" style="font-size: 13px; color: #0f172a; margin-top: 4px;">
          Invoice #: ${esc(inv.invoiceNumber)}
        </div>
        <div class="muted small">Date: ${invoiceDateFormatted}</div>
        <div style="margin-top: 8px;">
          <span class="status-stamp ${inv.balance <= 0 ? 'stamp-paid' : 'stamp-due'}">
            ${inv.balance <= 0 ? '✓ FULLY PAID' : `BALANCE DUE: ₹${inv.balance.toLocaleString('en-IN')}`}
          </span>
        </div>
      </div>
    </div>

    <!-- CORPORATE BUYER & RESERVATION GRID -->
    <div class="info-grid">
      <div>
        <div class="info-title">Billed To (Corporate Entity)</div>
        <div class="info-val" style="font-size: 15px; font-weight: 800; color: #0f172a;">
          ${esc(inv.guestCompany || inv.bookerName || 'Corporate Client')}
        </div>
        ${inv.guestGstin ? `<div style="margin-top: 3px;"><b>Company GSTIN:</b> <span class="font-mono font-bold" style="color: #0f172a;">${esc(inv.guestGstin)}</span></div>` : '<div class="muted small">Corporate GSTIN: Not Provided</div>'}
        ${inv.billingAddress ? `<div class="muted small" style="margin-top: 2px;">${esc(inv.billingAddress)}</div>` : ''}
        <div class="muted small" style="margin-top: 4px;">
          Representative / Booker: <b>${esc(inv.bookerName)}</b> ${inv.bookerPhone ? `(+91 ${esc(inv.bookerPhone)})` : ''}
        </div>
      </div>
      <div>
        <div class="info-title">Consolidated Booking Info</div>
        <div class="info-val">Total Rooms: <b style="font-size: 16px; color: #0f172a;">${inv.roomBreakdown.length} Rooms</b></div>
        <div class="muted small" style="margin-top: 3px;">
          Rooms Included: <b>${inv.roomBreakdown.map(r => r.roomNumber).join(', ')}</b>
        </div>
        ${inv.poNumber ? `<div class="muted small"><b>PO / Booking Ref:</b> ${esc(inv.poNumber)}</div>` : ''}
        <div class="muted small"><b>Place of Supply:</b> ${esc(inv.hostel.state || 'India')} ${inv.isInterState ? '(Inter-State IGST)' : '(Intra-State CGST+SGST)'}</div>
      </div>
    </div>

    <!-- CONSOLIDATED ROOM BREAKDOWN PARTICULARS TABLE -->
    <table>
      <thead>
        <tr>
          <th class="c" style="width: 36px;">#</th>
          <th>Room & Occupant Particulars</th>
          <th class="c font-mono" style="width: 80px;">SAC</th>
          <th class="c" style="width: 48px;">Nights</th>
          <th class="r font-mono" style="width: 100px;">Tariff</th>
          <th class="r font-mono" style="width: 95px;">Add-ons</th>
          <th class="r font-mono" style="width: 110px;">Room Total</th>
        </tr>
      </thead>
      <tbody>
        ${roomRows}
        ${packageSummaryRow}
      </tbody>
    </table>

    <!-- TOTALS & TAX BREAKDOWN -->
    <div class="summary-section">
      <div>
        <div class="amount-words-box">
          <div class="words-label">Amount in Words</div>
          <div class="words-val">${numberToWordsINR(inv.grandTotal)}</div>
        </div>
        ${qrCodeHtml}
      </div>

      <div>
        <table class="totals-table">
          <tbody>
            <tr>
              <td class="muted">Total Room Tariff (${inv.roomBreakdown.length} Rooms):</td>
              <td class="r font-mono">₹${inv.totalRoomRent.toLocaleString('en-IN')}</td>
            </tr>
            ${inv.totalCharges > 0 ? `
              <tr>
                <td class="muted">Food, Services & Add-ons:</td>
                <td class="r font-mono">₹${inv.totalCharges.toLocaleString('en-IN')}</td>
              </tr>
            ` : ''}
            <tr>
              <td class="muted font-bold">Consolidated Gross Amount:</td>
              <td class="r font-mono font-bold">₹${inv.totalBilled.toLocaleString('en-IN')}</td>
            </tr>

            ${inv.gstEnabled && inv.gstRate > 0 ? `
              <tr>
                <td class="muted">Taxable Value:</td>
                <td class="r font-mono">₹${inv.taxableAmount.toLocaleString('en-IN')}</td>
              </tr>
              ${inv.isInterState ? `
                <tr>
                  <td class="muted">IGST (${inv.gstRate}%):</td>
                  <td class="r font-mono">₹${inv.igst.toLocaleString('en-IN')}</td>
                </tr>
              ` : `
                <tr>
                  <td class="muted">CGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono">₹${inv.cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="muted">SGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono">₹${inv.sgst.toLocaleString('en-IN')}</td>
                </tr>
              `}
            ` : `
              <tr>
                <td class="muted small" colspan="2" style="font-style: italic; color: #94a3b8;">
                  * Regular Commercial Folio / Non-GST Bill
                </td>
              </tr>
            `}

            ${inv.roundOff !== 0 ? `
              <tr>
                <td class="muted small">Round Off:</td>
                <td class="r font-mono small">${inv.roundOff > 0 ? `+₹${inv.roundOff}` : `-₹${Math.abs(inv.roundOff)}`}</td>
              </tr>
            ` : ''}

            <tr class="total-row">
              <td>Grand Total:</td>
              <td class="r font-mono">₹${inv.grandTotal.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="paid-row">
              <td>Total Paid / Advance:</td>
              <td class="r font-mono">₹${inv.totalPaid.toLocaleString('en-IN')}</td>
            </tr>
            <tr class="due-row">
              <td>${inv.balance > 0 ? 'Balance Due:' : 'Net Balance:'}</td>
              <td class="r font-mono">₹${inv.balance.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PAYMENTS RECEIVED TABLE (OPTIONAL, OFF BY DEFAULT TO KEEP INVOICE ON 1 PAGE) -->
    ${options.showPaymentHistory && effectiveMergedPayments.length > 0 ? `
      <div style="margin-top: 8px; page-break-inside: avoid; break-inside: avoid;">
        <div class="info-title" style="margin-bottom: 4px;">Consolidated Settlement & Payment History</div>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Mode</th>
              <th>Notes / Ref</th>
              <th class="r">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${paymentRows}
          </tbody>
        </table>
      </div>
    ` : ''}

    </div>

    <!-- FOOTER & SIGNATURES WRAPPER -->
    <div class="invoice-footer-wrap">
      <div class="footer">
        <div class="terms-box">
          <div class="info-title">Terms & Conditions</div>
          <ul>${termsHtml}</ul>
        </div>
        <div class="signatures">
          <div class="sign-line">Authorized Signatory<br/><small style="font-weight: normal; color: #94a3b8;">(${esc(inv.hostel.name || 'Hotel Front Desk')})</small></div>
        </div>
      </div>

      <div class="thankyou">
        ✨ Thank you for choosing ${esc(inv.hostel.name || 'us')} for your corporate hospitality! ✨
      </div>
    </div>

  </div>

  <script>
    // Auto trigger print dialog after page renders
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 350);
    });
  </script>
</body>
</html>`;
};

/**
 * Opens a print window with the consolidated multi-room corporate invoice
 */
export const printMergedInvoice = (stays = [], payments = [], options = {}) => {
  const html = generateMergedInvoiceHtml(stays, payments, options);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups for this site to print invoice');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
};

/**
 * Creates a prefilled WhatsApp link to share consolidated corporate bill
 */
export const getMergedInvoiceWhatsAppUrl = (stays = [], options = {}) => {
  const inv = calculateMergedInvoiceData(stays, options.payments || [], options);
  const rawPhone = (inv.bookerPhone || '').replace(/[^0-9]/g, '');
  if (!rawPhone) return null;
  const cleanPhone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;

  const msg = [
    `🏨 *${inv.hostel.name || 'Hotel'}* - Consolidated Corporate Bill`,
    `──────────────────────`,
    inv.guestCompany ? `🏢 *Company:* ${inv.guestCompany}` : '',
    inv.guestGstin ? `🏛️ *Company GSTIN:* ${inv.guestGstin}` : '',
    `👤 *Booker / Rep:* ${inv.bookerName}`,
    `🧾 *Invoice No:* ${inv.invoiceNumber}`,
    `🚪 *Consolidated Rooms (${inv.roomBreakdown.length} Rooms):*`,
    ...inv.roomBreakdown.map(r => `  • Room ${r.roomNumber} (${r.guestName}): ₹${r.roomTotal.toLocaleString('en-IN')}`),
    `──────────────────────`,
    `💰 *Grand Total:* ₹${inv.grandTotal.toLocaleString('en-IN')}`,
    `✅ *Paid / Advance:* ₹${inv.totalPaid.toLocaleString('en-IN')}`,
    inv.balance > 0 
      ? `⚠️ *Balance Due:* ₹${inv.balance.toLocaleString('en-IN')}` 
      : `🎉 *Status:* Fully Settled & Paid`,
    `──────────────────────`,
    inv.hostel.gstEnabled && inv.hostel.gstin ? `🏛️ *Hotel GSTIN:* ${inv.hostel.gstin}` : '',
    `Thank you for your business! Have a safe journey. ✨`
  ].filter(Boolean).join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
};

export default {
  numberToWordsINR,
  calculateInvoiceData,
  generateInvoiceHtml,
  printInvoice,
  getInvoiceWhatsAppUrl,
  getWelcomeWhatsAppUrl,
  calculateMergedInvoiceData,
  generateMergedInvoiceHtml,
  printMergedInvoice,
  getMergedInvoiceWhatsAppUrl
};
