import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

target = """            {/* Stay Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Checked In</p>
                <p className="font-bold text-blue-900 text-sm">{format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Checking Out</p>
                <p className="font-bold text-orange-900 text-sm">{format(new Date(), 'dd MMM, hh:mm a')}</p>
              </div>
            </div>"""

replacement = """            {/* Stay Timings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Checked In</p>
                <p className="font-bold text-blue-900 text-xs">{format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Expected Out</p>
                <p className="font-bold text-gray-900 text-xs">{format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm border-2">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Actual Out (Now)</p>
                <p className="font-black text-orange-900 text-sm">{format(new Date(), 'dd MMM, hh:mm a')}</p>
              </div>
            </div>"""

content = content.replace(target, replacement)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal times patched")
