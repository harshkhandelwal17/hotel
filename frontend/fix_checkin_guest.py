import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = """          const res = await axios.post('http://127.0.0.1:5001/api/guests', {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage
          });"""

target2 = """          const res = await axios.post('http://127.0.0.1:5001/api/guests', {
            mobileNumber: guest.mobileNumber,
            fullName: guest.fullName,
            idProofType: guest.idProofType,
            idProofNumber: guest.idProofNumber,
            idProofImage: guest.idProofImage,
            hostel: selectedRoom.hostel._id || selectedRoom.hostel
          });"""

content = content.replace(target1, target2)
with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed CheckIn guest creation")
