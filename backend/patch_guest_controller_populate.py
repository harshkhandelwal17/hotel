import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = ".populate('room', 'roomNumber price24h extraPerPerson24h extraPerPerson12h')"
replacement = ".populate('room', 'roomNumber price24h extraPerPerson24h extraPerPerson12h')\n      .populate('hostel', 'name')"
content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated populate")
