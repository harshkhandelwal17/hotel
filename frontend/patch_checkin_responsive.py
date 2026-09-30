import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Main container padding
content = content.replace('<div className="p-7 space-y-8">', '<div className="p-4 sm:p-7 space-y-8">')
content = content.replace('<div className="p-7 space-y-6">', '<div className="p-4 sm:p-7 space-y-6">')

# 2. Occupant Stepper Gap
content = content.replace('gap-6 bg-white p-3', 'gap-4 sm:gap-6 bg-white p-2 sm:p-3')
content = content.replace('w-14 h-14', 'w-12 h-12 sm:w-14 sm:h-14')

# 3. Duration Presets text
content = content.replace('text-sm">\\n                    12 Hours', 'text-xs sm:text-sm">\\n                    12 Hours')
content = content.replace('text-sm">\\n                    1 Day', 'text-xs sm:text-sm">\\n                    1 Day')
content = content.replace('text-sm">\\n                    2 Days', 'text-xs sm:text-sm">\\n                    2 Days')

# 4. Manual Steppers Gap
content = content.replace('flex justify-center gap-4', 'flex justify-center gap-2 sm:gap-4')
content = content.replace('px-4 py-2 bg-gray-50', 'px-3 sm:px-4 py-2 bg-gray-50')
content = content.replace('px-4 font-black text-lg w-12 text-center', 'px-2 sm:px-4 font-black text-lg w-10 sm:w-12 text-center')

# 5. Billing and Commission forced grid-cols-2 -> grid-cols-1 sm:grid-cols-2
content = content.replace('<div className="grid grid-cols-2 gap-4">', '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">')

# 6. Guest card padding
content = content.replace('<div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 relative">', '<div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 relative">')
content = content.replace('<div className="bg-gray-50 px-5 py-3', '<div className="bg-gray-50 px-4 sm:px-5 py-3')

# 7. Navigation Buttons
target_nav1 = '<div className="pt-6 flex justify-end border-t border-gray-100">'
replacement_nav1 = '<div className="pt-6 flex justify-end border-t border-gray-100">'
# Actually, the button itself:
content = content.replace('<button type="button" className="bg-black text-white px-8 py-3.5', '<button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-8 py-3.5')

target_nav2 = '<div className="pt-6 flex justify-between border-t border-gray-100">'
replacement_nav2 = '<div className="pt-6 flex flex-col sm:flex-row justify-between gap-3 border-t border-gray-100">'
content = content.replace(target_nav2, replacement_nav2)
# And make the buttons inside it w-full on mobile
content = content.replace('<button className="text-gray-500 px-5 py-3', '<button className="w-full sm:w-auto text-center text-gray-500 px-5 py-3')
content = content.replace('<button type="button" className="bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2', '<button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2')

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn.jsx made fully mobile responsive.")
