import sys

with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

target = """  let navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Rooms', path: '/rooms', icon: Bed },
    { name: 'Guests', path: '/checkouts', icon: Users },
    { name: 'Payments', path: '/payments', icon: CreditCard },
  ];"""

replacement = """  let navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Guests', path: '/checkouts', icon: Users },
    { name: 'Payments', path: '/payments', icon: CreditCard },
  ];"""

content = content.replace(target, replacement)

with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)

print("Removed Rooms from navItems")
