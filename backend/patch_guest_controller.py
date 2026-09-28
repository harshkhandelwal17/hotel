import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

update_logic = """exports.updateGuest = async (req, res, next) => {
  try {
    let guest = await Guest.findById(req.params.id);
    if (!guest) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }
    
    guest = await Guest.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({ success: true, data: guest });
  } catch (error) {
    next(error);
  }
};
"""

content = content + "\n" + update_logic

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated guestController.js")
