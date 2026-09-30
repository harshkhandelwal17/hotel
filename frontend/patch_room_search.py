import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Add state variable
state_target = "const [customHoursInput, setCustomHoursInput] = useState('');"
state_replacement = "const [customHoursInput, setCustomHoursInput] = useState('');\n  const [roomSearchQuery, setRoomSearchQuery] = useState('');"
content = content.replace(state_target, state_replacement)

# 2. Update UI
ui_target = re.compile(r'<label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4 text-center">Tap to Select Room</label>\s*<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-\[250px\] overflow-y-auto p-1">\s*\{filteredRooms\.length === 0 \?', re.DOTALL)

ui_replacement = """<div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Select Room</label>
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input type="text" placeholder="Type Room No. to auto-select" 
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm text-gray-900 transition-colors"
                    value={roomSearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoomSearchQuery(val);
                      if (val.trim()) {
                        const exactMatch = filteredRooms.find(r => r.roomNumber.toLowerCase() === val.trim().toLowerCase());
                        if (exactMatch) setSelectedRoom(exactMatch);
                      }
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[250px] overflow-y-auto p-1">
                {filteredRooms.filter(r => r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())).length === 0 ?"""

content = re.sub(ui_target, ui_replacement, content)

# 3. Update map to use the filtered array
map_target = "} : filteredRooms.map(room => {"
map_replacement = "} : filteredRooms.filter(r => r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())).map(room => {"
content = content.replace(map_target, map_replacement)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Room Search UI applied.")
