import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_routes = "const reportRoutes = require('./routes/reportRoutes');"
import_routes_new = "const reportRoutes = require('./routes/reportRoutes');\nconst userRoutes = require('./routes/userRoutes');"
content = content.replace(import_routes, import_routes_new)

use_routes = "app.use('/api/reports', reportRoutes);"
use_routes_new = "app.use('/api/reports', reportRoutes);\napp.use('/api/users', userRoutes);"
content = content.replace(use_routes, use_routes_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated app.js")
