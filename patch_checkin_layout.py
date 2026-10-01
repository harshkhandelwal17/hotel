import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Add `roomSearchQuery` state
state_target = """  const [uploadingImage, setUploadingImage] = useState(false);
  
  const toast = useToast();"""

state_rep = """  const [uploadingImage, setUploadingImage] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  
  const toast = useToast();"""

content = content.replace(state_target, state_rep)

# 2. Rewrite the entire Step 1 UI block
step1_target_start = """      {step === 1 && ("""
step1_target_end = """      {step === 2 && ("""

# We need to slice the content
start_idx = content.find(step1_target_start)
end_idx = content.find(step1_target_end)

if start_idx != -1 and end_idx != -1:
    old_step1 = content[start_idx:end_idx]
    
    new_step1 = """      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          
          {/* 1. Guests & Duration */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Users className="text-gray-400" /> 1. Guests & Duration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Total Occupants</label>
                <div className="flex items-center gap-4 bg-white p-2 rounded-full border border-gray-200 w-fit">
                  <button onClick={() => setStayInfo(p => ({...p, occupants: Math.max(1, p.occupants - 1)}))} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center font-black text-xl hover:bg-gray-100 transition-colors">-</button>
                  <div className="text-2xl font-black w-12 text-center">{stayInfo.occupants}</div>
                  <button onClick={() => setStayInfo(p => ({...p, occupants: p.occupants + 1}))} className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center font-black text-xl hover:bg-gray-100 transition-colors">+</button>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration of Stay (Custom)</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="1" placeholder="e.g. 2" value={stayInfo.durationValue} onChange={e => setStayInfo(p => ({...p, durationValue: Math.max(1, e.target.value)}))} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-black text-2xl outline-none focus:border-black transition-colors" />
                  </div>
                  <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-1.5 flex">
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Hours'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Hours' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Hours</button>
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Days'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Days' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Days</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Room Selection */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Bed className="text-gray-400" /> 2. Select Room
              </h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search room..." className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-bold text-sm w-full sm:w-64"
                  value={roomSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRoomSearchQuery(val);
                    if (val.trim()) {
                      const exactMatch = rooms.find(r => r.roomNumber.toLowerCase() === val.trim().toLowerCase());
                      if (exactMatch && stayInfo.occupants <= exactMatch.capacity) {
                        setStayInfo(p => ({...p, room: exactMatch._id}));
                      }
                    }
                  }}
                />
              </div>
            </div>
            
            {loadingRooms ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"><SkeletonRoom /><SkeletonRoom /><SkeletonRoom /></div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-10 bg-red-50 text-red-600 rounded-2xl font-bold">No rooms available currently.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {rooms.filter(r => r.roomNumber.toLowerCase().includes(roomSearchQuery.toLowerCase())).map(room => {
                  const active = stayInfo.room === room._id;
                  const isFull = stayInfo.occupants > room.capacity;
                  return (
                    <button key={room._id} onClick={() => !isFull && setStayInfo({...stayInfo, room: room._id})} disabled={isFull}
                      className={`relative p-4 rounded-2xl border-2 text-center transition-all ${
                        active ? 'border-black bg-black text-white shadow-xl scale-[1.02]' :
                        isFull ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' :
                        'border-gray-200 hover:border-gray-400 bg-white hover:shadow-md'
                      }`}>
                      {active && <CheckCircle2 className="absolute top-2 right-2 text-white" size={16} />}
                      <h3 className={`font-black text-xl ${active ? 'text-white' : 'text-gray-900'}`}>{room.roomNumber}</h3>
                      <p className={`text-[10px] font-bold mt-1 ${active ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-widest`}>Cap. {room.capacity}</p>
                      {isFull && <span className="text-[9px] text-red-500 font-black block mt-1 uppercase">Too small</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedRoomDetails?.capacity < stayInfo.occupants && stayInfo.room && (
               <p className="text-xs text-red-500 font-bold mt-4 text-center">Warning: Selected room capacity is {selectedRoomDetails.capacity}.</p>
            )}
          </div>

          {/* 3. Payment & Settlement */}
          <div className="bg-gray-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl space-y-6">
            <h2 className="text-lg font-black text-gray-300 flex items-center gap-2 mb-6">
              <CreditCard className="text-gray-500" /> 3. Payment & Settlement
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                  <span className="text-gray-400 font-bold">Agreed Total</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-black">₹</span>
                    <input type="number" value={stayInfo.totalAmount} onChange={e => setStayInfo(p => ({...p, totalAmount: e.target.value}))} className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600" />
                  </div>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-gray-800">
                  <span className="text-gray-400 font-bold">Advance Paid</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-black">₹</span>
                    <input type="number" value={stayInfo.paidAmount} onChange={e => setStayInfo(p => ({...p, paidAmount: e.target.value}))} className="w-24 bg-transparent text-right font-black text-2xl outline-none border-b-2 border-transparent focus:border-gray-600 text-green-400" />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-400 font-bold">Balance Due</span>
                  <span className={`font-black text-2xl ${stayInfo.totalAmount - stayInfo.paidAmount > 0 ? 'text-orange-400' : 'text-gray-300'}`}>₹{Math.max(0, stayInfo.totalAmount - stayInfo.paidAmount)}</span>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Broker / Commission (Optional)</label>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <input type="text" placeholder="Broker Name" value={stayInfo.commissionTo} onChange={e => setStayInfo(p => ({...p, commissionTo: e.target.value}))} className="w-full sm:flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                    <input type="number" placeholder="₹ Amount" value={stayInfo.commissionAmount} onChange={e => setStayInfo(p => ({...p, commissionAmount: e.target.value}))} className="w-full sm:w-32 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                  </div>
                </div>

                <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl">
                  {['Cash', 'UPI', 'Card'].map(m => (
                    <button key={m} onClick={() => setStayInfo(p => ({...p, paymentMethod: m}))} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${stayInfo.paymentMethod === m ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8">
            <button onClick={() => setStep(2)} disabled={!isStep1Valid} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-all shadow-xl active:scale-[0.98]">
              Continue to Guest Details <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
"""
    content = content[:start_idx] + new_step1 + content[end_idx:]
    with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
        f.write(content)
    print("Step 1 Layout Reordered")
else:
    print("Could not find step 1 block")
