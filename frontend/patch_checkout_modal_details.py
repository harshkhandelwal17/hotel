import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

target = """                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">Advance Paid</span>
                  <span className="font-black text-green-600">- ₹{stay.paidAmount}</span>
                </div>"""

replacement = """                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-semibold">Advance Paid</span>
                  <span className="font-black text-green-600">- ₹{stay.paidAmount}</span>
                </div>
                
                {stay.discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-semibold">Discount Applied (Already cut)</span>
                    <span className="font-bold text-red-500">- ₹{stay.discountAmount}</span>
                  </div>
                )}
                
                {stay.commissionAmount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-semibold">Broker Commission ({stay.commissionTo})</span>
                    <span className="font-bold text-orange-500">₹{stay.commissionAmount}</span>
                  </div>
                )}"""

content = content.replace(target, replacement)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal updated to show discount and commission.")
