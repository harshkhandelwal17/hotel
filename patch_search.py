import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

search_target = """    try {
      const res = await axios.get(`${API}/api/guests/search?mobile=${mobile}`);
      if (res.data.data) {
        setGuests(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...res.data.data, isSearching: false };
          return updated;
        });
        toast({ message: 'Returning guest details auto-filled!', type: 'success' });
      } else {
        setGuests(prev => {
          const updated = [...prev];
          updated[index].isSearching = false;
          return updated;
        });
      }
    } catch {"""

search_rep = """    try {
      const res = await axios.get(`${API}/api/guests?mobile=${mobile}`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        setGuests(prev => {
          const updated = [...prev];
          updated[index] = { ...updated[index], ...res.data.data[0], isSearching: false };
          return updated;
        });
        toast({ message: 'Returning guest details auto-filled!', type: 'success' });
      } else {
        setGuests(prev => {
          const updated = [...prev];
          updated[index].isSearching = false;
          return updated;
        });
      }
    } catch (err) {"""

content = content.replace(search_target, search_rep)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Search fixed")
