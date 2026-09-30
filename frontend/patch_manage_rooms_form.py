import sys, re

with open('src/pages/admin/ManageRooms.jsx', 'r') as f:
    content = f.read()

# Replace the whole form body inside <form onSubmit={handleSubmit}> ... </form>
pattern = re.compile(r'<form onSubmit=\{handleSubmit\}>.*?</form>', re.DOTALL)

new_form = """<form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{formError}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Property</label>
                  <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                    value={formData.hostel} onChange={e => set('hostel', e.target.value)}>
                    {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Room Type</label>
                  <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                    value={formData.roomType} onChange={e => set('roomType', e.target.value)}>
                    {['Standard Single', 'Standard Double', 'Twin', 'Triple', 'Deluxe', 'Suite', 'Family Room'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Room No.</label>
                    <input type="text" required className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                      placeholder="A-101" value={formData.roomNumber} onChange={e => set('roomNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Floor</label>
                    <input type="text" required className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                      placeholder="1st" value={formData.floor} onChange={e => set('floor', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl">
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-black rounded-xl font-bold text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>"""

content = re.sub(pattern, new_form, content)

with open('src/pages/admin/ManageRooms.jsx', 'w') as f:
    f.write(content)

print("Form completely replaced.")
