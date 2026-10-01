import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. State change
state_target = "room: '', rentFormat: '24h', occupants: 1, expectedDays: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''"
state_rep = "room: '', durationUnit: 'Days', durationValue: 1, occupants: 1, totalAmount: 0, paidAmount: 0, paymentMethod: 'Cash', commissionTo: '', commissionAmount: ''"
content = content.replace(state_target, state_rep)

# 2. Auto-calc effect change
eff_target = """  // Auto-calculate rent
  useEffect(() => {
    if (selectedRoomDetails) {
      const basePrice = stayInfo.rentFormat === '12h' ? selectedRoomDetails.price12h : selectedRoomDetails.price24h;
      setStayInfo(prev => ({ ...prev, totalAmount: basePrice * prev.expectedDays }));
    }
  }, [stayInfo.room, stayInfo.rentFormat, stayInfo.expectedDays, selectedRoomDetails]);"""

eff_rep = """  // Auto-calculate rent (rough estimate since it's fully custom)
  useEffect(() => {
    if (selectedRoomDetails) {
      let basePrice = 0;
      if (stayInfo.durationUnit === 'Days') {
        basePrice = (selectedRoomDetails.price24h || 0) * stayInfo.durationValue;
      } else {
        basePrice = Math.round(((selectedRoomDetails.price24h || 0) / 24) * stayInfo.durationValue);
      }
      setStayInfo(prev => ({ ...prev, totalAmount: basePrice }));
    }
  }, [stayInfo.room, stayInfo.durationUnit, stayInfo.durationValue, selectedRoomDetails]);"""
content = content.replace(eff_target, eff_rep)

# 3. Submit checkOutDate change
submit_target = """      const checkInDate = new Date();
      const expectedOut = new Date();
      if (stayInfo.rentFormat === '12h') expectedOut.setHours(expectedOut.getHours() + (12 * stayInfo.expectedDays));
      else expectedOut.setHours(expectedOut.getHours() + (24 * stayInfo.expectedDays));

      await axios.post(`${API}/api/stays/checkin`, {
        guest: pGuestId,
        coGuests: coGuestIds,
        room: stayInfo.room,
        hostel: globalProperty !== 'all' ? globalProperty : selectedRoomDetails.hostel,
        rentFormat: stayInfo.rentFormat,
        expectedDays: stayInfo.expectedDays,"""

submit_rep = """      const checkInDate = new Date();
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
content = content.replace(submit_target, submit_rep)

# 4. Validation change
valid_target = "const isStep1Valid = stayInfo.room && stayInfo.expectedDays >= 1 && stayInfo.occupants >= 1 && selectedRoomDetails?.capacity >= stayInfo.occupants;"
valid_rep = "const isStep1Valid = stayInfo.room && stayInfo.durationValue >= 1 && stayInfo.occupants >= 1 && selectedRoomDetails?.capacity >= stayInfo.occupants;"
content = content.replace(valid_target, valid_rep)

# 5. UI change
ui_target = """              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration & Format</label>
                <div className="flex gap-3">
                  <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl p-2 flex">
                    <button onClick={() => setStayInfo(p => ({...p, rentFormat: '12h'}))} className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${stayInfo.rentFormat === '12h' ? 'bg-white shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-900'}`}>12 Hours</button>
                    <button onClick={() => setStayInfo(p => ({...p, rentFormat: '24h'}))} className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${stayInfo.rentFormat === '24h' ? 'bg-white shadow-sm border border-gray-200' : 'text-gray-400 hover:text-gray-900'}`}>24 Hours</button>
                  </div>
                  <div className="w-24 relative">
                    <input type="number" min="1" value={stayInfo.expectedDays} onChange={e => setStayInfo(p => ({...p, expectedDays: Math.max(1, e.target.value)}))} className="w-full h-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 font-black text-xl text-center outline-none focus:border-black" />
                    <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-black text-gray-400 uppercase">Multiplier</span>
                  </div>
                </div>
              </div>"""

ui_rep = """              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Duration of Stay (Fully Custom)</label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input type="number" min="1" placeholder="e.g. 2" value={stayInfo.durationValue} onChange={e => setStayInfo(p => ({...p, durationValue: Math.max(1, e.target.value)}))} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-black text-2xl outline-none focus:border-black transition-colors" />
                  </div>
                  <div className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-2xl p-1.5 flex">
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Hours'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Hours' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Hours</button>
                    <button onClick={() => setStayInfo(p => ({...p, durationUnit: 'Days'}))} className={`flex-1 rounded-xl text-sm font-black transition-all ${stayInfo.durationUnit === 'Days' ? 'bg-black text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}>Days</button>
                  </div>
                </div>
              </div>"""
content = content.replace(ui_target, ui_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Duration UI replaced")
