import sys

with open('src/models/Stay.js', 'r') as f:
    content = f.read()

target = """  additionalCharges: {
    type: Number,
    default: 0
  },"""

replacement = """  additionalCharges: {
    type: Number,
    default: 0
  },
  commissionTo: {
    type: String,
    trim: true
  },
  commissionAmount: {
    type: Number,
    default: 0
  },"""

content = content.replace(target, replacement)

with open('src/models/Stay.js', 'w') as f:
    f.write(content)
print("Stay model patched with commission fields.")
