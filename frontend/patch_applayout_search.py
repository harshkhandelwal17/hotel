import sys, re

with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

target = '<div className="px-4 pt-4 pb-2">'
replacement = """<div className="px-4 pt-4 pb-2">
              <div className="mb-4">
                <GlobalSearch onResultClick={() => setIsMobileMenuOpen(false)} />
              </div>"""

content = content.replace(target, replacement)

with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("AppLayout mobile search patched")
