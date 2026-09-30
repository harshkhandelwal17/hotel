import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# I will find everything from `<div className="border-t border-gray-200 pt-5 space-y-3">` to `<p className="font-black text-2xl text-gray-900">₹{grossTotal}</p>` and close it properly.
start_idx = content.find('<div className="border-t border-gray-200 pt-5 space-y-3">')
if start_idx != -1:
    end_string = '<p className="font-black text-2xl text-gray-900">₹{grossTotal}</p>\n                </div>\n              </div>'
    end_idx = content.find(end_string, start_idx)
    if end_idx != -1:
        end_idx += len(end_string)
        
        replacement = """<div className="border-t border-gray-200 pt-5 mt-5">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                  <p className="text-sm font-bold text-gray-600 uppercase">Gross Total</p>
                  <p className="font-black text-2xl text-gray-900">₹{grossTotal}</p>
                </div>
              </div>"""
        
        content = content[:start_idx] + replacement + content[end_idx:]

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Manual replacement done")
