import sys

with open(sys.argv[1], "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if "// Performance Indexes" in line:
        break
    new_lines.append(line)

with open(sys.argv[1], "w") as f:
    f.writelines(new_lines)
