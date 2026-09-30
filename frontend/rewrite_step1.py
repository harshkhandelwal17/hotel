import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Extract everything between {step === 1 && ( and )} for step 2
pattern = re.compile(r'\{\s*/\*\s*───\s*STEP 1: Room & Occupants.*?\{\s*/\*\s*───\s*STEP 2: Guests Info', re.DOTALL)

# Build the perfect Step 1 block
new_step_1 = """{/* ─── STEP 1: Room & Occupants ────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="p-2 sm:p-4 space-y-6">
            
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center"><Bed size={24} className="text-white"/></div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Express Check-In Setup</h2>
                <p className="text-sm font-semibold text-gray-500">Configure duration, allocate room and setup billing instantly.</p>
              </div>
            </div>

            {/* 1. Guests & Duration Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-7 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">1</div>
                 <h3 className="text-xl font-black text-gray-900">Guests & Duration</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Occupants */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 flex flex-col justify-center items-center">
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-4">How many Guests?</label>
                  <div className="flex items-center gap-4 sm:gap-6 bg-white p-2 sm:p-3 rounded-full shadow-sm border border-gray-200">
                    <button type="button" onClick={() => handleOccupantsChange(Math.max(1, stayInfo.occupants - 1))}
                      className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-2xl font-black">
                      -
                    </button>
                    <span className="text-4xl font-black text-gray-900 w-12 text-center">{stayInfo.occupants}</span>
                    <button type="button" onClick={() => handleOccupantsChange(stayInfo.occupants + 1)}
                      className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-2xl font-black">
                      +
                    </button>
                  </div>
                </div>

                {/* Duration */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <label className="block text-xs font-black text-gray-700 uppercase tracking-widest mb-4 text-center">Stay Duration</label>
                  
                  {/* Quick Presets */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 0, stayHours: 12, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm")})}
                      className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-xs sm:text-sm">
                      12 Hours
                    </button>
                    <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 1, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm")})}
                      className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-xs sm:text-sm">
                      1 Day
                    </button>
                    <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 2, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 2), "yyyy-MM-dd'T'HH:mm")})}
                      className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-xs sm:text-sm">
                      2 Days
                    </button>
                  </div>

                  {/* Manual Steppers */}
                  <div className="flex justify-center gap-2 sm:gap-4">
                    {/* Days Stepper */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Days</span>
                      <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                         <button type="button" onClick={() => {
                           const newD = Math.max(0, (stayInfo.stayDays || 0) - 1);
                           setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                         }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                         <span className="px-2 sm:px-4 font-black text-lg w-10 sm:w-12 text-center">{stayInfo.stayDays || 0}</span>
                         <button type="button" onClick={() => {
                           const newD = (stayInfo.stayDays || 0) + 1;
                           setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                         }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                      </div>
                    </div>
                    <span className="text-2xl font-black text-gray-300 self-end mb-2">+</span>
                    {/* Hours Stepper */}
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">Hours</span>
                      <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                         <button type="button" onClick={() => {
                           const newH = Math.max(0, (stayInfo.stayHours || 0) - 1);
                           setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                         }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                         <span className="px-2 sm:px-4 font-black text-lg w-10 sm:w-12 text-center">{stayInfo.stayHours || 0}</span>
                         <button type="button" onClick={() => {
                           const newH = (stayInfo.stayHours || 0) + 1;
                           setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                         }} className="px-3 sm:px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Live Checkout Time Display */}
                  <div className="mt-4 text-center bg-green-50 py-3 rounded-xl border border-green-200">
                    <p className="text-xs uppercase font-black text-green-700 tracking-wider">Checkout At</p>
                    <p className="font-black text-green-900 text-lg">{format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Select Room Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-7 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">2</div>
                 <h3 className="text-xl font-black text-gray-900">Select Room</h3>
              </div>
              
              <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="relative w-full md:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                  <input type="text" placeholder="Type Room No. to auto-select" 
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm text-gray-900 transition-colors"
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
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-1">
                {filteredRooms.filter(r => r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())).length === 0 ? (
                  <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Bed size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm">No rooms available</p>
                  </div>
                ) : filteredRooms.map(room => {
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                      className={`relative p-5 rounded-2xl border-2 text-center transition-all ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-xl transform scale-[1.05]' : 'border-gray-200 hover:border-blue-300 bg-white shadow-sm'}`}>
                      <p className={`font-black text-2xl ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                      <p className={`text-xs font-black mt-1 uppercase tracking-widest ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{room.roomType}</p>
                      {isSelected && (
                        <div className="absolute -top-2 -right-2 bg-white text-blue-600 rounded-full p-1 shadow-md">
                          <CheckCircle2 size={16} className="fill-current" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Payment & Billing Section */}
            <div className="bg-white border border-gray-200 p-5 sm:p-7 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                 <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">3</div>
                 <h3 className="text-xl font-black text-gray-900">Payment & Billing</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Billing */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Agreed Total Rent (₹)</label>
                      <input type="number" required placeholder="0" className="w-full px-5 py-4 bg-blue-50/50 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-3xl text-blue-900 shadow-inner"
                        value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Advance Paid (₹)</label>
                      <input type="number" placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900 text-lg"
                        value={initialPayment} onChange={e => setInitialPayment(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Discount (₹)</label>
                      <input type="number" placeholder="0" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900 text-lg"
                        value={stayInfo.discountAmount} onChange={e => setStayInfo({...stayInfo, discountAmount: e.target.value})} />
                    </div>
                  </div>
                </div>

                {/* Commission & Summary */}
                <div className="flex flex-col justify-between">
                  <div className="space-y-4">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Broker Commission (Optional)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <input type="text" placeholder="Broker/Auto Driver Name" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-sm text-gray-900"
                          value={stayInfo.commissionTo} onChange={e => setStayInfo({...stayInfo, commissionTo: e.target.value})} />
                      </div>
                      <div>
                        <input type="number" placeholder="Commission (₹)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                          value={stayInfo.commissionAmount} onChange={e => setStayInfo({...stayInfo, commissionAmount: e.target.value})} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-gray-200 flex justify-between items-center shadow-sm">
                    <span className="text-sm font-black text-gray-700 uppercase tracking-widest">Final Balance Due</span>
                    <span className={`text-2xl font-black ${Number(totalAmount) - Number(initialPayment) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{Math.max(0, Number(totalAmount) - Number(initialPayment))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-8 py-4 rounded-2xl font-black text-base flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 shadow-xl uppercase tracking-widest"
                onClick={() => setStep(2)} disabled={!canProceed1}>
                Next: Guest Details <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Guests Info"""

content = re.sub(pattern, new_step_1, content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Step 1 successfully rewritten with 100% precision.")
