import sys

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

target = """        totalAmount: Number(totalAmount) || 0,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel
      });"""

replacement = """        totalAmount: Number(totalAmount) || 0,
        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel,
        commissionTo: stayInfo.commissionTo,
        commissionAmount: Number(stayInfo.commissionAmount) || 0
      });"""

content = content.replace(target, replacement)
with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)
print("Payload patched.")
