import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Add State
state_target = "const [roomSearchQuery, setRoomSearchQuery] = useState('');"
state_rep = "const [roomSearchQuery, setRoomSearchQuery] = useState('');\\n  const [frequentCoGuests, setFrequentCoGuests] = useState([]);"
content = content.replace(state_target, state_rep)

# 2. Update searchGuest
search_target = """    try {
      const res = await axios.get(`${API}/api/guests?mobile=${mobile}`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        setGuests(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...res.data.data[0], isSearching: false };
          return updated;
        });
        toast({ message: 'Returning guest details auto-filled!', type: 'success' });
      } else {"""

search_rep = """    try {
      const res = await axios.get(`${API}/api/guests?mobile=${mobile}`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        const baseGuest = res.data.data[0];
        
        // Fetch full profile to get past stays & co-guests
        if (index === 0) {
          try {
            const detailRes = await axios.get(`${API}/api/guests/${baseGuest._id}`);
            const pastStays = detailRes.data.data.stays || [];
            
            // Extract unique co-guests
            const coGuestsMap = new Map();
            pastStays.forEach(stay => {
              if (stay.guest && stay.guest._id !== baseGuest._id) coGuestsMap.set(stay.guest._id, stay.guest);
              if (stay.coGuests) {
                stay.coGuests.forEach(cg => {
                  if (cg && cg._id !== baseGuest._id) coGuestsMap.set(cg._id, cg);
                });
              }
            });
            setFrequentCoGuests(Array.from(coGuestsMap.values()));
          } catch (err) {
            console.error('Failed to fetch past co-guests', err);
          }
        }

        setGuests(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...baseGuest, isSearching: false };
          return updated;
        });
        toast({ message: 'Returning guest details auto-filled!', type: 'success' });
      } else {"""

content = content.replace(search_target, search_rep)

# 3. UI for Frequent CoGuests
ui_target = """              {guests.map((guest, index) => (
                <div key={index} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm relative group animate-in slide-in-from-bottom-2">"""

ui_rep = """              {frequentCoGuests.length > 0 && guests.length > 1 && (
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl mb-6">
                  <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Users size={14} /> Quick Add Past Co-Guests
                  </h4>
                  <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                    {frequentCoGuests.map(cg => (
                      <button key={cg._id} type="button" onClick={() => {
                        // Find first empty co-guest slot or add new
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

              {guests.map((guest, index) => (
                <div key={index} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm relative group animate-in slide-in-from-bottom-2">"""

content = content.replace(ui_target, ui_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Frequent co-guests feature implemented.")
