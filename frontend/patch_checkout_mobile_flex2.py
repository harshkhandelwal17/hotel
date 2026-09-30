import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

target = """                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCheckoutPayment(finalBalance)} className="px-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-md active:scale-95">Full ₹{finalBalance}</button>
                  </div>"""

rep = """                  <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => setCheckoutPayment(finalBalance)} className="w-full sm:w-auto py-3 sm:py-0 px-6 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-md active:scale-95">Full ₹{finalBalance}</button>
                  </div>"""

content = content.replace(target, rep)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal flex layouts patched for mobile 2")
