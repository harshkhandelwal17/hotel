import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = "require('dotenv').config();"
replace = "require('dotenv').config();\nprocess.env.TZ = 'Asia/Kolkata';"

content = content.replace(target, replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Patched TZ")
