import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. State updates
content = content.replace(
    "const [initialPayment, setInitialPayment] = useState('');",
    "const [initialPayment, setInitialPayment] = useState('');\n  const [totalAmount, setTotalAmount] = useState('');\n  const [customHoursInput, setCustomHoursInput] = useState('');"
)

# 2. Payload updates
content = content.replace(
    "initialPaymentAmount: Number(initialPayment) || 0,\n        paymentMethod: stayInfo.paymentMethod,\n        hostel: selectedRoom.hostel._id || selectedRoom.hostel\n      });",
    "totalAmount: Number(totalAmount) || 0,\n        initialPaymentAmount: Number(initialPayment) || 0,\n        paymentMethod: stayInfo.paymentMethod,\n        hostel: selectedRoom.hostel._id || selectedRoom.hostel\n      });"
)

# 3. Billing Math replacement
billing_target = """// Billing Math
  const extraPersons = Math.max(0, stayInfo.occupants - (selectedRoom?.capacity || 1));
  const extraPerPerson = selectedRoom ? (stayInfo.durationOption === '12h' ? (selectedRoom.extraPerPerson12h || 0) : (selectedRoom.extraPerPerson24h || 0)) : 0;
  const extraCharge = extraPersons * extraPerPerson;
  const customHours = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null;
  const customRate = customHours ? selectedRoom?.customRates?.find(r => r.hours === customHours)?.price || 0 : 0;
  const basePrice = selectedRoom ? (stayInfo.durationOption === '12h' ? selectedRoom.price12h : (customHours ? customRate : selectedRoom.price24h)) : 0;
  const pricePerUnit = basePrice + (customHours ? 0 : extraCharge);
  const grossTotal = (stayInfo.durationOption === '12h' || customHours) ? pricePerUnit : pricePerUnit * nights;
  const total = Math.max(0, grossTotal - Number(stayInfo.discountAmount || 0));"""

billing_replacement = """// Billing Math Runtime
  const grossTotal = Number(totalAmount) || 0;
  const total = Math.max(0, grossTotal - Number(stayInfo.discountAmount || 0));"""

content = content.replace(billing_target, billing_replacement)

# 4. Global hours and Room Filtering
filter_target = """// Global Custom Hours from all rooms
  const globalCustomHours = Array.from(new Set(rooms.flatMap(r => r.customRates?.map(cr => cr.hours) || []))).sort((a, b) => a - b);
  
  // Filter available rooms
  const filteredRooms = rooms.filter(room => {
    if (!isRoomAvailable(room._id)) return false;
    if (room.capacity < stayInfo.occupants) return false;
    if (stayInfo.durationOption.startsWith('custom_')) {
      const hrs = parseInt(stayInfo.durationOption.split('_')[1], 10);
      const hasPkg = room.customRates?.some(cr => cr.hours === hrs);
      if (!hasPkg) return false;
    }
    return true;
  });"""

filter_replacement = """  // Filter available rooms
  const filteredRooms = rooms.filter(room => isRoomAvailable(room._id));"""
content = content.replace(filter_target, filter_replacement)

# 5. Duration buttons section
duration_target = re.compile(r'<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>.*?<p className="text-\[11px\] text-gray-500 mt-2 font-medium bg-blue-50/50 p-2 rounded border border-blue-100/50">\s*Choosing a package or changing occupants will automatically filter available rooms\.\s*</p>', re.DOTALL)
duration_replacement = """<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); setSelectedRoom(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Half day</p>
                    </button>
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); setSelectedRoom(null); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '24h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Calendar size={20} className={stayInfo.durationOption === '24h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">24 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Full day / Night</p>
                    </button>
                    <div className="col-span-2 mt-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Custom Hours</label>
                      <input type="number" min="1" placeholder="e.g. 6" value={customHoursInput} 
                        onChange={(e) => {
                          const hrs = e.target.value;
                          setCustomHoursInput(hrs);
                          if(hrs && hrs > 0) {
                            setStayInfo({ ...stayInfo, durationOption: `custom_${hrs}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), parseInt(hrs)), "yyyy-MM-dd'T'HH:mm") });
                            setSelectedRoom(null);
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm" />
                    </div>
                  </div>"""
content = re.sub(duration_target, duration_replacement, content)

# 6. Room mapping card
room_render_target = re.compile(r'\{filteredRooms\.length === 0 \? \(\s*<div className="col-span-full.*?</div>\s*</button>\s*\);\s*\}\)\}', re.DOTALL)
room_render_replacement = """{filteredRooms.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Bed size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No rooms available</p>
                    </div>
                  ) : filteredRooms.map(room => {
                    const isSelected = selectedRoom?._id === room._id;
                    return (
                      <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType || 'Standard'}</p>
                          </div>
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                            <Bed size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                          </div>
                        </div>
                      </button>
                    );
                  })}"""
content = re.sub(room_render_target, room_render_replacement, content)

# 7. Billing details inside step 3 (Lines 473 - 492 equivalent)
# We will just replace everything from `<div className="border-t border-gray-200 pt-5 space-y-3">` up to the discount input.
billing_ui_target = re.compile(r'<div className="border-t border-gray-200 pt-5 space-y-3">.*?<div className="flex items-center gap-2 text-gray-700">', re.DOTALL)
billing_ui_replacement = """<div className="border-t border-gray-200 pt-5 mt-5">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl mb-4">
                  <p className="text-sm font-bold text-gray-600 uppercase">Agreed Total Rent (₹)</p>
                  <input type="number" required placeholder="0" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                        className="w-32 px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-black text-xl text-right text-gray-900 shadow-sm" />
                </div>
                
                <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-gray-200 mt-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-700">"""
content = re.sub(billing_ui_target, billing_ui_replacement, content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Applied all patches to CheckIn.jsx cleanly.")
