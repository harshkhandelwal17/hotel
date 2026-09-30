import sys, re

with open('src/models/Stay.js', 'r') as f:
    content = f.read()

target = """  basePrice: { // Replaces pricePerNight
    type: Number,
    required: true
  },"""

replacement = """  basePrice: { // Deprecated but kept for backward compatibility
    type: Number,
    default: 0
  },"""

content = content.replace(target, replacement)

with open('src/models/Stay.js', 'w') as f:
    f.write(content)
print("Stay model basePrice requirement removed.")
