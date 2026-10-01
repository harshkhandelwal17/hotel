import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Restore commission state
state_target = """  const [stayInfo, setStayInfo] = useState(() => loadState('checkin_stayInfo', {
    room: '', rentFormat: '24h', occupants: 1, expectedDays: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash'
  }));"""
state_rep = """  const [stayInfo, setStayInfo] = useState(() => loadState('checkin_stayInfo', {
    room: '', rentFormat: '24h', occupants: 1, expectedDays: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''
  }));"""
content = content.replace(state_target, state_rep)

# 2. Include commission in submission
submit_target = """        expectedDays: stayInfo.expectedDays,
        occupants: stayInfo.occupants,
        totalAmount: stayInfo.totalAmount,
        paidAmount: stayInfo.paidAmount,
        paymentMethod: stayInfo.paymentMethod,
        checkInDate,"""
submit_rep = """        expectedDays: stayInfo.expectedDays,
        occupants: stayInfo.occupants,
        totalAmount: stayInfo.totalAmount,
        paidAmount: stayInfo.paidAmount,
        paymentMethod: stayInfo.paymentMethod,
        commissionTo: stayInfo.commissionTo,
        commissionAmount: Number(stayInfo.commissionAmount) || 0,
        checkInDate,"""
content = content.replace(submit_target, submit_rep)

# 3. Add Commission UI in Step 1 (Dark Payment Card)
ui_target = """              <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button key={m} onClick={() => setStayInfo(p => ({...p, paymentMethod: m}))} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${stayInfo.paymentMethod === m ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 mt-8">"""

ui_rep = """              <div className="pt-4 border-t border-gray-800">
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Broker / Commission (Optional)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Broker Name" value={stayInfo.commissionTo} onChange={e => setStayInfo(p => ({...p, commissionTo: e.target.value}))} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                  <input type="number" placeholder="₹ Amount" value={stayInfo.commissionAmount} onChange={e => setStayInfo(p => ({...p, commissionAmount: e.target.value}))} className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                </div>
              </div>

              <div className="flex gap-2 bg-gray-800 p-2 rounded-2xl mt-4">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button key={m} onClick={() => setStayInfo(p => ({...p, paymentMethod: m}))} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${stayInfo.paymentMethod === m ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="fixed sm:static bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8">"""
content = content.replace(ui_target, ui_rep)

# 4. Fix Step 2 bottom button bar too
step2_ui_target = """          <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 mt-8">"""
step2_ui_rep = """          <div className="fixed sm:static bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 sm:mt-8">"""
content = content.replace(step2_ui_target, step2_ui_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn.jsx commission and overlap fixed")
