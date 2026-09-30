import sys, re

with open('src/pages/receptionist/Dashboard.jsx', 'r') as f:
    content = f.read()

# 1. Update Title
content = content.replace('<h2 className="text-xl font-bold text-gray-900">Recent Check-ins</h2>', '<h2 className="text-xl font-bold text-gray-900">Active Stays (In-House)</h2>')

# 2. Add button in the list item
target_item = re.compile(r'<div className="text-right">\s*<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Checkout</p>\s*<p className="text-sm font-bold text-gray-900">\{format\(new Date\(stay\.expectedCheckOutDate\), \'dd MMM yyyy\'\)\}</p>\s*</div>', re.DOTALL)

replacement_item = """<div className="flex flex-col items-end gap-2 text-right">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Checkout At</p>
                          <p className="text-sm font-bold text-gray-900">{format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</p>
                        </div>
                        <Link to="/checkouts" className="px-4 py-1.5 bg-black text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-800 transition-colors shadow-sm">
                          Manage
                        </Link>
                      </div>"""

content = re.sub(target_item, replacement_item, content)

with open('src/pages/receptionist/Dashboard.jsx', 'w') as f:
    f.write(content)
print("Dashboard active stays patched.")
