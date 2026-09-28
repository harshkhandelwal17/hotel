import sys

# 1. Hostel Controller
with open("src/controllers/hostelController.js", "a") as f:
    f.write("""
exports.deleteHostel = async (req, res, next) => {
  try {
    const hostel = await Hostel.findByIdAndDelete(req.params.id);
    if (!hostel) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
""")

# 2. Hostel Routes
with open("src/routes/hostelRoutes.js", "r") as f:
    content = f.read()
content = content.replace("updateHostel } = require('../controllers/hostelController');", "updateHostel, deleteHostel } = require('../controllers/hostelController');")
content = content.replace(".put(authorize('admin'), updateHostel);", ".put(authorize('admin'), updateHostel)\n  .delete(authorize('admin'), deleteHostel);")
with open("src/routes/hostelRoutes.js", "w") as f:
    f.write(content)


# 3. Room Controller
with open("src/controllers/roomController.js", "a") as f:
    f.write("""
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
""")

# 4. Room Routes
with open("src/routes/roomRoutes.js", "r") as f:
    content = f.read()
content = content.replace("updateRoom } = require('../controllers/roomController');", "updateRoom, deleteRoom } = require('../controllers/roomController');")
content = content.replace(".put(authorize('admin'), updateRoom);", ".put(authorize('admin'), updateRoom)\n  .delete(authorize('admin'), deleteRoom);")
with open("src/routes/roomRoutes.js", "w") as f:
    f.write(content)

print("Backend delete routes added.")
