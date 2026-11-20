import { format } from 'date-fns';

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtCurrency(num) {
  const n = Number(num) || 0;
  return '₹' + n.toLocaleString('en-IN');
}

// Convert number to Indian currency words
function numberToWordsINR(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Zero Rupees Only';

  const single = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 10) return single[n];
    if (n < 20) return teens[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + single[n % 10] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let str = '';
    if (hundred > 0) str += single[hundred] + ' Hundred';
    if (rest > 0) {
      if (str !== '') str += ' and ';
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  const rest = rem;

  let parts = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
  if (rest > 0) parts.push(convertThreeDigits(rest));

  return parts.join(' ') + ' Rupees Only';
}

/**
 * 🖨️ 1. THERMAL POS RECEIPT (80mm / 3-inch roll format)
 */
export function printRestaurantReceipt(order, hostel = null) {
  const dateStr = order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy, hh:mm a') : format(new Date(), 'dd/MM/yyyy, hh:mm a');
  const hotelName = hostel?.name || 'Hotel Cafe & Restaurant';
  const hotelAddress = hostel?.address || '';
  const hotelPhone = hostel?.contactNumber || '';
  const hotelGst = hostel?.gstin || '';

  const items = order.items || [];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${esc(order.orderNumber)}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 3mm 2mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 6px;
      font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
      font-size: 12px;
      color: #000000;
      background: #ffffff;
      width: 76mm;
      margin: 0 auto;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }
    
    .header {
      text-align: center;
      margin-bottom: 6px;
    }
    .title {
      font-size: 15px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub {
      font-size: 10px;
      margin-top: 1px;
    }
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 11px;
    }
    .items-table th {
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 4px 1px;
      font-weight: bold;
    }
    .items-table td {
      padding: 3px 1px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .grand-total {
      font-size: 14px;
      font-weight: 900;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 4px 0;
      margin: 4px 0;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border: 1px solid #000;
      border-radius: 4px;
      font-weight: bold;
      font-size: 10px;
      margin-top: 4px;
    }
    .footer {
      text-align: center;
      font-size: 10px;
      margin-top: 8px;
    }
    .no-print {
      text-align: center;
      margin-bottom: 10px;
    }
    .btn-print {
      background: #000;
      color: #fff;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none; }
      body { width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print 80mm POS Bill</button>
  </div>

  <div class="header">
    <div class="title">${esc(hotelName)}</div>
    ${hotelAddress ? `<div class="sub">${esc(hotelAddress)}</div>` : ''}
    ${hotelPhone ? `<div class="sub">Tel: ${esc(hotelPhone)}</div>` : ''}
    ${hotelGst ? `<div class="sub">GSTIN: ${esc(hotelGst)}</div>` : ''}
    <div class="divider"></div>
    <div class="font-bold" style="font-size: 11px; text-transform: uppercase;">
      ${order.isB2B ? 'TAX INVOICE' : 'RESTAURANT RECEIPT'}
    </div>
  </div>

  <div class="meta-row">
    <span>Bill No: <strong>${esc(order.orderNumber)}</strong></span>
    <span>${esc(order.orderType || 'Room Service')}</span>
  </div>
  <div class="meta-row">
    <span>Date: ${esc(dateStr)}</span>
  </div>
  ${order.tableOrRoom ? `
    <div class="meta-row">
      <span>Target: <strong>${esc(order.tableOrRoom)}</strong></span>
    </div>
  ` : ''}
  ${order.isB2B && order.companyName ? `
    <div class="meta-row">
      <span>M/s: <strong>${esc(order.companyName)}</strong></span>
    </div>
    ${order.gstin ? `<div class="meta-row"><span>GSTIN: <strong>${esc(order.gstin)}</strong></span></div>` : ''}
  ` : (order.guestName && order.guestName !== 'Walk-in Guest') ? `
    <div class="meta-row">
      <span>Guest: ${esc(order.guestName)}</span>
    </div>
  ` : ''}

  <table class="items-table">
    <thead>
      <tr>
        <th class="text-left" style="width: 50%;">Item</th>
        <th class="text-center" style="width: 15%;">Qty</th>
        <th class="text-right" style="width: 15%;">Rate</th>
        <th class="text-right" style="width: 20%;">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(it => `
        <tr>
          <td class="text-left">${esc(it.name)}</td>
          <td class="text-center">${it.quantity}</td>
          <td class="text-right">${fmtCurrency(it.price).replace('₹', '')}</td>
          <td class="text-right font-bold">${fmtCurrency(it.total).replace('₹', '')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="total-row">
    <span>Subtotal:</span>
    <span class="font-bold">${fmtCurrency(order.subtotal || order.totalAmount)}</span>
  </div>
  ${order.discount > 0 ? `
    <div class="total-row">
      <span>Discount:</span>
      <span>-${fmtCurrency(order.discount)}</span>
    </div>
  ` : ''}
  ${order.taxAmount > 0 ? `
    <div class="total-row">
      <span>Tax / GST (${order.taxPercent}%):</span>
      <span>+${fmtCurrency(order.taxAmount)}</span>
    </div>
  ` : ''}

  <div class="total-row grand-total">
    <span>TOTAL:</span>
    <span>${fmtCurrency(order.totalAmount)}</span>
  </div>

  <div class="text-center">
    <div class="badge">
      ${order.paymentStatus === 'Charged to Room' ? `CHARGED TO ${esc(order.tableOrRoom || 'ROOM')}` : `PAID VIA ${esc(order.paymentMethod || 'CASH')}`}
    </div>
  </div>

  <div class="footer">
    <div class="divider"></div>
    <div>Thank you for dining with us!</div>
    <div style="font-size: 9px; margin-top: 3px; color: #444;">Please visit again</div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups to print the restaurant receipt.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * 📄 2. CORPORATE & B2B GST TAX INVOICE (Full A4 / A5 Standard Format)
 */
export function printRestaurantGstInvoice(order, hostel = null) {
  const dateStr = order.createdAt ? format(new Date(order.createdAt), 'dd MMMM yyyy, hh:mm a') : format(new Date(), 'dd MMMM yyyy, hh:mm a');
  const hotelName = hostel?.name || 'Hotel Restaurant';
  const hotelAddress = hostel?.address || '';
  const hotelPhone = hostel?.contactNumber || '';
  const hotelEmail = hostel?.email || '';
  const hotelGst = hostel?.gstin || '';
  const hotelState = hotelGst ? hotelGst.slice(0, 2) : '08';

  const clientName = order.companyName || order.guestName || 'Valued Customer';
  const clientGst = order.gstin || '';
  const clientAddress = order.billingAddress || '';
  const items = order.items || [];

  const subtotal = Number(order.subtotal) || Number(order.totalAmount) || 0;
  const discount = Number(order.discount) || 0;
  const taxableValue = Math.max(0, subtotal - discount);
  const totalTax = Number(order.taxAmount) || 0;
  const cgst = Number(order.cgst) || Math.round((totalTax / 2) * 100) / 100;
  const sgst = Number(order.sgst) || Math.round((totalTax - cgst) * 100) / 100;
  const igst = Number(order.igst) || 0;
  const grandTotal = Number(order.totalAmount) || Math.round(taxableValue + totalTax);

  const amountInWords = numberToWordsINR(grandTotal);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GST Tax Invoice - ${esc(order.orderNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .hotel-brand {
      font-size: 24px;
      font-weight: 900;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .hotel-details {
      font-size: 11px;
      color: #475569;
      margin-top: 4px;
      line-height: 1.5;
    }
    .invoice-title-block {
      text-align: right;
    }
    .invoice-title {
      font-size: 18px;
      font-weight: 900;
      text-transform: uppercase;
      color: #047857;
      letter-spacing: 0.5px;
    }
    .invoice-meta {
      font-size: 11px;
      color: #334155;
      margin-top: 4px;
      line-height: 1.5;
    }
    .billing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .billing-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
      letter-spacing: 0.5px;
    }
    .billing-name {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .billing-sub {
      color: #475569;
      margin-top: 2px;
      line-height: 1.4;
    }
    .table-container {
      margin-bottom: 20px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    table.data-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 9px 12px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    table.data-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 10px;
      margin-bottom: 24px;
    }
    .words-box {
      flex: 1;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: #334155;
    }
    .totals-box {
      width: 320px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      color: #475569;
    }
    .totals-row.grand {
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
    }
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 28px;
      margin-top: 24px;
      font-size: 11px;
    }
    .sign-box {
      text-align: center;
      width: 200px;
      border-top: 1px dashed #64748b;
      padding-top: 6px;
      color: #475569;
      font-weight: 700;
    }
    .no-print {
      text-align: center;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #059669;
      color: #ffffff;
      border: none;
      padding: 8px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none; }
      body { padding: 0; background: #ffffff; }
      .invoice-card { border: none; box-shadow: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save GST Tax Invoice PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header-row">
      <div>
        <div class="hotel-brand">${esc(hotelName)}</div>
        <div class="hotel-details">
          ${hotelAddress ? `${esc(hotelAddress)}<br>` : ''}
          ${hotelPhone ? `Phone: ${esc(hotelPhone)} | ` : ''}
          ${hotelEmail ? `Email: ${esc(hotelEmail)}<br>` : ''}
          ${hotelGst ? `<strong>GSTIN: ${esc(hotelGst)}</strong>` : ''}
        </div>
      </div>
      <div class="invoice-title-block">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-meta">
          <strong>Invoice No:</strong> ${esc(order.orderNumber)}<br>
          <strong>Date:</strong> ${esc(dateStr)}<br>
          <strong>SAC Code:</strong> ${esc(order.hsnSacCode || '996331')} (Restaurant Service)
        </div>
      </div>
    </div>

    <div class="billing-grid">
      <div>
        <div class="billing-title">Billed To (Client / Guest)</div>
        <div class="billing-name">${esc(clientName)}</div>
        ${clientGst ? `<div class="billing-sub"><strong>GSTIN / UIN:</strong> ${esc(clientGst)}</div>` : ''}
        ${clientAddress ? `<div class="billing-sub">${esc(clientAddress)}</div>` : ''}
        ${order.guestPhone ? `<div class="billing-sub">Mobile: ${esc(order.guestPhone)}</div>` : ''}
      </div>
      <div>
        <div class="billing-title">Order Details</div>
        <div class="billing-sub"><strong>Type:</strong> ${esc(order.orderType || 'Room Service')}</div>
        ${order.tableOrRoom ? `<div class="billing-sub"><strong>Room / Table:</strong> ${esc(order.tableOrRoom)}</div>` : ''}
        <div class="billing-sub"><strong>Payment Mode:</strong> ${esc(order.paymentMethod || 'Cash')}</div>
        <div class="billing-sub"><strong>Status:</strong> ${esc(order.paymentStatus || 'Paid')}</div>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">#</th>
            <th style="width: 44%; text-align: left;">Item Description</th>
            <th style="width: 12%; text-align: center;">SAC</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 13%; text-align: right;">Rate (₹)</th>
            <th style="width: 15%; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b;">${idx + 1}</td>
              <td><strong>${esc(it.name)}</strong></td>
              <td style="text-align: center; font-family: monospace;">${esc(order.hsnSacCode || '996331')}</td>
              <td style="text-align: center; font-weight: 700;">${it.quantity}</td>
              <td style="text-align: right; font-family: monospace;">${fmtCurrency(it.price).replace('₹', '')}</td>
              <td style="text-align: right; font-family: monospace; font-weight: 700;">${fmtCurrency(it.total).replace('₹', '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="summary-section">
      <div class="words-box">
        <strong>Amount Chargeable (in words):</strong><br>
        <span style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 4px; display: block;">
          ${esc(amountInWords)}
        </span>
        <div style="margin-top: 12px; font-size: 10px; color: #64748b; line-height: 1.4;">
          <em>• Food & Beverage Restaurant Services under GST SAC 996331.<br>
          • This is a system-generated official Tax Invoice.</em>
        </div>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Sub Total:</span>
          <span style="font-family: monospace; font-weight: 700;">${fmtCurrency(subtotal)}</span>
        </div>
        ${discount > 0 ? `
          <div class="totals-row" style="color: #dc2626;">
            <span>Discount:</span>
            <span style="font-family: monospace;">-${fmtCurrency(discount)}</span>
          </div>
        ` : ''}
        <div class="totals-row">
          <span>Taxable Value:</span>
          <span style="font-family: monospace; font-weight: 700;">${fmtCurrency(taxableValue)}</span>
        </div>
        ${igst > 0 ? `
          <div class="totals-row">
            <span>IGST (${order.taxPercent}%):</span>
            <span style="font-family: monospace;">+${fmtCurrency(igst)}</span>
          </div>
        ` : totalTax > 0 ? `
          <div class="totals-row">
            <span>CGST (${(order.taxPercent || 5) / 2}%):</span>
            <span style="font-family: monospace;">+${fmtCurrency(cgst)}</span>
          </div>
          <div class="totals-row">
            <span>SGST (${(order.taxPercent || 5) / 2}%):</span>
            <span style="font-family: monospace;">+${fmtCurrency(sgst)}</span>
          </div>
        ` : ''}
        <div class="totals-row grand">
          <span>TOTAL PAYABLE:</span>
          <span style="font-family: monospace; color: #047857;">${fmtCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>

    <div class="footer-signatures">
      <div style="font-size: 10px; color: #64748b;">
        Customer Acknowledgement / Signature
      </div>
      <div class="sign-box">
        For ${esc(hotelName)}<br>
        <span style="font-size: 9px; font-weight: normal; color: #94a3b8;">Authorized Signatory</span>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 350);
    });
  </script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups to print the GST Tax Invoice.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
