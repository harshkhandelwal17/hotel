import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>"""

replacement = """  if (checkoutComplete) {
    const finalAmount = completedStay ? completedStay.totalAmount : stay.totalAmount;
    
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onSuccess}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Checked Out!</h2>
          <p className="text-gray-500 text-sm mb-6">Guest has been successfully checked out.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                // Print Invoice Logic
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                  <html>
                  <head>
                    <title>Invoice - ${stay.guest?.fullName}</title>
                    <style>body{font-family:sans-serif;padding:20px;}</style>
                  </head>
                  <body>
                    <h2>${stay.hostel?.name || 'Hotel'} Invoice</h2>
                    <p>Guest: ${stay.guest?.fullName}</p>
                    <p>Total Paid: Rs ${finalAmount}</p>
                    <p style="font-size:11px; margin-top:20px">* Amount is inclusive of all applicable taxes (GST)</p>
                  </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
                onSuccess();
              }}
              className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Print Final Invoice
            </button>
            <button
              onClick={onSuccess}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched CheckoutModal render")
