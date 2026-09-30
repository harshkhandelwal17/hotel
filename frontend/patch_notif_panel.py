import sys, re

with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

target = 'className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2"'
rep = 'className="absolute right-0 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2"'

content = content.replace(target, rep)

with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("Notif panel responsive width patched")
