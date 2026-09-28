import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# 1. Update validation
target1 = "const canProceed2 = guests.every(g => g.fullName.trim() && g.mobileNumber.length >= 10 && g.idProofNumber.trim());"
replacement1 = "const canProceed2 = guests.every(g => g.fullName.trim() && g.mobileNumber.length >= 10 && (g.idProofNumber.trim() || g.idProofImage));"
content = content.replace(target1, replacement1)

# 2. Update POST/PUT logic
target2 = """      let guestIds = [];
      for (const guest of guests) {
        if (guest._id) {
          guestIds.push(guest._id);
        } else {"""
replacement2 = """      let guestIds = [];
      for (const guest of guests) {
        const payload = {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage,
            hostel: typeof selectedRoom.hostel === 'object' ? selectedRoom.hostel._id : selectedRoom.hostel
        };
        if (guest._id) {
          await axios.put(`http://127.0.0.1:5001/api/guests/${guest._id}`, payload);
          guestIds.push(guest._id);
        } else {"""
content = content.replace(target2, replacement2)

# We also need to remove the POST payload since we extracted it, but wait, I just replaced the IF statement block. Let's do it cleanly.

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckIn update logic")
