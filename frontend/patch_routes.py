import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_reports = "import Reports from './pages/admin/Reports';"
import_reports_new = "import Reports from './pages/admin/Reports';\nimport ManageStaff from './pages/admin/ManageStaff';"
if "ManageStaff" not in content:
    content = content.replace(import_reports, import_reports_new)

route_reports = '<Route path="/admin/reports" element={<Reports />} />'
route_reports_new = '<Route path="/admin/reports" element={<Reports />} />\n              <Route path="/admin/staff" element={<ManageStaff />} />'
if "admin/staff" not in content:
    content = content.replace(route_reports, route_reports_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated App.jsx")
