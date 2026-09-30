import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Replace the first row (Duration & Timings) + Occupants with a super easy, massive touch-friendly UI.
# Let's completely replace the inner div of Step 1 up to the Billing section.

target = re.compile(r'\{/\* 1\. Stay Duration & Occupants \*/\}.*?\{/\* 3\. Billing & Payment & Commission \*/\}', re.DOTALL)

replacement = """{/* 1. Super Simple Duration & Occupants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Occupants */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-center items-center">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4">How many Guests?</label>
                <div className="flex items-center gap-6 bg-white p-3 rounded-full shadow-sm border border-gray-200">
                  <button type="button" onClick={() => handleOccupantsChange(Math.max(1, stayInfo.occupants - 1))}
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 transition-colors text-2xl font-black">
                    -
                  </button>
                  <span className="text-4xl font-black text-gray-900 w-12 text-center">{stayInfo.occupants}</span>
                  <button type="button" onClick={() => handleOccupantsChange(stayInfo.occupants + 1)}
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 active:bg-green-200 transition-colors text-2xl font-black">
                    +
                  </button>
                </div>
              </div>

              {/* Duration */}
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4 text-center">Stay Duration</label>
                
                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 0, stayHours: 12, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    12 Hours
                  </button>
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 1, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    1 Day
                  </button>
                  <button type="button" onClick={() => setStayInfo({...stayInfo, stayDays: 2, stayHours: 0, expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 2), "yyyy-MM-dd'T'HH:mm")})}
                    className="py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-black hover:text-white transition-colors shadow-sm text-sm">
                    2 Days
                  </button>
                </div>

                {/* Manual Steppers */}
                <div className="flex justify-center gap-4">
                  {/* Days Stepper */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Days</span>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                       <button type="button" onClick={() => {
                         const newD = Math.max(0, (stayInfo.stayDays || 0) - 1);
                         setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                       <span className="px-4 font-black text-lg w-12 text-center">{stayInfo.stayDays || 0}</span>
                       <button type="button" onClick={() => {
                         const newD = (stayInfo.stayDays || 0) + 1;
                         setStayInfo({...stayInfo, stayDays: newD, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), newD), stayInfo.stayHours || 0), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                    </div>
                  </div>
                  <span className="text-2xl font-black text-gray-300 self-end mb-2">+</span>
                  {/* Hours Stepper */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Hours</span>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                       <button type="button" onClick={() => {
                         const newH = Math.max(0, (stayInfo.stayHours || 0) - 1);
                         setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">-</button>
                       <span className="px-4 font-black text-lg w-12 text-center">{stayInfo.stayHours || 0}</span>
                       <button type="button" onClick={() => {
                         const newH = (stayInfo.stayHours || 0) + 1;
                         setStayInfo({...stayInfo, stayHours: newH, expectedCheckOutDate: format(addHours(addDays(new Date(stayInfo.checkInDate), stayInfo.stayDays || 0), newH), "yyyy-MM-dd'T'HH:mm")});
                       }} className="px-4 py-2 bg-gray-50 hover:bg-gray-100 font-black text-gray-600">+</button>
                    </div>
                  </div>
                </div>

                {/* Live Checkout Time Display */}
                <div className="mt-4 text-center bg-green-50 py-2 rounded-lg border border-green-200">
                  <p className="text-[10px] uppercase font-bold text-green-700">Guest will checkout at</p>
                  <p className="font-black text-green-900">{format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
            </div>

            {/* 2. Select Room */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <label className="block text-sm font-black text-gray-700 uppercase tracking-widest mb-4 text-center">Tap to Select Room</label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[250px] overflow-y-auto p-1">
                {filteredRooms.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Bed size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-sm">No rooms available</p>
                  </div>
                ) : filteredRooms.map(room => {
                  const isSelected = selectedRoom?._id === room._id;
                  return (
                    <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                      className={`relative p-4 rounded-2xl border-2 text-center transition-all ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-lg transform scale-[1.05]' : 'border-gray-200 hover:border-blue-300 bg-white'}`}>
                      <p className={`font-black text-2xl ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                      <p className={`text-[10px] font-bold mt-1 uppercase ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{room.roomType}</p>
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

            {/* 3. Billing & Payment & Commission */}"""

content = re.sub(target, replacement, content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn UI Ultra-Simplified")
