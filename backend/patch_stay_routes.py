import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = "const { getStays, createStay, checkout, extendStay } = require('../controllers/stayController');"
replacement1 = "const { getStays, createStay, checkout, extendStay, shiftRoom } = require('../controllers/stayController');"
content = content.replace(target1, replacement1)

target2 = "router.post('/:id/extend', extendStay);"
replacement2 = "router.post('/:id/extend', extendStay);\nrouter.post('/:id/shift', shiftRoom);"
content = content.replace(target2, replacement2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added shift route to stayRoutes.js")
