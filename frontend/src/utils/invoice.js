import { format } from 'date-fns';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  // 1. Explicitly requested via options (e.g. receptionist toggled it in Invoice modal)
  // 2. OR this specific stay had GST applied (stay.gstApplied === true)
  // 3. Otherwise default to FALSE (clean standard Non-GST receipt so flat ₹1000 stays don't show tax!)
  const gstEnabled = options.gstEnabled !== undefined 
    ? Boolean(options.gstEnabled) 
    : Boolean(stay.gstApplied);

  const gstRate = Number(options.gstRate ?? stay.gstRate ?? hostel.gstRate ?? 12);
  const taxInclusive = options.taxInclusive !== undefined 
    ? Boolean(options.taxInclusive) 
    : (stay.gstType === 'exclusive' ? false : (stay.gstType === 'inclusive' ? true : (hostel.taxInclusive !== undefined ? Boolean(hostel.taxInclusive) : true)));

  const charges = stay.charges || [];
  const chargesTotal = charges.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const roomRent = Math.max(0, (Number(stay.totalAmount) || 0) - chargesTotal);
  const totalBilled = Number(stay.totalAmount) || 0;
  const totalPaid = Number(stay.paidAmount) || 0;
  const balance = Math.max(0, totalBilled - totalPaid);

  let taxableAmount = totalBilled;
  let totalGst = 0;
  let cgst = 0;
  let sgst = 0;

  if (gstEnabled && gstRate > 0) {
    if (taxInclusive) {
      // Room tariff includes GST: Back-calculate base amount
      taxableAmount = Math.round((totalBilled / (1 + gstRate / 100)) * 100) / 100;
      totalGst = Math.round((totalBilled - taxableAmount) * 100) / 100;
      cgst = Math.round((totalGst / 2) * 100) / 100;
      sgst = Math.round((totalGst - cgst) * 100) / 100;
    } else {
      // GST is added on top of tariff
      taxableAmount = totalBilled;
      totalGst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
      cgst = Math.round((totalGst / 2) * 100) / 100;
      sgst = Math.round((totalGst - cgst) * 100) / 100;
    }
  }

  const grandTotal = taxInclusive || !gstEnabled ? totalBilled : (taxableAmount + totalGst);

  // Auto-generate invoice number if not explicitly provided
  const prefix = hostel.invoicePrefix || 'INV';
  const stayDate = stay.createdAt ? new Date(stay.createdAt) : new Date();
  const dateStr = format(stayDate, 'yyyyMMdd');
  const roomStr = room.roomNumber || 'RM';
  const idStr = stay._id ? stay._id.toString().slice(-4).toUpperCase() : '001';
  const invoiceNumber = options.invoiceNumber || `${prefix}-${dateStr}-${roomStr}-${idStr}`;

  return {
    hostel,
    guest,
    room,
    charges,
    roomRent,
    chargesTotal,
    totalBilled,
    totalPaid,
    balance,
    gstEnabled,
    gstRate,
    taxInclusive,
    taxableAmount,
    totalGst,
    cgst,
    sgst,
    grandTotal,
    invoiceNumber,
    guestGstin: options.guestGstin || guest.gstin || '',
    guestCompany: options.guestCompany || guest.companyName || '',
    hsnSacCode: hostel.hsnSacCode || '996311'
  };
};

/**
 * Builds the centralized, print-ready HTML bill template
 */
