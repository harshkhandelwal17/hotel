import sys

with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

target = """    // Fetch room to get proper extra per person rates
    const roomDoc = await Room.findById(stay.room);
    const numOccupants = stay.occupants || 1;
    const extraPersons = Math.max(0, numOccupants - 1);
    
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

replacement = """    // Runtime manual extension pricing
    const additionalCost = Number(req.body.additionalRent) || 0;
    stay.totalAmount += additionalCost;"""

content = content.replace(target, replacement)
with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)
