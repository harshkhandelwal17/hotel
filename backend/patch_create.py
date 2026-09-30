import sys

with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

target = """    const numOccupants = Number(occupants) || 1;
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
      basePrice = roomDoc.price24h;
      totalAmount = basePrice;
    }
    
    const finalDiscount = Number(discountAmount) || 0;
    totalAmount = Math.max(0, totalAmount - finalDiscount);"""

replacement = """    // Runtime manual pricing
    let totalAmount = Number(req.body.totalAmount) || 0;
    const finalDiscount = Number(discountAmount) || 0;
    totalAmount = Math.max(0, totalAmount - finalDiscount);"""

content = content.replace(target, replacement)
with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)