export const generateInvoiceHtml = (stay, payments = [], options = {}) => {
  const inv = calculateInvoiceData(stay, payments, options);
  const outDate = stay.actualCheckOutDate || stay.expectedCheckOutDate || new Date();
  const checkInFormatted = format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a');
  const checkOutFormatted = format(new Date(outDate), 'dd MMM yyyy, hh:mm a');
  const invoiceDateFormatted = format(new Date(), 'dd MMM yyyy, hh:mm a');

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

  // Payment Records
  const paymentRows = payments.map(p => `
    <tr>
      <td>${format(new Date(p.paymentDate), 'dd MMM yyyy, hh:mm a')}</td>
      <td><span class="badge">${esc(p.paymentMethod)}</span></td>
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

    @media print {
      body { background: #ffffff; padding: 0; }
      .no-print-bar { display: none !important; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      @page { size: A4; margin: 12mm 15mm; }
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
      <a href="https://wa.me/91${inv.guest.mobileNumber?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Dear ${inv.guest.fullName},\nHere is your bill from ${inv.hostel.name || 'our Hotel'}:\n\nInvoice No: ${inv.invoiceNumber}\nRoom: ${inv.room.roomNumber}\nTotal Amount: Rs ${inv.grandTotal}\nPaid: Rs ${inv.totalPaid}\nBalance: Rs ${inv.balance}\n\nThank you for staying with us!`)}" target="_blank" class="btn btn-wa">💬 WhatsApp Bill</a>
      <button onclick="window.close()" class="btn btn-close">✕ Close</button>
    </div>
  </div>

  <div class="invoice-card">
    
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
        <div class="info-title">Guest Details</div>
        <div class="info-val" style="font-size: 15px; font-weight: 800;">${esc(inv.guest.fullName || 'Valued Guest')}</div>
        <div class="muted">${esc(inv.guest.mobileNumber ? '+91 ' + inv.guest.mobileNumber : 'Contact: N/A')}</div>
        ${inv.guestCompany ? `<div style="margin-top: 4px;"><b>Company:</b> ${esc(inv.guestCompany)}</div>` : ''}
        ${inv.guestGstin ? `<div><b>Guest GSTIN:</b> <span class="font-mono font-bold">${esc(inv.guestGstin)}</span></div>` : ''}
        ${inv.guest.address ? `<div class="muted small">${esc(inv.guest.address)}</div>` : ''}
      </div>
      <div>
        <div class="info-title">Stay & Reservation</div>
        <div class="info-val">Room No: <b style="font-size: 16px; color: #0f172a;">${esc(inv.room.roomNumber || 'N/A')}</b> &bull; ${esc(inv.room.category || 'Standard Room')}</div>
        <div class="muted small"><b>Check-In:</b> ${checkInFormatted}</div>
        <div class="muted small"><b>Check-Out:</b> ${checkOutFormatted}</div>
        <div class="muted small"><b>Occupants:</b> ${stay.occupants || 1} Guest(s)</div>
      </div>
    </div>

    <!-- ITEMISED BILL PARTICULARS -->
    <table>
      <thead>
        <tr>
          <th class="c" style="width: 40px;">#</th>
          <th>Particulars / Description</th>
          <th class="c font-mono" style="width: 90px;">SAC / HSN</th>
          <th class="c" style="width: 50px;">Qty</th>
          <th class="r font-mono" style="width: 100px;">Rate</th>
          <th class="r font-mono" style="width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="c">1</td>
          <td>
            <b>Room Accommodation Charges</b>
            <div class="muted small">Room ${esc(inv.room.roomNumber)} &bull; ${checkInFormatted.split(',')[0]} to ${checkOutFormatted.split(',')[0]}</div>
          </td>
          <td class="c font-mono">${inv.gstEnabled ? roomSac : '-'}</td>
          <td class="c">1</td>
          <td class="r font-mono">₹${Number(inv.roomRent).toLocaleString('en-IN')}</td>
          <td class="r font-mono">₹${Number(inv.roomRent).toLocaleString('en-IN')}</td>
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

            ${inv.gstEnabled ? `
              ${inv.taxInclusive ? `
                <tr>
                  <td class="muted small">Taxable Value:</td>
                  <td class="r font-mono small">₹${inv.taxableAmount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="muted small">CGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono small">₹${inv.cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="muted small">SGST (${(inv.gstRate / 2).toFixed(1)}%):</td>
                  <td class="r font-mono small">₹${inv.sgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td class="muted small">Total GST (${inv.gstRate}% Included):</td>
                  <td class="r font-mono small font-bold">₹${inv.totalGst.toLocaleString('en-IN')}</td>
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
                  * Non-GST bill: No tax charged under Composition/Exemption scheme.
                </td>
              </tr>
            `}

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

    <!-- PAYMENTS RECEIVED TABLE (IF ANY) -->
    ${payments.length > 0 ? `
      <div style="margin-top: 10px;">
        <div class="info-title" style="margin-bottom: 8px;">Payments Received / Settlement Log</div>
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

    <!-- FOOTER & SIGNATURES -->
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
 * Creates a prefilled WhatsApp link to share the bill with the guest
 */
export const getInvoiceWhatsAppUrl = (stay, payments = [], options = {}) => {
  const inv = calculateInvoiceData(stay, payments, options);
  const cleanPhone = (inv.guest.mobileNumber || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return null;

  const msg = [
    `🏨 *${inv.hostel.name || 'Hotel'}* - Invoice & Receipt`,
    `──────────────────────`,
    `👤 *Guest Name:* ${inv.guest.fullName || 'Guest'}`,
    `🚪 *Room Number:* ${inv.room.roomNumber || 'N/A'}`,
    `🧾 *Invoice No:* ${inv.invoiceNumber}`,
    `📅 *Check-In:* ${format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a')}`,
    `📅 *Check-Out:* ${format(new Date(stay.actualCheckOutDate || stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}`,
    `──────────────────────`,
    `💰 *Total Bill:* ₹${inv.grandTotal.toLocaleString('en-IN')}`,
    `✅ *Paid Amount:* ₹${inv.totalPaid.toLocaleString('en-IN')}`,
    inv.balance > 0 
      ? `⚠️ *Balance Due:* ₹${inv.balance.toLocaleString('en-IN')}` 
      : `🎉 *Status:* Fully Paid & Settled`,
    `──────────────────────`,
    inv.hostel.gstEnabled && inv.hostel.gstin ? `🏛️ *GSTIN:* ${inv.hostel.gstin}` : '',
    `Thank you for staying with us! Visit again. ✨`
  ].filter(Boolean).join('\n');

  return `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(msg)}`;
};
