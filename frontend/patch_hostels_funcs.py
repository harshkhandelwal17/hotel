import sys, re

with open(sys.argv[1], "r") as f:
    content = f.read()

# Replace handleSubmit
submit_match = re.search(r'const handleSubmit = async \(e\) => \{.*?\};', content, re.DOTALL)
if submit_match:
    new_submit = """const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', address: '', contactNumber: '', email: '' });
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

  const handleSubmit = async (e) => {
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
  };"""
    content = content.replace(submit_match.group(0), new_submit)

with open(sys.argv[1], "w") as f:
    f.write(content)
