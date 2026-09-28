import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

content = content.replace(
    "format(new Date(stay.checkInDate), 'dd MMM yyyy')",
    "format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a')"
)
content = content.replace(
    "format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')",
    "format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')"
)

with open(sys.argv[1], "w") as f:
    f.write(content)
