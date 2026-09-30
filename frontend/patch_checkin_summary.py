import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'<div className="border-t border-gray-200 pt-5 space-y-3">.*?<p className="font-black text-2xl text-gray-900">₹\{grossTotal\}</p>\s*</div>\s*</div>', re.DOTALL)

replacement = """<div className="border-t border-gray-200 pt-5 mt-5">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-bold text-gray-600 uppercase">Gross Total</p>
                  <p className="font-black text-2xl text-gray-900">₹{grossTotal}</p>
                </div>
              </div>"""

content = re.sub(pattern, replacement, content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Patched CheckIn Summary")
