import sys, re

with open('src/pages/receptionist/CheckoutList.jsx', 'r') as f:
    content = f.read()

# Make search bar massive
target_header = re.compile(r'<div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">.*?</div>\s*</div>\s*</div>', re.DOTALL)

replacement_header = """<div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Manage Checkouts</h1>
            <p className="text-gray-500 font-medium mt-1">Search by room or guest to process checkouts instantly.</p>
          </div>
          <button onClick={downloadCSV} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2 shadow-sm"><Download size={16} /> Export CSV</button>
        </div>

        {/* Massive Search Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={24} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Room No. (e.g. 101) or Guest Name..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>"""

content = re.sub(target_header, replacement_header, content)

# I will also modify the Checkout button in the list to be massive and primary
target_btn = '<button onClick={() => setSelectedStay(stay)} className="px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap">Process Checkout</button>'
replacement_btn = '<button onClick={() => setSelectedStay(stay)} className="px-6 py-2.5 bg-black text-white text-sm font-black uppercase tracking-wide rounded-xl hover:bg-gray-800 transition-colors whitespace-nowrap shadow-md active:scale-95">Checkout</button>'
content = content.replace(target_btn, replacement_btn)

with open('src/pages/receptionist/CheckoutList.jsx', 'w') as f:
    f.write(content)
print("CheckoutList UI upgraded.")
