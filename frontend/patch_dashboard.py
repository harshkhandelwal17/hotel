import sys

with open('src/pages/receptionist/Dashboard.jsx', 'r') as f:
    content = f.read()

target = '<div className="flex items-center justify-between">'
rep = '<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">'
content = content.replace(target, rep)

target2 = '<div className="flex flex-col items-end gap-2 text-right">'
rep2 = '<div className="flex flex-col sm:items-end gap-2 sm:text-right">'
content = content.replace(target2, rep2)

with open('src/pages/receptionist/Dashboard.jsx', 'w') as f:
    f.write(content)
print("Dashboard recent stays patched")
