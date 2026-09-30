import sys

with open('src/controllers/stayController.js', 'r') as f:
    content = f.read()

# Update destructuring
target_destruct = "const { guest, room, checkInDate, expectedCheckOutDate, initialPaymentAmount, paymentMethod, durationOption, discountAmount, occupants, coGuests } = req.body;"
replacement_destruct = "const { guest, room, checkInDate, expectedCheckOutDate, initialPaymentAmount, paymentMethod, durationOption, discountAmount, occupants, coGuests, commissionTo, commissionAmount } = req.body;"
content = content.replace(target_destruct, replacement_destruct)

# Update Stay.create
target_create = """    const stay = await Stay.create([{
      guest,
      coGuests: coGuests || [],
      hostel,
      room,
      checkInDate,
      expectedCheckOutDate,
      durationOption: durationOption || '24h',
      basePrice,
      discountAmount: finalDiscount,
      totalAmount,
      paidAmount: initialPaymentAmount || 0,
      occupants: occupants || 1,
      createdBy: req.user._id
    }]);"""

replacement_create = """    const stay = await Stay.create([{
      guest,
      coGuests: coGuests || [],
      hostel,
      room,
      checkInDate,
      expectedCheckOutDate,
      durationOption: durationOption || '24h',
      discountAmount: finalDiscount,
      totalAmount,
      paidAmount: initialPaymentAmount || 0,
      occupants: occupants || 1,
      commissionTo: commissionTo || '',
      commissionAmount: Number(commissionAmount) || 0,
      createdBy: req.user._id
    }]);"""
content = content.replace(target_create, replacement_create)

with open('src/controllers/stayController.js', 'w') as f:
    f.write(content)

print("stayController patched.")
