import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

# Add editingId state
content = content.replace("const [saving, setSaving] = useState(false);", "const [saving, setSaving] = useState(false);\n  const [editingId, setEditingId] = useState(null);")

# Add Edit/Delete Buttons to the card
card_target = """              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${room.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {room.status}
              </span>
            </div>"""

card_replace = """              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${room.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {room.status}
              </span>
            </div>
            <div className="flex bg-gray-100 border-b border-gray-200">
              <button onClick={() => handleEdit(room)} className="flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold text-gray-600 hover:text-black hover:bg-gray-200 transition-colors border-r border-gray-200">Edit</button>
              <button onClick={() => handleDelete(room._id)} className="flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors">Delete</button>
            </div>"""
content = content.replace(card_target, card_replace)

# Replace handleSubmit
submit_match = re.search(r'const handleSubmit = async \(e\) => \{.*?\};', content, re.DOTALL)
if submit_match:
    new_submit = """const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...emptyForm, hostel: hostels[0]?._id || '' });
  };

  const handleEdit = (room) => {
    setEditingId(room._id);
    setFormData({
      roomNumber: room.roomNumber || '',
      hostel: room.hostel?._id || room.hostel || '',
      floor: room.floor || '',
      roomType: room.roomType || 'Standard Double',
      capacity: room.capacity || 2,
      price12h: room.price12h || '',
      price24h: room.price24h || '',
      extraPerPerson12h: room.extraPerPerson12h || '',
      extraPerPerson24h: room.extraPerPerson24h || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/rooms/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/rooms/${editingId}`, formData);
      } else {
        await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/rooms', formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };"""
    content = content.replace(submit_match.group(0), new_submit)

# Fix modal title & close
content = content.replace("<h2>Add New Room</h2>", "<h2>{editingId ? 'Edit Room' : 'Add New Room'}</h2>")
content = content.replace("onClick={() => setIsModalOpen(false)}", "onClick={closeModal}")
# There might be a second setIsModalOpen in the cancel button:
content = content.replace("onClick={() => setIsModalOpen(false)}", "onClick={closeModal}")

with open(sys.argv[1], "w") as f:
    f.write(content)
