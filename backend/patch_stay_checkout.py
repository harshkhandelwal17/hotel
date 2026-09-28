import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    
    const { additionalCharges, checkoutPayment, paymentMethod } = req.body;"""

replacement = """    const stay = await Stay.findById(req.params.id);
    if (!stay) throw new Error('Stay not found');
    if (stay.status === 'Checked Out') throw new Error('Stay is already checked out');
    
    const { additionalCharges, checkoutPayment, paymentMethod } = req.body;"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched stayController checkout double-charge bug")
