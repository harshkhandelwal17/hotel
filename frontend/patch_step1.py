import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Pattern for Step 1 block
pattern = re.compile(r'\{\s*step === 1 && \(\s*<div className="p-7 space-y-8">.*?Next: Guest Details <ChevronRight size=\{18\} />\s*</button>\s*</div>\s*</div>\s*\)\s*\}', re.DOTALL)


replacement = """{step === 1 && (
          <div className="p-7 space-y-8">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Bed size={20} /></div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Stay & Room Details</h2>
                <p className="text-xs text-gray-500">Configure duration, select a room, and collect payment</p>
              </div>
            </div>

            {/* 1. Stay Duration & Occupants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Duration & Timings</label>
                <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" placeholder="0" className="w-16 px-3 py-2 bg-white border border-gray-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-black"
                      value={stayInfo.stayDays} 
                      onChange={e => {
                        const days = Number(e.target.value) || 0;
                        setStayInfo({ ...stayInfo, stayDays: days, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), days), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm") });
                      }}
                    />
                    <span className="text-sm font-bold text-gray-600">Days</span>
                  </div>
                  <div className="text-gray-400 font-black">+</div>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" max="23" placeholder="0" className="w-16 px-3 py-2 bg-white border border-gray-200 rounded-lg text-center font-bold outline-none focus:ring-2 focus:ring-black"
                      value={stayInfo.stayHours} 
                      onChange={e => {
                        const hrs = Number(e.target.value) || 0;
                        setStayInfo({ ...stayInfo, stayHours: hrs, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), hrs), "yyyy-MM-dd'T'HH:mm") });
                      }}
                    />
                    <span className="text-sm font-bold text-gray-600">Hours</span>
                  </div>
                  <div className="w-full mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Check-in</p>
                      <input type="datetime-local" required className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-md font-bold focus:ring-2 focus:ring-black outline-none"
                        value={stayInfo.checkInDate}
                        onChange={e => {
                          const newIn = new Date(e.target.value);
                          setStayInfo({ ...stayInfo, checkInDate: e.target.value, expectedCheckOutDate: format(addHours(addDays(newIn, stayInfo.stayDays || 0), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm") });
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Expected Check-out</p>
                      <input type="datetime-local" required className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-md font-bold focus:ring-2 focus:ring-black outline-none"
                        value={stayInfo.expectedCheckOutDate}
                        onChange={e => setStayInfo({ ...stayInfo, expectedCheckOutDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Total Occupants</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} type="button" onClick={() => handleOccupantsChange(n)}
                      className={`flex-1 py-4 rounded-xl font-bold text-sm border transition-all ${stayInfo.occupants === n ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                      {n}
                    </button>
                  ))}
                  <input type="number" min="1" max="20"
                    className={`w-16 py-4 text-center rounded-xl font-bold text-sm border outline-none transition-all ${stayInfo.occupants > 4 ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    placeholder="5+" value={stayInfo.occupants > 4 ? stayInfo.occupants : ''}
                    onChange={e => handleOccupantsChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Select Room */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center justify-between">
                <span>Select Available Room</span>
                {selectedRoom && <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">Selected: {selectedRoom.roomNumber}</span>}
              </label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3 max-h-[220px] overflow-y-auto pr-2 pb-2">
                {filteredRooms.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Bed size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No rooms available</p>
                  </div>
                ) : filteredRooms.map(room => {
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                      <p className={`font-black text-xl ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                      <p className={`text-[10px] font-bold mt-1 ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Billing & Payment & Commission */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-100 pt-6">
              
              {/* Billing */}
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-2"><CreditCard size={16}/> Payment & Billing</label>
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Agreed Total Rent (₹)</label>
                    <input type="number" required placeholder="0" className="w-full px-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-2xl text-blue-900"
                      value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Advance Paid (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                      value={initialPayment} onChange={e => setInitialPayment(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Discount (₹)</label>
                    <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                      value={stayInfo.discountAmount} onChange={e => setStayInfo({...stayInfo, discountAmount: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Commission & Summary */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Broker / Commission (Optional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referred By (Name/Auto)</label>
                      <input type="text" placeholder="e.g. Auto Driver" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                        value={stayInfo.commissionTo} onChange={e => setStayInfo({...stayInfo, commissionTo: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Commission Amount (₹)</label>
                      <input type="number" placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                        value={stayInfo.commissionAmount} onChange={e => setStayInfo({...stayInfo, commissionAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center">
                  <div>
                     <p className="text-xs font-bold text-gray-500 uppercase">Balance Due</p>
                     <p className={`font-black text-xl ${total - Number(initialPayment || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{Math.max(0, total - Number(initialPayment || 0))}
                     </p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs font-bold text-gray-500 uppercase">Final Total</p>
                     <p className="font-black text-2xl text-gray-900">₹{total}</p>
                  </div>
                </div>
              </div>

            </div>

            <div className="pt-6 flex justify-end border-t border-gray-100">
              <button type="button" className="bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md text-sm uppercase tracking-wide"
                onClick={() => setStep(2)} disabled={!canProceed1}>
                Next: Guest Details <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}"""

content = re.sub(pattern, replacement, content)

# I need to ensure we don't have broken imports or leftovers in the file.
# The Billing Summary replacement from patch_checkin_runtime.py is still in CheckIn.jsx somewhere?
# No, it was inside step 1, so the regex re.sub should wipe it out cleanly!

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Step 1 UI revamped.")
