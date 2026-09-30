import sys, re

with open('src/pages/admin/ManageRooms.jsx', 'r') as f:
    content = f.read()

# 1. emptyForm
content = content.replace("capacity: 2,\n  price12h: '', price24h: '',\n  extraPerPerson12h: '', extraPerPerson24h: ''", "")

# 2. handleEdit
content = content.replace("capacity: room.capacity || 2,\n      price12h: room.price12h || '',\n      price24h: room.price24h || '',\n      extraPerPerson12h: room.extraPerPerson12h || '',\n      extraPerPerson24h: room.extraPerPerson24h || ''", "")

# 3. Form Inputs - We need to remove the whole sections for Capacity and Pricing.
# It's better to just regex remove them.
# The inputs are in a grid.
# Removing Capacity:
pattern_cap = re.compile(r'<div>\s*<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Max Capacity</label>.*?</div>', re.DOTALL)
content = re.sub(pattern_cap, '', content, count=1)

# Removing Pricing sections:
pattern_pricing = re.compile(r'<div>\s*<h3 className="font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">Pricing.*?</label>\s*<input.*?</div>\s*</div>\s*</div>\s*</div>', re.DOTALL)
content = re.sub(pattern_pricing, '', content)

# Also remove capacity from the room card display
content = content.replace(" (Max: {room.capacity})", "")

with open('src/pages/admin/ManageRooms.jsx', 'w') as f:
    f.write(content)

print("ManageRooms simplified.")
