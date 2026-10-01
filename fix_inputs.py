import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

content = content.replace("Math.max(0, e.target.value)", "e.target.value === '' ? '' : Math.max(0, e.target.value)")

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Inputs fixed")
