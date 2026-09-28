import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = """        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
      });"""

target2 = """        initialPaymentAmount: Number(initialPayment) || 0,
        paymentMethod: stayInfo.paymentMethod,
        hostel: selectedRoom.hostel._id || selectedRoom.hostel
      });"""

content = content.replace(target1, target2)
with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed CheckIn stay creation")
