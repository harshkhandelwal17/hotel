import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """  idProofNumber: {
    type: String,
    required: [true, 'Please add ID proof number']
  },"""

replacement = """  idProofNumber: {
    type: String
  },
  idProofImage: {
    type: String,
    default: ''
  },"""

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed Guest Model")
