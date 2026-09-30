import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Add states for totalAmount and customHours
state_target = "const [initialPayment, setInitialPayment] = useState('');"
state_replacement = """const [initialPayment, setInitialPayment] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [customHoursInput, setCustomHoursInput] = useState('');"""
content = content.replace(state_target, state_replacement)

# Update payload to include totalAmount
payload_target = """        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel
      });"""
payload_replacement = """        totalAmount: Number(totalAmount) || 0,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel
      });"""
content = content.replace(payload_target, payload_replacement)


# Replace globalCustomHours and filtering
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
filter_replacement = """  // Simple filter for available rooms only (Runtime pricing allows any room for any duration)
  const filteredRooms = rooms.filter(room => isRoomAvailable(room._id));"""
content = content.replace(filter_target, filter_replacement)

# Replace Billing Math
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

# Replace Duration Buttons
duration_target = re.compile(r'<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>.*?<p className="text-\[11px\] text-gray-500 mt-2 font-medium bg-blue-50/50 p-2 rounded border border-blue-100/50">\s*Choosing a package or changing occupants will automatically filter available rooms\.\s*</p>', re.DOTALL)
duration_replacement = """<label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Stay Duration</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); }}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === '12h' ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <Clock size={20} className={stayInfo.durationOption === '12h' ? 'text-black' : 'text-gray-400'} />
                      <p className="font-bold text-gray-900 mt-2">12 Hours</p>
                      <p className="text-xs text-gray-500 mt-0.5">Half day</p>
                    </button>
                    <button type="button" onClick={() => { setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm") }); setCustomHoursInput(''); }}
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
                          }
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm" />
                    </div>
                  </div>"""
content = re.sub(duration_target, duration_replacement, content)


# Replace Room Card rendering
room_render_target = re.compile(r'\{filteredRooms\.length === 0 \? \(\s*<div className="col-span-full.*?</button>\s*\);\s*\}\)\}', re.DOTALL)
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

# Replace Billing Section (Total Amount Input)
billing_ui_target = re.compile(r'\{/\* Billing Summary \*/\}.*?Total Amount</p>\s*<p className="font-black text-2xl text-gray-900">₹\{total\}</p>\s*</div>\s*</div>\s*</div>\s*</div>', re.DOTALL)
billing_ui_replacement = """{/* Billing Summary */}
              <div className="mt-8 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={18} /> Payment & Billing</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Agreed Total Rent (₹)</label>
                      <input type="number" required placeholder="Enter total amount to charge" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-lg text-gray-900" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Discount (₹)</label>
                        <input type="number" placeholder="0" value={stayInfo.discountAmount} onChange={e => setStayInfo({ ...stayInfo, discountAmount: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Advance Paid (₹)</label>
                        <input type="number" placeholder="0" value={initialPayment} onChange={e => setInitialPayment(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Agreed Rent</span>
                      <span className="font-bold text-gray-900">₹{grossTotal}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-500 font-medium">Discount</span>
                      <span className="font-bold text-red-600">- ₹{stayInfo.discountAmount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600 font-medium">Advance Paid</span>
                      <span className="font-bold text-green-700">- ₹{initialPayment || 0}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Final Total</p>
                      <p className="font-black text-3xl text-gray-900">₹{total}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-0.5">Balance Due</p>
                      <p className={`font-black text-xl ${total - Number(initialPayment || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{Math.max(0, total - Number(initialPayment || 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>"""

content = re.sub(billing_ui_target, billing_ui_replacement, content)


with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Patched CheckIn UI and Logic.")
