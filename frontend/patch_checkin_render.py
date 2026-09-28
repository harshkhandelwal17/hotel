import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

# We want to find the whole `{rooms.map(room => { ... })}` block
# Let's find it by identifying the grid container
start = content.find('{rooms.map(room => {')
end = content.find('</button>\n                    );\n                  })}')
if start != -1 and end != -1:
    old_block = content[start:end + len('</button>\n                    );\n                  })}')]
    new_block = """{filteredRooms.length === 0 ? (
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
                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-black bg-black text-white shadow-md transform scale-[1.02]' : 'border-gray-100 hover:border-gray-300 bg-white'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className={`font-black text-lg ${isSelected ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</p>
                            <p className={`text-xs font-bold mt-0.5 ${isSelected ? 'text-gray-300' : 'text-indigo-600'}`}>{room.roomType || 'Standard'} (Max: {room.capacity})</p>
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
    content = content.replace(old_block, new_block)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched rendering logic")
