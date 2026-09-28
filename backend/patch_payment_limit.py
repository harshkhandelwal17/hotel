import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """.populate({
        path: 'stay',
        select: 'checkInDate expectedCheckOutDate room durationOption',
        populate: { path: 'room', select: 'roomNumber roomType' }
      })
      .sort('-paymentDate');"""

replacement = """.populate({
        path: 'stay',
        select: 'checkInDate expectedCheckOutDate room durationOption',
        populate: { path: 'room', select: 'roomNumber roomType' }
      })
      .sort('-paymentDate')
      .limit(3000); // Optimized for UI performance"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added limit to getPayments")
