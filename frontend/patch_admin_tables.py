import sys, re, os

# Fix ManageStaff
if os.path.exists('src/pages/admin/ManageStaff.jsx'):
    with open('src/pages/admin/ManageStaff.jsx', 'r') as f:
        content = f.read()
    
    target = '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">'
    rep = '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">'
    content = content.replace(target, rep)
    
    with open('src/pages/admin/ManageStaff.jsx', 'w') as f:
        f.write(content)

# Fix PaymentsList (if any)
if os.path.exists('src/pages/admin/PaymentsList.jsx'):
    with open('src/pages/admin/PaymentsList.jsx', 'r') as f:
        content = f.read()
    
    target = '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">'
    rep = '<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden overflow-x-auto">'
    content = content.replace(target, rep)
    
    with open('src/pages/admin/PaymentsList.jsx', 'w') as f:
        f.write(content)

print("Admin tables patched")
