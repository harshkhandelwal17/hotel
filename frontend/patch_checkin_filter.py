import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

# 1. Add globalCustomHours derivation right after rooms state (or before rendering)
# We can put it right before `// Billing Math`
math_target = "// Billing Math"
math_replace = """// Global Custom Hours from all rooms
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
  });

  // Billing Math"""
content = content.replace(math_target, math_replace)

# 2. Update the custom duration buttons loop
old_loop_target = """                    {selectedRoom?.customRates?.map(rate => (
                      <button key={rate.hours} type="button" onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), rate.hours), "yyyy-MM-dd'T'HH:mm") })}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === `custom_${rate.hours}` ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                        <Clock size={20} className={stayInfo.durationOption === `custom_${rate.hours}` ? 'text-black' : 'text-gray-400'} />
                        <p className="font-bold text-gray-900 mt-2">{rate.hours} Hour{rate.hours > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Custom rate</p>
                      </button>
                    ))}
                  </div>
                  {(!selectedRoom || !selectedRoom.customRates?.length) && (
                    <p className="text-xs text-gray-400 mt-2">Select a room first to see custom hourly rates (if any).</p>
                  )}"""

new_loop_replace = """                    {globalCustomHours.map(hrs => (
                      <button key={hrs} type="button" 
                        onClick={() => {
                          setStayInfo({ ...stayInfo, durationOption: `custom_${hrs}`, expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), hrs), "yyyy-MM-dd'T'HH:mm") });
                          setSelectedRoom(null); // Deselect room if changing package, forces re-selection from filtered list
                        }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${stayInfo.durationOption === `custom_${hrs}` ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                        <Clock size={20} className={stayInfo.durationOption === `custom_${hrs}` ? 'text-black' : 'text-gray-400'} />
                        <p className="font-bold text-gray-900 mt-2">{hrs} Hour{hrs > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Custom Package</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2 font-medium bg-blue-50/50 p-2 rounded border border-blue-100/50">
                    Choosing a package or changing occupants will automatically filter available rooms.
                  </p>"""

# Wait, `addHours` and `format` might not be in scope if not matching exactly.
# I will use regex for safety or exact replace.
content = content.replace(old_loop_target, new_loop_replace)

# Also update the 12h and 24h buttons to deselect room just to be safe
content = content.replace(
    "onClick={() => setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), \"yyyy-MM-dd'T'HH:mm\") })}",
    "onClick={() => { setStayInfo({ ...stayInfo, durationOption: '12h', expectedCheckOutDate: format(addHours(new Date(stayInfo.checkInDate), 12), \"yyyy-MM-dd'T'HH:mm\") }); setSelectedRoom(null); }}"
)
content = content.replace(
    "onClick={() => setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), \"yyyy-MM-dd'T'HH:mm\") })}",
    "onClick={() => { setStayInfo({ ...stayInfo, durationOption: '24h', expectedCheckOutDate: format(addDays(new Date(stayInfo.checkInDate), 1), \"yyyy-MM-dd'T'HH:mm\") }); setSelectedRoom(null); }}"
)
# Update occupants change to deselect room if needed, but let's just do it directly on the input
content = content.replace(
    "onChange={e => handleOccupantChange(1)}",
    "onChange={e => { handleOccupantChange(1); setSelectedRoom(null); }}"
)
content = content.replace(
    "onChange={e => handleOccupantChange(-1)}",
    "onChange={e => { handleOccupantChange(-1); setSelectedRoom(null); }}"
)


# 3. Change `rooms.map` to `filteredRooms.map` and remove `available` logic since it's pre-filtered
rooms_render_target = """                  {rooms.map(room => {
                    const available = isRoomAvailable(room._id);
                    const isSelected = selectedRoom?._id === room._id;
                    const customHr = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null; const roomPrice = stayInfo.durationOption === '12h' ? room.price12h : (customHr ? (room.customRates?.find(r => r.hours === customHr)?.price || 0) : room.price24h);
                    return (
                      <button key={room._id} type="button" disabled={!available} onClick={() => setSelectedRoom(room)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : available ? 'border-gray-100 hover:border-gray-300 bg-white' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`text-xl font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-semibold ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType}</p>
                          </div>
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                            <Bed size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isSelected ? 'border-white/20' : 'border-gray-100'} text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          ₹{roomPrice || 0}
                          <span className={`font-normal text-xs ml-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>/ {stayInfo.durationOption === '12h' ? '12h' : 'night'}</span>
                          {!customHr && (stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h) > 0 && (
                            <span className={`block mt-1 text-[10px] uppercase ${isSelected ? 'text-gray-300' : 'text-blue-600'}`}>
                              +₹{stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h}/extra person
                            </span>
                          )}
                        </div>
                        {!available && (
                          <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px] bg-white/50 rounded-xl">
                            <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full border border-red-200">Occupied</span>
                          </div>
                        )}
                      </button>
                    );
                  })}"""

rooms_render_replace = """                  {filteredRooms.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <Bed size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No rooms available</p>
                      <p className="text-xs mt-1">Try changing duration or reducing occupants.</p>
                    </div>
                  ) : filteredRooms.map(room => {
                    const isSelected = selectedRoom?._id === room._id;
                    const customHr = stayInfo.durationOption.startsWith('custom_') ? parseInt(stayInfo.durationOption.split('_')[1], 10) : null; 
                    const roomPrice = stayInfo.durationOption === '12h' ? room.price12h : (customHr ? (room.customRates?.find(r => r.hours === customHr)?.price || 0) : room.price24h);
                    return (
                      <button key={room._id} type="button" onClick={() => setSelectedRoom(room)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`text-xl font-black ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-semibold ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType} (Max: {room.capacity})</p>
                          </div>
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                            <Bed size={16} className={isSelected ? 'text-white' : 'text-gray-500'} />
                          </div>
                        </div>
                        <div className={`mt-3 pt-3 border-t ${isSelected ? 'border-white/20' : 'border-gray-100'} text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                          ₹{roomPrice || 0}
                          <span className={`font-normal text-xs ml-1 ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>/ {customHr ? customHr+'h' : (stayInfo.durationOption === '12h' ? '12h' : 'night')}</span>
                          {!customHr && (stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h) > 0 && (
                            <span className={`block mt-1 text-[10px] uppercase ${isSelected ? 'text-gray-300' : 'text-blue-600'}`}>
                              +₹{stayInfo.durationOption === '12h' ? room.extraPerPerson12h : room.extraPerPerson24h}/extra person
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}"""

content = content.replace(rooms_render_target, rooms_render_replace)

# 4. Handle Occupants deselecting room correctly
occ_up = """<button type="button" onClick={() => handleOccupantChange(1)}"""
occ_up_rep = """<button type="button" onClick={() => { handleOccupantChange(1); setSelectedRoom(null); }}"""
content = content.replace(occ_up, occ_up_rep)

occ_dn = """<button type="button" onClick={() => handleOccupantChange(-1)}"""
occ_dn_rep = """<button type="button" onClick={() => { handleOccupantChange(-1); setSelectedRoom(null); }}"""
content = content.replace(occ_dn, occ_dn_rep)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched CheckIn filtering")
