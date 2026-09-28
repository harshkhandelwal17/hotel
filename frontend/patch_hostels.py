import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# Add edit capabilities to state
content = content.replace("const [saving, setSaving] = useState(false);", "const [saving, setSaving] = useState(false);\n  const [editingId, setEditingId] = useState(null);")

# Add edit/delete handlers
submit_target = """  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels', formData);
      setIsModalOpen(false);
      setFormData({ name: '', address: '', contactNumber: '', email: '' });
      fetchProperties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };"""

submit_replace = """  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/hostels/${editingId}`, formData);
      } else {
        await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels', formData);
      }
      closeModal();
      fetchProperties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (prop) => {
    setEditingId(prop._id);
    setFormData({ name: prop.name || '', address: prop.address || '', contactNumber: prop.contactNumber || '', email: prop.email || '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action is irreversible.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/hostels/${id}`);
      fetchProperties();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete property');
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', address: '', contactNumber: '', email: '' });
  };"""
content = content.replace(submit_target, submit_replace)

# Add buttons to card
card_target = """                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${property.isActive ? 'bg-green-400/20 text-green-300 border border-green-500/30' : 'bg-red-400/20 text-red-300'}`}>
                  {property.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>
            </div>"""

card_replace = """                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${property.isActive ? 'bg-green-400/20 text-green-300 border border-green-500/30' : 'bg-red-400/20 text-red-300'}`}>
                  {property.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>
            </div>
            <div className="flex bg-gray-50 border-b border-gray-100">
              <button onClick={() => handleEdit(property)} className="flex-1 py-2 text-xs font-bold text-gray-600 hover:text-black hover:bg-gray-100 transition-colors border-r border-gray-100">Edit</button>
              <button onClick={() => handleDelete(property._id)} className="flex-1 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors">Delete</button>
            </div>"""
content = content.replace(card_target, card_replace)

# Fix modal title & close
content = content.replace("<h2>Add New Property</h2>", "<h2>{editingId ? 'Edit Property' : 'Add New Property'}</h2>")
content = content.replace("onClick={() => setIsModalOpen(false)}", "onClick={closeModal}")

with open(sys.argv[1], "w") as f:
    f.write(content)
