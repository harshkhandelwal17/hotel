import sys

# 1. Update Room.js
with open('src/models/Room.js', 'r') as f:
    content = f.read()

content = content.replace("capacity: {\n    type: Number,\n    required: true,\n    min: 1\n  }", "capacity: {\n    type: Number,\n    default: 2,\n    min: 1\n  }")
with open('src/models/Room.js', 'w') as f:
    f.write(content)

# 2. Update stayController.js
with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

# Replace checkIn pricing logic
old_checkin_logic = """    // Get Room price
    const roomDoc = await Room.findById(room);
    if (!roomDoc) throw new Error('Room not found');
    
    const numOccupants = Number(occupants) || 1;
    const extraPersons = Math.max(0, numOccupants - 1); // people beyond the first
    
    let basePrice = 0;
    let totalAmount = 0;
    
    if (durationOption === '12h') {
      basePrice = roomDoc.price12h;
      const extraCharge = extraPersons * (roomDoc.extraPerPerson12h || 0);
      totalAmount = basePrice + extraCharge;
    } else if (durationOption === '24h') {
      basePrice = roomDoc.price24h;
      const nights = Math.ceil((new Date(expectedCheckOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
      if (nights <= 0) throw new Error('Checkout date must be after check-in date');
      const extraChargePerNight = extraPersons * (roomDoc.extraPerPerson24h || 0);
      totalAmount = (basePrice + extraChargePerNight) * nights;
    } else if (durationOption.startsWith('custom_')) {
      const hours = parseInt(durationOption.split('_')[1], 10);
      const rate = roomDoc.customRates?.find(r => r.hours === hours);
      basePrice = rate ? rate.price : 0;
      totalAmount = basePrice; // Extra persons ignored for custom hourly, managed via initialPayment/discount manually
    } else {
      throw new Error('Invalid duration option');
    }
    
    // Apply discount
    totalAmount = Math.max(0, totalAmount - (Number(discountAmount) || 0));"""

new_checkin_logic = """    // Runtime pricing - Total Amount is provided directly by receptionist
    let totalAmount = Number(req.body.totalAmount) || 0;
    totalAmount = Math.max(0, totalAmount - (Number(discountAmount) || 0));"""

content = content.replace(old_checkin_logic, new_checkin_logic)

# Replace extendStay pricing logic
old_extend_logic = """    const extraPersons = Math.max(0, numOccupants - 1);
    
    let additionalCost = 0;
    if (stay.durationOption === '12h') {
       // 12h extending logic is tricky, usually you extend by another 12h/24h block, but let's assume they are converting to a 24h stay for additional nights.
       const effectiveNightly = roomDoc.price24h + (extraPersons * (roomDoc.extraPerPerson24h || 0));
       additionalCost = effectiveNightly * additionalNights;
    } else {
       const effectiveNightly = roomDoc.price24h + (extraPersons * (roomDoc.extraPerPerson24h || 0));
       additionalCost = effectiveNightly * additionalNights;
    }

    stay.totalAmount += additionalCost;"""

new_extend_logic = """    // Runtime pricing for extension
    const additionalCost = Number(req.body.additionalRent) || 0;
    stay.totalAmount += additionalCost;"""

content = content.replace(old_extend_logic, new_extend_logic)

with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)

print("Backend runtime pricing applied.")
