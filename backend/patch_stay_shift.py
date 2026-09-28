import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

shift_logic = """
exports.shiftRoom = async (req, res, next) => {
  try {
    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    if (stay.status !== 'Active') throw new Error('Can only shift active stays');

    const { newRoomId, priceAdjustment, reason } = req.body;
    
    // Check if new room exists and belongs to same hostel
    const Room = require('../models/Room');
    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) throw new Error('New room not found');
    if (newRoom.hostel.toString() !== stay.hostel.toString()) {
      throw new Error('Cannot shift to a room in a different property');
    }

    // Check availability of new room
    const overlapping = await Stay.findOne({
      room: newRoomId,
      status: { $in: ['Upcoming', 'Active', 'Checkout Due', 'Overdue'] },
      $or: [
        { checkInDate: { $lt: stay.expectedCheckOutDate }, expectedCheckOutDate: { $gt: stay.checkInDate } }
      ]
    });

    if (overlapping) {
      throw new Error('New room is already booked for these dates');
    }

    // Get old room details for the note
    const oldRoom = await Room.findById(stay.room);
    const oldRoomNumber = oldRoom ? oldRoom.roomNumber : 'Unknown';

    // Apply changes
    stay.room = newRoomId;
    if (priceAdjustment) {
      stay.totalAmount += Number(priceAdjustment);
    }
    
    // Add to notes
    const shiftNote = `[${new Date().toLocaleString()}] Shifted from Room ${oldRoomNumber} to ${newRoom.roomNumber}. Reason: ${reason || 'N/A'}. Price Adjustment: ₹${Number(priceAdjustment) || 0}.`;
    stay.notes = stay.notes ? `${stay.notes}\\n${shiftNote}` : shiftNote;

    await stay.save();
    
    res.status(200).json({ success: true, data: stay });
  } catch (error) {
    next(error);
  }
};
"""

content = content + "\n" + shift_logic

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added shiftRoom to stayController.js")
