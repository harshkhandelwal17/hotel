import sys

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

target = """    durationOption: '24h',
    discountAmount: 0,
    occupants: 1,
    paymentMethod: 'Cash'
  });"""

replacement = """    durationOption: 'custom',
    stayDays: 1,
    stayHours: 0,
    discountAmount: 0,
    occupants: 1,
    paymentMethod: 'Cash',
    commissionTo: '',
    commissionAmount: ''
  });"""

content = content.replace(target, replacement)
with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("State patched.")
