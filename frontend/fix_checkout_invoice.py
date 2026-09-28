import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """    const invoiceStay = completedStay || stay;
    const finalAmount = invoiceStay.totalAmount + (completedStay ? 0 : Number(additionalCharges));"""
replacement = """    const invoiceStay = stay;
    const finalAmount = completedStay ? completedStay.totalAmount : (stay.totalAmount + Number(additionalCharges));"""
content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed invoice stay object")
