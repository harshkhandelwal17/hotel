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

export function printCancellationVoucher({
  stay,
  guest,
  hostel,
  refundAmount = 0,
  cancellationCharge = 0,
  refundPaymentMethod = 'Cash',
  cancellationReason = 'Guest requested cancellation',
  receptionistName = 'Receptionist'
}) {
  const now = new Date();
  const voucherNo = 'CN-' + (stay?._id ? stay._id.toString().slice(-6).toUpperCase() : Date.now().toString().slice(-6));
  const hotelName = hostel?.name || 'Hotel Property';
  const hotelAddress = hostel?.address || '';
  const hotelPhone = hostel?.contactNumber || '';
  const hotelGst = hostel?.gstin || '';

  const guestName = guest?.fullName || stay?.guest?.fullName || 'Walk-in Guest';
  const guestPhone = guest?.mobileNumber || stay?.guest?.mobileNumber || '';
  const roomNum = stay?.room?.roomNumber || '—';
  const checkInTime = stay?.checkInDate ? format(new Date(stay.checkInDate), 'dd/MM/yyyy, hh:mm a') : '—';
  const cancelTime = format(now, 'dd/MM/yyyy, hh:mm a');
  const totalPaid = Math.max(0, Number(stay?.paidAmount) || 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cancellation & Refund Voucher - ${esc(voucherNo)}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
    }
    .voucher-card {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #94a3b8;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .hotel-name {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .hotel-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .voucher-badge {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 14px;
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #f87171;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .info-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-weight: 700;
      color: #1e293b;
    }
    .calc-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .calc-table th {
      background: #f1f5f9;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      color: #334155;
      border: 1px solid #e2e8f0;
    }
    .calc-table td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
    }
    .highlight-green {
      background: #ecfdf5 !important;
      color: #065f46;
      font-weight: 800;
      font-size: 13px;
    }
    .highlight-amber {
      background: #fffbeb !important;
      color: #92400e;
      font-weight: 700;
    }
    .footer-signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }
    .sig-box {
      text-align: center;
      padding-top: 36px;
      border-top: 1px dashed #64748b;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    .no-print {
      text-align: center;
      margin-bottom: 16px;
    }
    .btn-print {
      background: #059669;
      color: white;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none; }
      body { padding: 0; background: #ffffff; }
      .voucher-card { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save Voucher PDF</button>
  </div>

  <div class="voucher-card">
    <div class="header">
      <div class="hotel-name">${esc(hotelName)}</div>
      ${hotelAddress ? `<div class="hotel-sub">${esc(hotelAddress)}</div>` : ''}
      ${hotelPhone ? `<div class="hotel-sub">Phone: ${esc(hotelPhone)} ${hotelGst ? `| GSTIN: ${esc(hotelGst)}` : ''}</div>` : ''}
      <div class="voucher-badge">Cancellation & Refund Voucher</div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-title">Voucher Details</div>
        <div class="info-value">Ref: ${esc(voucherNo)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${cancelTime}</div>
      </div>
      <div class="info-box">
        <div class="info-title">Room & Check-In</div>
        <div class="info-value">Room: ${esc(roomNum)}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Check-In: ${checkInTime}</div>
      </div>
      <div class="info-box">
        <div class="info-title">Guest Details</div>
        <div class="info-value">${esc(guestName)}</div>
        ${guestPhone ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Mob: ${esc(guestPhone)}</div>` : ''}
      </div>
      <div class="info-box">
        <div class="info-title">Cancellation Reason</div>
        <div class="info-value" style="font-size: 11px; color: #991b1b;">${esc(cancellationReason)}</div>
      </div>
    </div>

    <table class="calc-table">
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Tariff / Booking Amount</td>
          <td style="text-align: right; font-family: monospace;">${fmtCurrency(stay?.totalAmount)}</td>
        </tr>
        <tr>
          <td>Total Amount Received by Hotel</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${fmtCurrency(totalPaid)}</td>
        </tr>
        <tr class="highlight-amber">
          <td>(-) Cancellation / Retention Charge</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${fmtCurrency(cancellationCharge)}</td>
        </tr>
        <tr class="highlight-green">
          <td>(=) NET AMOUNT REFUNDED TO GUEST</td>
          <td style="text-align: right; font-family: monospace;">${fmtCurrency(refundAmount)}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 11px; color: #475569;">
            <strong>Refund Payment Mode:</strong> ${esc(refundPaymentMethod)} &bull; 
            <strong>Processed By:</strong> ${esc(receptionistName)}
          </td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #64748b;">
      <em>I acknowledge receipt of ₹${Number(refundAmount).toLocaleString('en-IN')} as full and final settlement against the cancellation of Room ${esc(roomNum)}.</em>
    </div>

    <div class="footer-signatures">
      <div class="sig-box">
        Guest Signature
      </div>
      <div class="sig-box">
        Authorized Receptionist / Hotelier
      </div>
    </div>
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
    alert('Please allow popups for this site to print the cancellation voucher.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
