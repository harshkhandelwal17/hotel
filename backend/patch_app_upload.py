import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_routes = "const userRoutes = require('./routes/userRoutes');"
import_routes_new = "const userRoutes = require('./routes/userRoutes');\nconst uploadRoutes = require('./routes/uploadRoutes');\nconst path = require('path');"
if "uploadRoutes" not in content:
    content = content.replace(import_routes, import_routes_new)

use_routes = "app.use('/api/users', userRoutes);"
use_routes_new = "app.use('/api/users', userRoutes);\napp.use('/api/upload', uploadRoutes);\napp.use('/uploads', express.static(path.join(__dirname, '../uploads')));"
if "/api/upload" not in content:
    content = content.replace(use_routes, use_routes_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated app.js for uploads")
