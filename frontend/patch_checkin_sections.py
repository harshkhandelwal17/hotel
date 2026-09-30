import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Update text-[10px] labels to text-xs
content = content.replace('text-[10px] font-bold text-gray-500', 'text-xs font-black text-gray-500 tracking-wider')
content = content.replace('text-[10px] uppercase font-bold', 'text-xs uppercase font-black')
content = content.replace('text-[10px] font-bold mt-1 uppercase', 'text-xs font-black mt-1 uppercase')

# 2. Add Section 1 (Guests & Duration) header & wrapper
# Wait, "1. Super Simple Duration & Occupants" is just a comment. Let's find it.
target_sec1 = r'\{/\* 1\. Super Simple Duration & Occupants \*/\}\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-6">'
replacement_sec1 = r"""{/* 1. Guests & Duration Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">1</div>
                 <h3 className="text-xl font-black text-gray-900">Guests & Duration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">"""
content = re.sub(target_sec1, replacement_sec1, content)

# Close the wrapper before "2. Select Room"
target_sec2 = r'\{/\* 2\. Select Room \*/\}\s*<div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">'
replacement_sec2 = r"""</div>
            </div>

            {/* 2. Select Room Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">2</div>
                 <h3 className="text-xl font-black text-gray-900">Select Room</h3>
              </div>
              <div>"""
content = re.sub(target_sec2, replacement_sec2, content)
# We need to remove the internal `flex flex-col md:flex-row justify-between` wrapper label
content = content.replace('<label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Select Room</label>', '')

# 3. Add Section 3 (Billing) header & wrapper
target_sec3 = r'\{/\* 3\. Billing & Payment & Commission \*/\}\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-6">'
replacement_sec3 = r"""</div>
            </div>

            {/* 3. Billing & Commission Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">3</div>
                 <h3 className="text-xl font-black text-gray-900">Payment & Billing</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">"""
content = re.sub(target_sec3, replacement_sec3, content)

# Remove the inner billing label
content = content.replace('<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2"><CreditCard size={16}/> Payment & Billing</label>', '')

# Close the last section wrapper before the buttons
target_sec_close = r'<div className="pt-6 flex justify-end border-t border-gray-100">'
replacement_sec_close = r"""</div>
            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">"""
content = content.replace(target_sec_close, replacement_sec_close)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Step 1 structured perfectly for mobile sections.")
