// Utility to print and export the authentic A4 Landscape Daily Front Desk Cashbook / Register (रोकड़ बही)
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

export function generateDailyRegisterHtml(registerData, summary, hostelName, dateStr) {
  const leftMantra = registerData?.headerMantraLeft || 'जय श्री श्याम';
  const centerMantra = registerData?.headerMantraCenter || 'श्री गणेशाय नम:';
  const rightMantra = registerData?.headerMantraRight || 'सीता राम';

  const dateObj = dateStr ? new Date(dateStr + 'T12:00:00Z') : new Date();
  const formattedDate = format(dateObj, 'dd-MM-yyyy');
  const dayName = format(dateObj, 'EEEE');

  const entries = registerData?.entries || [];
  const openingBal = registerData?.openingBalance || summary?.openingBalance || 0;

  // Build rows
  let rowsHtml = '';

  // Row 1: Opening Bal.
  rowsHtml += `
    <tr class="row-opening">
      <td class="text-center font-mono">1</td>
      <td class="text-center font-mono">—</td>
      <td class="text-center font-mono">—</td>
      <td class="font-bold text-left uppercase text-emerald-800">
        Opening Bal. (पिछला रोकड़ शेष)
      </td>
      <td class="text-right font-mono font-black text-emerald-800">${fmtCurrency(openingBal)}</td>
      <td class="text-center font-mono">—</td>
      <td class="text-center font-mono">—</td>
      <td class="text-center font-mono">—</td>
      <td class="text-left font-mono">—</td>
      <td class="text-right font-mono">—</td>
    </tr>
  `;

  // Dynamic Entries
  entries.forEach((e, idx) => {
    const srNo = idx + 2;
    rowsHtml += `
      <tr>
        <td class="text-center font-mono">${srNo}</td>
        <td class="text-center font-mono font-bold">${esc(e.roomNo || '—')}</td>
        <td class="text-center font-mono text-xs">${esc(e.bid || '—')}</td>
        <td class="text-left font-semibold">${esc(e.guestName || '—')}</td>
        <td class="text-right font-mono">${e.cashAmount > 0 ? fmtCurrency(e.cashAmount) : '—'}</td>
        <td class="text-right font-mono">${e.cardAmount > 0 ? fmtCurrency(e.cardAmount) : '—'}</td>
        <td class="text-right font-mono">${e.onlineAmount > 0 ? fmtCurrency(e.onlineAmount) : '—'}</td>
        <td class="text-right font-mono">${e.foodCashAmount > 0 ? fmtCurrency(e.foodCashAmount) : '—'}</td>
        <td class="text-left text-xs">${esc(e.expenseTitle || '—')}</td>
        <td class="text-right font-mono text-rose-700 font-bold">${e.expenseAmount > 0 ? fmtCurrency(e.expenseAmount) : '—'}</td>
      </tr>
    `;
  });

  // Minimum ruled blank rows to look like physical register page (at least 15 rows total)
  const totalRowsSoFar = entries.length + 1;
  const blankRowsNeeded = Math.max(0, 16 - totalRowsSoFar);
  for (let i = 0; i < blankRowsNeeded; i++) {
    rowsHtml += `
      <tr class="row-blank">
        <td class="text-center font-mono text-gray-400">${totalRowsSoFar + i + 1}</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Daily Register - ${esc(hostelName)} - ${formattedDate}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 12px;
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
    }
    .no-print-bar {
      max-width: 1100px;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 10px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .btn {
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-print { background: #059669; color: #ffffff; }
    .btn-print:hover { background: #047857; }
    .btn-close { background: #475569; color: #ffffff; }
    .btn-close:hover { background: #334155; }

    .register-sheet {
      max-width: 1120px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #1e293b;
      padding: 14px 18px;
      border-radius: 4px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }

    /* Top Auspicious Header */
    .header-mantras {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5px solid #b91c1c;
      padding-bottom: 4px;
      margin-bottom: 8px;
      color: #b91c1c;
      font-weight: 900;
      font-size: 13px;
    }

    /* Hotel Title Banner */
    .title-banner {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .hotel-name {
      font-size: 20px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0;
      line-height: 1.2;
    }
    .register-subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin: 2px 0 0 0;
    }
    .date-badge {
      text-align: right;
      font-size: 11px;
      color: #334155;
    }
    .date-badge strong {
      font-size: 14px;
      color: #000000;
      font-family: monospace;
    }

    /* Table */
    table.ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border: 1.5px solid #1e293b;
    }
    table.ledger-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      padding: 5px 6px;
      border: 1px solid #334155;
      font-size: 10px;
      letter-spacing: 0.3px;
    }
    table.ledger-table td {
      padding: 4px 6px;
      border: 1px solid #94a3b8;
      vertical-align: middle;
      font-size: 11px;
    }
    tr.row-opening {
      background: #f0fdf4;
      font-weight: bold;
    }
    tr.row-blank td {
      color: transparent;
      border-color: #cbd5e1;
    }
    tr.row-totals {
      background: #f8fafc;
      border-top: 2px solid #000000;
      border-bottom: 2px solid #000000;
      font-weight: 900;
    }
    tr.row-totals td {
      border: 1px solid #1e293b;
      padding: 6px;
    }

    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .text-emerald-800 { color: #065f46; }
    .text-rose-700 { color: #be123c; }

    /* Bottom Summary & Reconciliation */
    .bottom-section {
      margin-top: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 12px;
      background: #f8fafc;
    }
    .summary-card-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 3px;
      margin-bottom: 6px;
    }
    .reconciliation-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .reconciliation-row.highlight {
      font-weight: 900;
      font-size: 13px;
      color: #065f46;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      margin-top: 4px;
    }
    .reconciliation-row.highlight-blue {
      font-weight: 900;
      font-size: 13px;
      color: #1e40af;
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      margin-top: 4px;
    }

    /* Signatures */
    .signatures-row {
      margin-top: 24px;
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
    }
    .signature-box {
      width: 200px;
      border-top: 1.5px solid #000000;
      padding-top: 4px;
    }

    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .register-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Actions Bar -->
  <div class="no-print-bar">
    <div style="font-weight: 700; font-size: 13px;">
      📖 ${esc(hostelName)} &bull; Daily Desk Register &bull; ${formattedDate} (${dayName})
    </div>
    <div style="display: flex; gap: 8px;">
      <button onclick="window.print()" class="btn btn-print">🖨️ Print / Save as PDF</button>
      <button onclick="window.close()" class="btn btn-close">✕ Close</button>
    </div>
  </div>

  <!-- The Authentic Ledger Sheet -->
  <div class="register-sheet">
    <!-- Top Auspicious Mantras -->
    <div class="header-mantras">
      <span>"${esc(leftMantra)}"</span>
      <span>${esc(centerMantra)}</span>
      <span>"${esc(rightMantra)}"</span>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <div>
        <h1 class="hotel-name">${esc(hostelName)}</h1>
        <div class="register-subtitle">DAILY FRONT DESK CASH & ROOM REGISTER (दैनिक रोकड़ बही)</div>
      </div>
      <div class="date-badge">
        <div>DATE: <strong>${formattedDate}</strong></div>
        <div style="color: #64748b;">DAY: ${dayName}</div>
      </div>
    </div>

    <!-- The Ledger Table -->
    <table class="ledger-table">
      <thead>
        <tr>
          <th style="width: 30px;" class="text-center">#</th>
          <th style="width: 65px;" class="text-center">Room N.</th>
          <th style="width: 85px;" class="text-center">B. I. D</th>
          <th class="text-left">Guest Name / Particulars</th>
          <th style="width: 85px;" class="text-right">CASH</th>
          <th style="width: 80px;" class="text-right">CARD</th>
          <th style="width: 95px;" class="text-right">Fab / Online</th>
          <th style="width: 85px;" class="text-right">Food CASH</th>
          <th style="width: 130px;" class="text-left">E X P (खर्चा विवरण)</th>
          <th style="width: 85px;" class="text-right">Amt (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}

        <!-- Totals Row -->
        <tr class="row-totals">
          <td colspan="4" class="text-right font-black" style="font-size: 11px; letter-spacing: 0.5px;">
            TOTALS / कुल योग:
          </td>
          <td class="text-right font-mono font-black">${fmtCurrency(summary?.totalCash)}</td>
          <td class="text-right font-mono font-black">${fmtCurrency(summary?.totalCard)}</td>
          <td class="text-right font-mono font-black">${fmtCurrency(summary?.totalOnline)}</td>
          <td class="text-right font-mono font-black">${fmtCurrency(summary?.totalFoodCash)}</td>
          <td class="text-right font-bold text-xs" style="color: #475569;">Total Expenses:</td>
          <td class="text-right font-mono font-black text-rose-700">${fmtCurrency(summary?.totalExpense)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Bottom Financial Summary Cards -->
    <div class="bottom-section">
      <!-- Card 1: Front Desk Cash Reconciliation -->
      <div class="summary-card">
        <div class="summary-card-title">💵 Front Desk Cash In Hand Reconciliation (रोकड़ मिलान)</div>
        <div class="reconciliation-row">
          <span>(+) Opening Cash Balance (पिछला रोकड़ शेष):</span>
          <span class="font-mono font-bold">${fmtCurrency(summary?.openingBalance)}</span>
        </div>
        <div class="reconciliation-row">
          <span>(+) Today's Room Cash Collection:</span>
          <span class="font-mono">${fmtCurrency(summary?.totalCash)}</span>
        </div>
        <div class="reconciliation-row">
          <span>(+) Today's Food / Restaurant Cash:</span>
          <span class="font-mono">${fmtCurrency(summary?.totalFoodCash)}</span>
        </div>
        <div class="reconciliation-row">
          <span>(-) Cash Paid for Daily Expenses (खर्चा):</span>
          <span class="font-mono text-rose-700">-${fmtCurrency(summary?.cashExpense)}</span>
        </div>
        <div class="reconciliation-row highlight">
          <span>(=) CLOSING CASH IN HAND (रात का गल्ला):</span>
          <span class="font-mono">${fmtCurrency(summary?.closingCash)}</span>
        </div>
      </div>

      <!-- Card 2: Daily P&L and Digital Collection -->
      <div class="summary-card">
        <div class="summary-card-title">📊 Daily P&L & Total Business Collection</div>
        <div class="reconciliation-row">
          <span>Total Day Collection (Cash + Card + Online):</span>
          <span class="font-mono font-bold">${fmtCurrency(summary?.totalIncome)}</span>
        </div>
        <div class="reconciliation-row">
          <span>Digital Inflow (Card + UPI + Fab / Online):</span>
          <span class="font-mono">${fmtCurrency((summary?.totalCard || 0) + (summary?.totalOnline || 0))}</span>
        </div>
        <div class="reconciliation-row">
          <span>Total Day Expenses (खर्चा):</span>
          <span class="font-mono text-rose-700">-${fmtCurrency(summary?.totalExpense)}</span>
        </div>
        <div class="reconciliation-row highlight-blue">
          <span>(=) NET DAY PROFIT / REVENUE (शुद्ध दैनिक लाभ):</span>
          <span class="font-mono">${fmtCurrency(summary?.netDayProfit)}</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="signature-box">
        Duty Receptionist Signature
      </div>
      <div class="signature-box">
        Verified By Manager / Hotelier
      </div>
    </div>
  </div>

  <script>
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
}

/**
 * Opens a clean pop-out print window and triggers print / PDF dialog
 */
export function printDailyRegister(registerData, summary, hostelName, dateStr) {
  const html = generateDailyRegisterHtml(registerData, summary, hostelName, dateStr);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow popups for this site to print or save PDF');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

/**
 * Downloads the current register data as an Excel-compatible CSV file
 */
export function exportDailyRegisterToCSV(registerData, summary, hostelName, dateStr) {
  const entries = registerData?.entries || [];
  const openingBal = registerData?.openingBalance || summary?.openingBalance || 0;

  const rows = [];
  rows.push([`"${hostelName} - DAILY DESK REGISTER"`]);
  rows.push([`"Date:", "${dateStr}"`]);
  rows.push([]);
  rows.push([
    '#',
    'Room N.',
    'B.I.D',
    'Guest Name / Description',
    'CASH',
    'CARD',
    'Fab / Online / UPI',
    'Food CASH',
    'E X P (Expense)',
    'Amt (Expense Amt)',
    'Payment Mode',
    'Notes'
  ]);

  // Opening Bal row
  rows.push([
    1,
    '-',
    '-',
    'Opening Bal.',
    openingBal,
    0,
    0,
    0,
    '-',
    0,
    'Cash',
    'Carried forward from yesterday'
  ]);

  // Entries
  entries.forEach((e, idx) => {
    rows.push([
      idx + 2,
      `"${e.roomNo || ''}"`,
      `"${e.bid || ''}"`,
      `"${e.guestName || ''}"`,
      e.cashAmount || 0,
      e.cardAmount || 0,
      e.onlineAmount || 0,
      e.foodCashAmount || 0,
      `"${e.expenseTitle || ''}"`,
      e.expenseAmount || 0,
      `"${e.paymentMode || 'Cash'}"`,
      `"${e.notes || ''}"`
    ]);
  });

  // Totals
  rows.push([]);
  rows.push([
    'TOTALS',
    '',
    '',
    '',
    summary?.totalCash || 0,
    summary?.totalCard || 0,
    summary?.totalOnline || 0,
    summary?.totalFoodCash || 0,
    'Total Expense:',
    summary?.totalExpense || 0
  ]);

  rows.push([]);
  rows.push(['Cash In Hand Reconciliation:']);
  rows.push(['Opening Balance', openingBal]);
  rows.push(['Room Cash In', summary?.totalCash || 0]);
  rows.push(['Food Cash In', summary?.totalFoodCash || 0]);
  rows.push(['Cash Expenses Out', -(summary?.cashExpense || 0)]);
  rows.push(['CLOSING CASH IN HAND', summary?.closingCash || 0]);
  rows.push([]);
  rows.push(['Total Day Revenue', summary?.totalIncome || 0]);
  rows.push(['Net Day Profit', summary?.netDayProfit || 0]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Daily_Register_${hostelName ? hostelName.replace(/\s+/g, '_') : 'Hotel'}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
