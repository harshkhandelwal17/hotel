import sys, re

with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

# Remove discountAmount from destructuring
content = content.replace(', discountAmount', '')

# Remove discount calculation
content = re.sub(r'\s*const finalDiscount = Number\(discountAmount\) \|\| 0;\n', '\n', content)
# Update totalAmount calculation if it subtracts finalDiscount
content = re.sub(r'totalAmount = Math\.max\(0, totalAmount - finalDiscount\);', 'totalAmount = Math.max(0, totalAmount);', content)

# Remove discountAmount from Stay.create
content = re.sub(r'\s*discountAmount:\s*finalDiscount,', '', content)

with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)
print("Removed discount logic from stayController.js")
