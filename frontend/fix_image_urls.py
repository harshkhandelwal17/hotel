import sys, re

with open("src/pages/receptionist/CheckIn.jsx", "r") as f:
    content = f.read()

content = content.replace("`http://127.0.0.1:5001${guest.idProofImage}`", "(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `http://127.0.0.1:5001${guest.idProofImage}`)")
with open("src/pages/receptionist/CheckIn.jsx", "w") as f:
    f.write(content)

with open("src/pages/receptionist/GuestProfile.jsx", "r") as f:
    content = f.read()

content = content.replace("`http://127.0.0.1:5001${guest.idProofImage}`", "(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `http://127.0.0.1:5001${guest.idProofImage}`)")
content = content.replace("`http://127.0.0.1:5001${cg.idProofImage}`", "(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `http://127.0.0.1:5001${cg.idProofImage}`)")
content = content.replace("`http://127.0.0.1:5001${g.idProofImage}`", "(g.idProofImage?.startsWith('http') ? g.idProofImage : `http://127.0.0.1:5001${g.idProofImage}`)")

with open("src/pages/receptionist/GuestProfile.jsx", "w") as f:
    f.write(content)

print("Fixed frontend image URLs for R2")
