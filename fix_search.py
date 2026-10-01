import sys

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    lines = f.readlines()

new_logic = """        const baseGuest = res.data.data[0];
        
        // Fetch full profile to get past stays & co-guests
        if (index === 0) {
          try {
            const detailRes = await axios.get(`${API}/api/guests/${baseGuest._id}`);
            const pastStays = detailRes.data.data.stays || [];
            
            const coGuestsMap = new Map();
            pastStays.forEach(stay => {
              if (stay.guest && stay.guest._id !== baseGuest._id) coGuestsMap.set(stay.guest._id, stay.guest);
              if (stay.coGuests) {
                stay.coGuests.forEach(cg => {
                  if (cg && cg._id !== baseGuest._id) coGuestsMap.set(cg._id, cg);
                });
              }
            });
            setFrequentCoGuests(Array.from(coGuestsMap.values()));
          } catch (err) {
            console.error('Failed to fetch past co-guests', err);
          }
        }
        
        // Ensure the fetched guest is used instead of blindly spreading res.data.data[0] again
        // Actually, the original code spreads res.data.data[0] which is equivalent to baseGuest
"""

lines.insert(248, new_logic)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.writelines(lines)

print("Injected into searchGuest.")
