import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    lines = f.readlines()

ui_logic = """
          {frequentCoGuests.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl mb-6">
              <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Users size={14} /> Quick Add Past Co-Guests
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                {frequentCoGuests.map(cg => (
                  <button key={cg._id} type="button" onClick={() => {
                    const emptyIdx = guests.findIndex((g, i) => i > 0 && !g.fullName);
                    if (emptyIdx !== -1) {
                      const updated = [...guests];
                      updated[emptyIdx] = { ...updated[emptyIdx], ...cg };
                      setGuests(updated);
                      toast({ message: `${cg.fullName} added!`, type: 'success' });
                    } else if (guests.length < selectedRoomDetails?.capacity) {
                      setGuests(prev => [...prev, { ...cg, isSearching: false }]);
                      setStayInfo(p => ({ ...p, occupants: p.occupants + 1 }));
                      toast({ message: `${cg.fullName} added!`, type: 'success' });
                    } else {
                      toast({ message: 'Room capacity reached!', type: 'error' });
                    }
                  }} className="shrink-0 flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                      {cg.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">{cg.fullName}</p>
                      {cg.mobileNumber && <p className="text-[10px] font-bold text-gray-500">{cg.mobileNumber}</p>}
                    </div>
                    <Plus size={16} className="text-blue-500 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
"""

lines.insert(1275, ui_logic)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.writelines(lines)

print("UI injected.")
