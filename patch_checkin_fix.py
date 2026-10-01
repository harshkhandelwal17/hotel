import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Fix the broker flex overflow
broker_target = """                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Broker / Commission (Optional)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Broker Name" value={stayInfo.commissionTo} onChange={e => setStayInfo(p => ({...p, commissionTo: e.target.value}))} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                  <input type="number" placeholder="₹ Amount" value={stayInfo.commissionAmount} onChange={e => setStayInfo(p => ({...p, commissionAmount: e.target.value}))} className="w-28 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                </div>"""

broker_rep = """                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Broker / Commission (Optional)</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input type="text" placeholder="Broker Name" value={stayInfo.commissionTo} onChange={e => setStayInfo(p => ({...p, commissionTo: e.target.value}))} className="w-full sm:flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                  <input type="number" placeholder="₹ Amount" value={stayInfo.commissionAmount} onChange={e => setStayInfo(p => ({...p, commissionAmount: e.target.value}))} className="w-full sm:w-32 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-gray-500 text-white placeholder-gray-600" />
                </div>"""

content = content.replace(broker_target, broker_rep)

# 2. Fix the invalid CSS calc in the bottom bar (Step 1)
calc1_target = 'className="fixed sm:static bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8"'
calc1_rep = 'className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 sm:mt-8"'
content = content.replace(calc1_target, calc1_rep)

# 3. Fix the invalid CSS calc in the bottom bar (Step 2)
calc2_target = 'className="fixed sm:static bottom-[calc(4rem+env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 sm:mt-8"'
calc2_rep = 'className="fixed sm:static bottom-[calc(4rem_+_env(safe-area-inset-bottom))] sm:bottom-0 left-0 right-0 p-4 sm:p-0 bg-white/90 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-gray-200 z-30 flex gap-3 sm:mt-8"'
content = content.replace(calc2_target, calc2_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn overflow and calc fixed")
