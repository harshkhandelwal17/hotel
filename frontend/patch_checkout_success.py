import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

state_target = "const [error, setError] = useState('');"
state_replacement = "const [error, setError] = useState('');\n  const [checkoutComplete, setCheckoutComplete] = useState(false);\n  const [completedStay, setCompletedStay] = useState(null);"
content = content.replace(state_target, state_replacement)

checkout_target = """      await axios.post(`http://127.0.0.1:5001/api/stays/${stay._id}/checkout`, {
        additionalCharges: Number(additionalCharges),
        checkoutPayment: Number(checkoutPayment),
        paymentMethod,
      });
      onSuccess();"""
checkout_replacement = """      const res = await axios.post(`http://127.0.0.1:5001/api/stays/${stay._id}/checkout`, {
        additionalCharges: Number(additionalCharges),
        checkoutPayment: Number(checkoutPayment),
        paymentMethod,
      });
      setCompletedStay(res.data.data);
      setCheckoutComplete(true);"""
content = content.replace(checkout_target, checkout_replacement)

# Now, add printInvoice function
print_logic = """  const printInvoice = () => {
    const printWindow = window.open('', '_blank');
    const invoiceStay = completedStay || stay;
    const finalAmount = invoiceStay.totalAmount + (completedStay ? 0 : Number(additionalCharges));
    
    const html = `
      <html>
        <head>
          <title>Invoice - ${invoiceStay.guest?.fullName}</title>
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
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${invoiceStay.hostel?.name || 'HotelPro'}</h1>
            <div class="subtitle">Tax Invoice / Receipt</div>
            <div style="font-size: 14px; color: #666; margin-top: 5px;">${invoiceStay.hostel?.address || ''}</div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Billed To</div>
              <div class="val">${invoiceStay.guest?.fullName}</div>
              <div class="val" style="font-size:14px; color:#666;">+91 ${invoiceStay.guest?.mobileNumber}</div>
            </div>
            <div class="col col-right">
              <div class="label">Invoice Date</div>
              <div class="val">${format(new Date(), 'dd MMM yyyy')}</div>
              <div class="label" style="margin-top: 15px;">Room No</div>
              <div class="val">${invoiceStay.room?.roomNumber || 'N/A'}</div>
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
                <td>Room Accommodation<br><span style="font-size:12px;color:#666;">Total Occupants: ${invoiceStay.occupants}</span></td>
                <td>${format(new Date(invoiceStay.checkInDate), 'dd MMM yyyy')}</td>
                <td>${format(new Date(), 'dd MMM yyyy')}</td>
                <td style="text-align:right">Rs ${finalAmount}</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align:right; padding-top:30px;">Grand Total</td>
                <td style="text-align:right; padding-top:30px;">Rs ${finalAmount}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top: 60px; text-align: center; color: #888; font-size: 14px;">
            Thank you for your stay!<br>
            Please visit again.
          </div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
"""

target_render = """return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">"""

replacement_render = print_logic + """
  if (checkoutComplete) {
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => onSuccess()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Checkout Successful</h2>
          <p className="text-gray-500 mb-8">The stay has been completed and the room is now available.</p>
          <div className="flex flex-col gap-3">
            <button onClick={printInvoice} className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">
              Print Invoice
            </button>
            <button onClick={() => onSuccess()} className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
              Close Window
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">"""

content = content.replace(target_render, replacement_render)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added success view and print invoice to CheckoutModal")
