import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Fix isRoomAvailable
old_logic = "if (stay.room._id !== roomId) return false;"
new_logic = "if (!stay.room || (stay.room._id !== roomId && stay.room !== roomId)) return false;"
content = content.replace(old_logic, new_logic)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("CheckIn bug patched.")
