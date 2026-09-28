import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays', {
        guest: guestIds[0],
        coGuests: guestIds.slice(1),
        room: selectedRoom._id,
        checkInDate: stayInfo.checkInDate,
        expectedCheckOutDate: checkoutDate,
        durationOption: stayInfo.durationOption,"""

replace = """      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays', {
        guest: guestIds[0],
        coGuests: guestIds.slice(1),
        room: selectedRoom._id,
        checkInDate: new Date(stayInfo.checkInDate).toISOString(),
        expectedCheckOutDate: new Date(checkoutDate).toISOString(),
        durationOption: stayInfo.durationOption,"""

content = content.replace(target, replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched CheckIn payload with toISOString()")
