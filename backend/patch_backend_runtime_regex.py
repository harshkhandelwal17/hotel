import sys, re

with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

# 1. createStay Logic
pattern_create = re.compile(r'// Get Room price.*?// Apply discount.*?totalAmount = Math\.max\(0, totalAmount - \(Number\(discountAmount\) \|\| 0\)\);', re.DOTALL)
new_create = """// Runtime pricing - Total Amount is provided directly by receptionist
    let totalAmount = Number(req.body.totalAmount) || 0;
    totalAmount = Math.max(0, totalAmount - (Number(discountAmount) || 0));"""

content = re.sub(pattern_create, new_create, content)

# 2. extendStay Logic
pattern_extend = re.compile(r'const extraPersons = Math\.max\(0, numOccupants -.*?stay\.totalAmount \+= additionalCost;', re.DOTALL)
new_extend = """// Runtime pricing for extension
    const additionalCost = Number(req.body.additionalRent) || 0;
    stay.totalAmount += additionalCost;"""

content = re.sub(pattern_extend, new_extend, content)

with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)

print("Backend runtime pricing applied with regex.")
