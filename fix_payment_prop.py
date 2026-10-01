import sys
import re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

content = re.sub(r'paidAmount:\s*stayInfo\.paidAmount,', 'initialPaymentAmount: stayInfo.paidAmount,', content)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Regex replace done.")
