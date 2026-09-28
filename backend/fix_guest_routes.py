import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = "const { getGuests, getGuest, createGuest } = require('../controllers/guestController');"
replacement = "const { getGuests, getGuest, createGuest, updateGuest } = require('../controllers/guestController');"

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed import in guestRoutes.js")
