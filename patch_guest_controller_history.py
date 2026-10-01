import sys

with open('backend/src/controllers/guestController.js', 'r') as f:
    content = f.read()

target = """    const stays = await Stay.find({ guest: guest._id })
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('room', 'roomNumber price24h extraPerPerson24h extraPerPerson12h')
      .populate('hostel', 'name address')
      .sort('-createdAt');"""

replacement = """    const stays = await Stay.find({ $or: [{ guest: guest._id }, { coGuests: guest._id }] })
      .populate('guest', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('coGuests', 'fullName mobileNumber idProofType idProofNumber idProofImage')
      .populate('room', 'roomNumber price24h extraPerPerson24h extraPerPerson12h')
      .populate('hostel', 'name address')
      .sort('-createdAt');"""

if target in content:
    content = content.replace(target, replacement)
    with open('backend/src/controllers/guestController.js', 'w') as f:
        f.write(content)
    print("guestController patched for history logic")
else:
    print("Could not find target in guestController")
