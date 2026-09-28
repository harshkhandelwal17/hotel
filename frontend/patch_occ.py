import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

content = content.replace(
    "setStayInfo({ ...stayInfo, occupants: newCount });",
    "setStayInfo({ ...stayInfo, occupants: newCount });\n    setSelectedRoom(null);"
)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched handleOccupantsChange")
