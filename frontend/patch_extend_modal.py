import sys, re

with open('src/pages/receptionist/ExtendStayModal.jsx', 'r') as f:
    content = f.read()

# 1. State for additionalRent
content = content.replace("const [extensionPayment, setExtensionPayment] = useState(0);", "const [extensionPayment, setExtensionPayment] = useState(0);\n  const [additionalRent, setAdditionalRent] = useState('');")

# 2. Add additionalRent to payload
content = content.replace("extensionPayment: Number(extensionPayment)\n      });", "extensionPayment: Number(extensionPayment),\n        additionalRent: Number(additionalRent)\n      });")

# 3. Replace calculated additionalCost
target_cost = "const additionalCost = additionalNights > 0 ? additionalNights * stay.pricePerNight : 0;"
replacement_cost = "const additionalCost = Number(additionalRent) || 0;"
content = content.replace(target_cost, replacement_cost)

# 4. Remove room rate info and add additionalRent input in the form
target_ui = re.compile(r'<div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">.*?</div>', re.DOTALL)
replacement_ui = """<div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
              <p><strong>Current Checkout:</strong> {format(currentOut, 'dd MMM yyyy, hh:mm a')}</p>
            </div>"""
content = re.sub(target_ui, replacement_ui, content)


# 5. Add input for Additional Rent before Payment
target_input = re.compile(r'\{additionalNights > 0 && \(\s*<div className="py-2 border-t border-b border-gray-100 my-2 text-sm">.*?</div>\s*\)\}', re.DOTALL)
replacement_input = """{additionalNights > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Rent to Charge (₹)</label>
                  <input type="number" required placeholder="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-bold"
                    value={additionalRent} onChange={e => setAdditionalRent(e.target.value)} />
                </div>
                <div className="py-2 border-t border-b border-gray-100 my-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Extending by:</span>
                    <span className="font-medium">{additionalNights} nights</span>
                  </div>
                  <div className="flex justify-between font-bold mt-1">
                    <span className="text-gray-900">Total Additional Cost:</span>
                    <span className="text-gray-900">₹{additionalCost}</span>
                  </div>
                </div>
              </>
            )}"""
content = re.sub(target_input, replacement_input, content)

with open('src/pages/receptionist/ExtendStayModal.jsx', 'w') as f:
    f.write(content)

print("ExtendStayModal patched.")
