import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

content = content.replace("const API = import.meta.env.VITE_API_URL || '';", "const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';")

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("API fallback fixed")
