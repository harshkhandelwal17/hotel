import sys, re

with open('src/pages/admin/Reports.jsx', 'r') as f:
    content = f.read()

# 1. State/Stats logic
content = re.sub(r'\s*let totalDiscount = 0;', '', content)
content = re.sub(r'\s*totalDiscount \+= \(stay\.discountAmount \|\| 0\);', '', content)
content = re.sub(r'grossBooking, totalDiscount, totalCommission', 'grossBooking, totalCommission', content)

# 2. CSV Export
content = content.replace("'Booking Amount', 'Discount', 'Broker Name'", "'Booking Amount', 'Broker Name'")
# The template literal has `${stay.discountAmount || 0},` - need to use regex
csv_pattern = re.compile(r'\$\{stay\.totalAmount \|\| 0\},\$\{stay\.discountAmount \|\| 0\},')
content = re.sub(csv_pattern, '${stay.totalAmount || 0},', content)

# 3. Stats Card UI
card_pattern = re.compile(r'\s*<div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">\s*<p className="text-\[10px\] font-black text-gray-500 uppercase tracking-widest">Discounts Given</p>.*?</div>\s*</div>', re.DOTALL)
# Actually, it's safer to just remove the card div specifically. Let's find it.
card_start = content.find('<p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Discounts Given</p>')
if card_start != -1:
    div_start = content.rfind('<div className="bg-white', 0, card_start)
    div_end = content.find('</div>', card_start)
    div_end = content.find('</div>', div_end + 1)
    div_end = content.find('</div>', div_end + 1) # Close out the 3 nested divs inside
    content = content[:div_start] + content[div_end+6:]

# Oh wait, grid-cols for stats cards was 4, now 3.
content = content.replace('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4', 'grid-cols-1 sm:grid-cols-3')

# 4. Table UI
content = content.replace('<th className="px-6 py-4 font-black text-xs text-red-400 uppercase tracking-widest text-right">Discount</th>', '')

td_pattern = re.compile(r'<td className="px-6 py-4 text-right">\s*\{stay\.discountAmount > 0 \? \(\s*<span className="font-bold text-red-500 bg-red-50 px-2 py-0\.5 rounded">-₹\{stay\.discountAmount\}</span>\s*\) : <span className="text-gray-300">-</span>\}\s*</td>', re.DOTALL)
content = re.sub(td_pattern, '', content)

with open('src/pages/admin/Reports.jsx', 'w') as f:
    f.write(content)
print("Discount completely removed from Reports.jsx")
