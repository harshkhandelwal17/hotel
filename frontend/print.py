import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_str = "import { User, Phone, CheckCircle, Clock } from 'lucide-react';"
new_import = "import { User, Phone, CheckCircle, Clock, Printer } from 'lucide-react';"

if import_str in content:
    content = content.replace(import_str, new_import)

btn_str = """              <button 
                onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }}
                className="bg-white text-blue-600 border border-blue-300 px-4 py-1.5 rounded text-sm hover:bg-blue-50 transition-colors"
              >
                Extend Stay
              </button>"""

new_btn = btn_str + """
              <button 
                onClick={() => printInvoice(activeStay)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors flex items-center inline-flex"
              >
                <Printer size={16} className="mr-1" /> Print Bill
              </button>"""

if btn_str in content:
    content = content.replace(btn_str, new_btn)

fn_str = "  if (!guest) return <div>Guest not found</div>;"

new_fn = fn_str + """

  const printInvoice = (stay) => {
    const printWindow = window.open('', '_blank');
    const html = `
      <html>
        <head>
          <title>Invoice - ${guest.fullName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; margin: 0; letter-spacing: -0.5px; }
            .subtitle { color: #666; margin-top: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .col { flex: 1; }
            .col-right { text-align: right; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; }
            .val { font-size: 16px; font-weight: 500; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; color: #888; text-transform: uppercase; }
            td { padding: 15px 12px; border-bottom: 1px solid #eee; }
            .total-row td { font-weight: bold; font-size: 18px; border-bottom: none; }
            .paid-row td { color: #059669; }
            .due-row td { color: #DC2626; font-weight: bold; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">HotelPro</h1>
            <div class="subtitle">Tax Invoice / Receipt</div>
          </div>
          
          <div class="row">
            <div class="col">
              <div class="label">Billed To</div>
              <div class="val">${guest.fullName}</div>
              <div class="val" style="font-size:14px; color:#666;">+91 ${guest.mobileNumber}</div>
            </div>
            <div class="col col-right">
              <div class="label">Invoice Date</div>
              <div class="val">${format(new Date(), 'dd MMM yyyy')}</div>
              <div class="label" style="margin-top: 15px;">Room No</div>
              <div class="val">${stay.room?.roomNumber || 'N/A'}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th style="text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Room Accommodation<br><span style="font-size:12px;color:#666;">Total Occupants: ${stay.occupants}</span></td>
                <td>${format(new Date(stay.checkInDate), 'dd MMM yyyy')}</td>
                <td>${format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</td>
                <td style="text-align:right">Rs ${stay.totalAmount}</td>
              </tr>
              <tr class="paid-row">
                <td colspan="3" style="text-align:right">Amount Paid</td>
                <td style="text-align:right">- Rs ${stay.paidAmount}</td>
              </tr>
              <tr class="due-row">
                <td colspan="3" style="text-align:right">Balance Due</td>
                <td style="text-align:right">Rs ${stay.totalAmount - stay.paidAmount}</td>
              </tr>
            </tbody>
          </table>
          
          <div style="margin-top: 60px; font-size: 12px; color: #888; text-align: center;">
            <p>Thank you for your stay with HotelPro.</p>
            <p>This is a computer generated invoice and does not require a signature.</p>
          </div>
          
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };
"""

if fn_str in content:
    content = content.replace(fn_str, new_fn)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated Profile")
