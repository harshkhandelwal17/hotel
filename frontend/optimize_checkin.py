import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """      let guestIds = [];
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
        } else {
          const res = await axios.post('http://127.0.0.1:5001/api/guests', {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage,
            hostel: selectedRoom.hostel._id || selectedRoom.hostel
          });
          guestIds.push(res.data.data._id);
        }
      }"""

replacement = """      // Optimized Guest Creation with Promise.all
      const guestPromises = guests.map(guest => {
        const payload = {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage,
            hostel: typeof selectedRoom.hostel === 'object' ? selectedRoom.hostel._id : selectedRoom.hostel
        };
        if (guest._id) {
          return axios.put(`http://127.0.0.1:5001/api/guests/${guest._id}`, payload).then(() => guest._id);
        } else {
          return axios.post('http://127.0.0.1:5001/api/guests', payload).then(res => res.data.data._id);
        }
      });
      
      const guestIds = await Promise.all(guestPromises);"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Optimized CheckIn API Calls")
