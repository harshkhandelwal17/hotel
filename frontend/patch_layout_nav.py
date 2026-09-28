import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_shield = "import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon } from 'lucide-react';"
import_shield_new = "import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck } from 'lucide-react';"
if "ShieldCheck" not in content:
    content = content.replace(import_shield, import_shield_new)

nav_properties = "navItems.push({ name: 'Properties', path: '/admin/hostels', icon: Building });"
nav_properties_new = "navItems.push({ name: 'Properties', path: '/admin/hostels', icon: Building });\n    navItems.push({ name: 'Staff', path: '/admin/staff', icon: ShieldCheck });"
if "admin/staff" not in content:
    content = content.replace(nav_properties, nav_properties_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated AppLayout nav")
