import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = "const app = require('./src/app');"
replacement = "require('dotenv').config();\nconst app = require('./src/app');"

content = content.replace(target, replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Fixed dotenv loading order")
