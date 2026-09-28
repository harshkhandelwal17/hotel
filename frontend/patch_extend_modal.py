import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

content = content.replace(
    "format(addDays(new Date(stay.expectedCheckOutDate), 1), 'yyyy-MM-dd')",
    "format(addDays(new Date(stay.expectedCheckOutDate), 1), \"yyyy-MM-dd'T'HH:mm\")"
)
content = content.replace(
    "type=\"date\"",
    "type=\"datetime-local\""
)
content = content.replace(
    "format(currentOut, 'dd MMM yyyy')",
    "format(currentOut, 'dd MMM yyyy, hh:mm a')"
)
content = content.replace(
    "min={format(addDays(currentOut, 1), 'yyyy-MM-dd')}",
    "min={format(currentOut, \"yyyy-MM-dd'T'HH:mm\")}"
)

with open(sys.argv[1], "w") as f:
    f.write(content)
