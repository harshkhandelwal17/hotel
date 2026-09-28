import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{guest.idProofType} Number <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm uppercase" placeholder="ID Number" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />"""

replacement = """                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{guest.idProofType} Number (Optional)</label>
                      <input type="text" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm uppercase" placeholder="ID Number (Optional)" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />"""

content = content.replace(target, replacement)

target_image = """                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />
                      {guest.idProofImage && <span className="text-[10px] text-green-600 font-bold mt-1 block">✓ Uploaded Successfully</span>}"""
                      
replacement_image = """                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />
                      {guest.idProofImage && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-green-600 font-bold flex items-center">✓ Uploaded</span>
                          <a href={`http://127.0.0.1:5001${guest.idProofImage}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 underline font-semibold">View Image</a>
                        </div>
                      )}"""

content = content.replace(target_image, replacement_image)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckIn UI")
