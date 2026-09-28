import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

if "compression" not in content:
    target = "const express = require('express');"
    replacement = "const express = require('express');\nconst compression = require('compression');"
    content = content.replace(target, replacement)
    
    target2 = "app.use(cors());"
    replacement2 = "app.use(cors());\napp.use(compression()); // Compress all routes for blazing fast APIs"
    content = content.replace(target2, replacement2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added compression middleware")
