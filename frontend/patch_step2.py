import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

pattern = re.compile(r'\{\s*/\*\s*───\s*STEP 2: Guests Info.*?export default CheckIn;', re.DOTALL)

new_step_2 = """{/* ─── STEP 2: Guests Info ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-2 sm:p-4 space-y-6">
            
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center"><UserPlus size={24} className="text-orange-600"/></div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Guest Details</h2>
                <p className="text-sm font-semibold text-gray-500">Provide identity details for all {stayInfo.occupants} occupants.</p>
              </div>
            </div>

            <div className="space-y-6">
              {guests.map((guest, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-5 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-black text-gray-800 flex items-center gap-3 text-lg">
                      <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">{index + 1}</div>
                      Guest {index === 0 ? '(Primary)' : ''} 
                      {index === 0 && <span className="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded uppercase tracking-widest font-black">Primary</span>}
                    </h3>
                    {guest._id && (
                      <span className="flex items-center gap-1 text-xs font-black text-green-700 bg-green-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 size={16} /> Returning Guest
                      </span>
                    )}
                  </div>
                  <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 relative">
                    {guest.isSearching && (
                       <div className="absolute top-4 right-4 text-xs font-bold text-blue-500 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full"><Search size={14} className="animate-spin" /> Searching...</div>
                    )}
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Mobile Number <span className="text-red-500">*</span></label>
                      <input type="tel" required className={`w-full px-5 py-3.5 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-base transition-colors ${guest._id ? 'border-green-300 bg-green-50 text-green-900' : 'border-gray-200 text-gray-900'}`} placeholder="10-digit mobile" value={guest.mobileNumber} onChange={e => handleGuestChange(index, 'mobileNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Full Name <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-base text-gray-900" placeholder="Enter full name" value={guest.fullName} onChange={e => handleGuestChange(index, 'fullName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ID Proof Type <span className="text-red-500">*</span></label>
                      <select className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-base text-gray-900" value={guest.idProofType} onChange={e => handleGuestChange(index, 'idProofType', e.target.value)}>
                        <option>Aadhaar</option>
                        <option>Passport</option>
                        <option>Driving License</option>
                        <option>Voter ID</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">{guest.idProofType} Number (Optional)</label>
                      <input type="text" className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-base text-gray-900 uppercase" placeholder="ID Number (Optional)" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">ID Image (Optional)</label>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm font-semibold text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-wider file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />
                      {guest.idProofImage && (
                        <div className="mt-3 flex items-center gap-3 bg-green-50 p-2.5 rounded-xl border border-green-100">
                          <span className="text-xs text-green-700 font-black uppercase tracking-wider flex items-center gap-1"><CheckCircle2 size={16}/> Uploaded</span>
                          <a href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline font-black uppercase tracking-wider">View Image</a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex flex-col sm:flex-row justify-between gap-4">
              <button className="w-full sm:w-auto text-center text-gray-500 px-6 py-4 font-black uppercase tracking-widest hover:text-black hover:bg-gray-100 rounded-2xl transition-all" onClick={() => setStep(1)}>← Back</button>
              <button type="button" className="w-full sm:w-auto justify-center bg-black text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xl uppercase tracking-widest text-base"
                onClick={handleSubmit} disabled={!canProceed2 || loading}>
                {loading ? 'Processing...' : 'Complete Check-In'} <CheckCircle2 size={20} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CheckIn;
"""

content = re.sub(pattern, new_step_2, content)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Step 2 rewritten perfectly.")
