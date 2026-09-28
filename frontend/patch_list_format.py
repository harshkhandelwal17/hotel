import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

content = content.replace(
    "const checkIn = format(new Date(stay.checkInDate), 'dd MMM yyyy');",
    "const checkIn = format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a');"
)
content = content.replace(
    "const checkOut = format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy');",
    "const checkOut = format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a');"
)
content = content.replace(
    "Checkout: {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}",
    "Checkout: {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a')}"
)

with open(sys.argv[1], "w") as f:
    f.write(content)
