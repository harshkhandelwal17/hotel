import sys
import re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# 1. Fix handleGuestChange
old_hgc = """  const handleGuestChange = (
    index,
    field,
    value
  ) => {
    const updated = [...guests];

    updated[index][field] = value;

    if (field === 'mobileNumber') {
      updated[index]._id = null;

      if (value.length === 10) {
        debouncedSearch(index, value);
      }
    }

    setGuests(updated);
  };"""

new_hgc = """  const handleGuestChange = (index, field, value) => {
    setGuests(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'mobileNumber') {
        updated[index]._id = null;
      }
      return updated;
    });

    if (field === 'mobileNumber' && value.length === 10) {
      debouncedSearch(index, value);
    }
  };"""

content = content.replace(old_hgc, new_hgc)

# 2. Fix handleImageUpload stale closure
old_upload = """      handleGuestChange(
        index,
        'idProofImage',
        res.data.url
      );"""

new_upload = """      setGuests(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], idProofImage: res.data.url };
        return updated;
      });"""

content = content.replace(old_upload, new_upload)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("State updates fixed.")
