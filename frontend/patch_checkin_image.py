import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# 1. Update emptyGuest
old_empty = "const emptyGuest = { mobileNumber: '', fullName: '', idProofType: 'Aadhaar', idProofNumber: '', _id: null, isSearching: false };"
new_empty = "const emptyGuest = { mobileNumber: '', fullName: '', idProofType: 'Aadhaar', idProofNumber: '', idProofImage: '', _id: null, isSearching: false };"
content = content.replace(old_empty, new_empty)

# 2. Add handleImageUpload
old_handle_guest_change = "const handleGuestChange = (index, field, value) => {"
new_handle_guest_change = """const handleImageUpload = async (index, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post('http://127.0.0.1:5001/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      handleGuestChange(index, 'idProofImage', res.data.url);
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleGuestChange = (index, field, value) => {"""
content = content.replace(old_handle_guest_change, new_handle_guest_change)

# 3. Add idProofImage to guest creation payload
old_guest_create = """          const res = await axios.post('http://127.0.0.1:5001/api/guests', {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber
          });"""
new_guest_create = """          const res = await axios.post('http://127.0.0.1:5001/api/guests', {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage
          });"""
content = content.replace(old_guest_create, new_guest_create)

# 4. Add UI for Upload Image
old_ui = """                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{guest.idProofType} Number <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm uppercase" placeholder="ID Number" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />
                    </div>
                  </div>
                </div>"""
new_ui = """                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">{guest.idProofType} Number <span className="text-red-500">*</span></label>
                      <input type="text" required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm uppercase" placeholder="ID Number" value={guest.idProofNumber} onChange={e => handleGuestChange(index, 'idProofNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">ID Image (Optional)</label>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(index, e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-200 file:text-black hover:file:bg-gray-300 transition-colors" />
                      {guest.idProofImage && <span className="text-[10px] text-green-600 font-bold mt-1 block">✓ Uploaded Successfully</span>}
                    </div>
                  </div>
                </div>"""
content = content.replace(old_ui, new_ui)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckIn image UI")
