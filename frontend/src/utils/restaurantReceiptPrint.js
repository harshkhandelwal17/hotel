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
      margin: 4mm 2mm;
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
      margin-bottom: 8px;
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
      margin-top: 10px;
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
    <button class="btn-print" onclick="window.print()">🖨️ Print Bill</button>
  </div>

  <div class="header">
    <div class="title">${esc(hotelName)}</div>
    ${hotelAddress ? `<div class="sub">${esc(hotelAddress)}</div>` : ''}
    ${hotelPhone ? `<div class="sub">Tel: ${esc(hotelPhone)}</div>` : ''}
    ${hotelGst ? `<div class="sub">GSTIN: ${esc(hotelGst)}</div>` : ''}
    <div class="divider"></div>
    <div class="font-bold" style="font-size: 11px; text-transform: uppercase;">Restaurant / Room Service Bill</div>
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
  ${order.guestName && order.guestName !== 'Walk-in Guest' ? `
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
    <span>GRAND TOTAL:</span>
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
