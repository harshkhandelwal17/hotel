import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

content = content.replace(
    "const extraPersons = Math.max(0, stayInfo.occupants - 1);",
    "const extraPersons = Math.max(0, stayInfo.occupants - (selectedRoom?.capacity || 1));"
)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched billing math for capacity")
