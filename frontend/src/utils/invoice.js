import { format } from 'date-fns';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Opens a print window with an itemised bill.
 * stay      - stay object (guest/room/hostel populated, charges[] present)
 * payments  - optional array of Payment docs for the stay
 */
export const printInvoice = (stay, payments = []) => {
  const charges = stay.charges || [];
  const chargesTotal = charges.reduce((s, c) => s + (c.amount || 0), 0);
  const roomRent = Math.max(0, (stay.totalAmount || 0) - chargesTotal);
  const balance = (stay.totalAmount || 0) - (stay.paidAmount || 0);
  const out = stay.actualCheckOutDate || stay.expectedCheckOutDate;

  const chargeRows = charges.map(c => `
    <tr>
      <td>${esc(c.description)}${c.quantity > 1 ? ` x${c.quantity}` : ''} <small>(${esc(c.category)})</small></td>
      <td class="r">Rs ${c.amount}</td>
    </tr>`).join('');

  const payRows = payments.map(p => `
    <tr>
      <td>${format(new Date(p.paymentDate), 'dd MMM yyyy, hh:mm a')} &mdash; ${esc(p.paymentMethod)}</td>
      <td class="r">Rs ${p.amount}</td>
    </tr>`).join('');

  const html = `
  <html><head><title>Invoice - ${esc(stay.guest?.fullName)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,sans-serif;padding:28px;max-width:640px;margin:auto;color:#111}
    h1{margin:0;font-size:22px} .muted{color:#666;font-size:12px}
    table{width:100%;border-collapse:collapse;margin:14px 0}
    td,th{padding:7px 4px;border-bottom:1px solid #eee;font-size:13px;text-align:left}
    .r{text-align:right} .tot td{font-weight:800;border-top:2px solid #111;font-size:15px}
    h3{margin:22px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#555}
  </style></head><body>
    <h1>${esc(stay.hostel?.name || 'Hotel')}</h1>
    <div class="muted">${esc(stay.hostel?.address || '')}</div>
    <hr/>
    <p><b>Guest:</b> ${esc(stay.guest?.fullName)} &nbsp; ${esc(stay.guest?.mobileNumber || '')}<br/>
       <b>Room:</b> ${esc(stay.room?.roomNumber)}<br/>
       <b>Check-in:</b> ${format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a')}<br/>
       <b>Check-out:</b> ${format(new Date(out), 'dd MMM yyyy, hh:mm a')}</p>

    <h3>Bill</h3>
    <table>
      <tr><td>Room Rent</td><td class="r">Rs ${roomRent}</td></tr>
      ${chargeRows}
      <tr class="tot"><td>Total</td><td class="r">Rs ${stay.totalAmount}</td></tr>
    </table>

    ${payments.length ? `<h3>Payments Received</h3><table>${payRows}</table>` : ''}
    <table>
      <tr><td>Total Paid</td><td class="r">Rs ${stay.paidAmount}</td></tr>
      <tr class="tot"><td>${balance > 0 ? 'Balance Due' : 'Balance'}</td><td class="r">Rs ${Math.max(0, balance)}</td></tr>
    </table>
    <p class="muted">Thank you for staying with us!</p>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
};

