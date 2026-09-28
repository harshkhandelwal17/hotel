import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = "const { createGuest, getGuests, getGuest } = require('../controllers/guestController');"
replacement = "const { createGuest, getGuests, getGuest, updateGuest } = require('../controllers/guestController');"
content = content.replace(target, replacement)

target2 = """router.route('/:id')
  .get(getGuest);"""
replacement2 = """router.route('/:id')
  .get(getGuest)
  .put(updateGuest);"""
content = content.replace(target2, replacement2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated guestRoutes.js")
