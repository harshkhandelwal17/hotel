import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = ".populate('room', 'roomNumber price24h extraPerPerson24h')"
replacement = ".populate('room', 'roomNumber price24h extraPerPerson24h')\n      .populate('hostel', 'name address')"
content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated stay populate")
