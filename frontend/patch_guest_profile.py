import sys

with open('src/pages/receptionist/GuestProfile.jsx', 'r') as f:
    content = f.read()

target = 'className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between"'
rep = 'className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"'
content = content.replace(target, rep)

target2 = '<div className="flex items-center space-x-4">'
rep2 = '<div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">'
content = content.replace(target2, rep2)

target3 = '<div className="overflow-x-auto">' # If it has table wrapper
if target3 not in content:
    # Add overflow-x-auto to the table wrapper
    content = content.replace('<table className="min-w-full divide-y divide-gray-200">', '<div className="overflow-x-auto">\n<table className="min-w-full divide-y divide-gray-200">')
    content = content.replace('</table>', '</table>\n</div>')

with open('src/pages/receptionist/GuestProfile.jsx', 'w') as f:
    f.write(content)
print("GuestProfile layout patched")
