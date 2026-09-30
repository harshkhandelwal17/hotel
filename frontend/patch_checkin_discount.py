import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Remove initial state
content = re.sub(r'\s*discountAmount:\s*0,', '', content)

# Fix total calculation inside useEffect (if it calculates base prices)
content = re.sub(r'const total = Math\.max\(0, grossTotal - Number\(stayInfo\.discountAmount \|\| 0\)\);', 'const total = Math.max(0, grossTotal);', content)

# Remove payload submission field
content = re.sub(r'\s*discountAmount:\s*Number\(stayInfo\.discountAmount\)\s*\|\|\s*0,', '', content)

# Remove the UI Block
ui_pattern = re.compile(r'<div>\s*<label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Discount \(₹\)</label>\s*<input type="number".*?discountAmount: e\.target\.value\}\)} />\s*</div>', re.DOTALL)
content = re.sub(ui_pattern, '', content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Discount completely removed from CheckIn.jsx")
