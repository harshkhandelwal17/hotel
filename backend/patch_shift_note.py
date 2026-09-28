import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = "const shiftNote = `[${new Date().toLocaleString()}]"
replace = "const shiftNote = `[${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}]"

content = content.replace(target, replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched shift note timezone")
