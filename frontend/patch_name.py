import sys, re

# 1. Patch index.html
with open('index.html', 'r') as f:
    content = f.read()
content = content.replace('<title>HotelPro - Management System</title>', '<title>NXHotel - Management System</title>')
with open('index.html', 'w') as f:
    f.write(content)

# 2. Patch AppLayout.jsx
with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()
content = content.replace('Hotel<span className="text-gray-400">Pro</span>', 'NX<span className="text-gray-400">Hotel</span>')
with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)

# 3. Patch Login.jsx
with open('src/pages/auth/Login.jsx', 'r') as f:
    content = f.read()
content = content.replace('Hotel<span className="text-gray-400">Pro</span>', 'NX<span className="text-gray-400">Hotel</span>')
content = content.replace('Hotel Management System • Secure Login', 'NXHotel Management System • Secure Login')
with open('src/pages/auth/Login.jsx', 'w') as f:
    f.write(content)

print("App name changed to NXHotel across the board.")
