import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Update initial state
state_target = "room: '', durationUnit: 'Days', durationValue: 1, occupants: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''"
state_rep = "room: '', durationDays: 1, durationHours: 0, occupants: 1, totalAmount: '', paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''"
content = content.replace(state_target, state_rep)

# 2. Remove auto-calculation effect completely
eff_target_start = "  // Auto-calculate rent (rough estimate since it's fully custom)"
eff_target_end = "  }, [stayInfo.room, stayInfo.durationUnit, stayInfo.durationValue, selectedRoomDetails]);"

start_idx = content.find(eff_target_start)
end_idx = content.find(eff_target_end) + len(eff_target_end)

if start_idx != -1:
    content = content[:start_idx] + content[end_idx:]

# 3. Update checkout date logic in handleSubmit
submit_target = """      const checkInDate = new Date();
      const expectedOut = new Date();
      if (stayInfo.durationUnit === 'Days') {
        expectedOut.setDate(expectedOut.getDate() + Number(stayInfo.durationValue));
      } else {
        expectedOut.setHours(expectedOut.getHours() + Number(stayInfo.durationValue));
      }

      await axios.post(`${API}/api/stays/checkin`, {
        guest: pGuestId,
        coGuests: coGuestIds,
        room: stayInfo.room,
        hostel: globalProperty !== 'all' ? globalProperty : selectedRoomDetails.hostel,
        durationOption: `${stayInfo.durationValue} ${stayInfo.durationUnit}`,"""

submit_rep = """      const checkInDate = new Date();
      const expectedOut = new Date();
      expectedOut.setDate(expectedOut.getDate() + (Number(stayInfo.durationDays) || 0));
      expectedOut.setHours(expectedOut.getHours() + (Number(stayInfo.durationHours) || 0));

      await axios.post(`${API}/api/stays/checkin`, {
        guest: pGuestId,
        coGuests: coGuestIds,
        room: stayInfo.room,
        hostel: globalProperty !== 'all' ? globalProperty : selectedRoomDetails.hostel,
        durationOption: `${stayInfo.durationDays || 0}d ${stayInfo.durationHours || 0}h`,"""
content = content.replace(submit_target, submit_rep)

# 4. Update validation
valid_target = "const isStep1Valid = stayInfo.room && stayInfo.durationValue >= 1 && stayInfo.occupants >= 1 && selectedRoomDetails?.capacity >= stayInfo.occupants;"
valid_rep = "const isStep1Valid = stayInfo.room && (Number(stayInfo.durationDays) > 0 || Number(stayInfo.durationHours) > 0) && stayInfo.occupants >= 1 && selectedRoomDetails?.capacity >= stayInfo.occupants && stayInfo.totalAmount !== '';"
content = content.replace(valid_target, valid_rep)

# 5. Update Duration UI
ui_target = """                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration of Stay (Custom)</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="1" placeholder="e.g. 2" value={stayInfo.durationValue} onChange={e => setStayInfo(p => ({...p, durationValue: Math.max(1, e.target.value)}))} className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 font-black text-2xl outline-none focus:border-black transition-colors" />
                  </div>
                  <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-1.5 flex">
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Hours'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Hours' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Hours</button>
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Days'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Days' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Days</button>
                  </div>
                </div>"""

ui_rep = """                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration of Stay</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="0" placeholder="0" value={stayInfo.durationDays} onChange={e => setStayInfo(p => ({...p, durationDays: Math.max(0, e.target.value)}))} className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-12 py-3 font-black text-xl outline-none focus:border-black transition-colors" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Days</span>
                  </div>
                  <div className="flex-1 relative">
                    <input type="number" min="0" placeholder="0" value={stayInfo.durationHours} onChange={e => setStayInfo(p => ({...p, durationHours: Math.max(0, e.target.value)}))} className="w-full bg-white border border-gray-200 rounded-2xl pl-5 pr-14 py-3 font-black text-xl outline-none focus:border-black transition-colors" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-2 text-right">Combine both (e.g. 1 Day 2 Hours)</p>"""
content = content.replace(ui_target, ui_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Duration UI v2 and auto-calc removed.")
