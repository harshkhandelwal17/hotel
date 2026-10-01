import sys

with open('frontend/src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

target_btn = """              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:text-black rounded-lg focus:outline-none"
              >
                <Menu size={24} />
              </button>"""

rep_btn = """              {/* Mobile Menu Button (Hidden now since we have bottom nav, but kept in DOM for reference) */}
              <div className="hidden"></div>"""
content = content.replace(target_btn, rep_btn)

# Make the header explicitly use backdrop blur on mobile
target_header = '<header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">'
rep_header = '<header className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-40">'
content = content.replace(target_header, rep_header)

with open('frontend/src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("Header patched")
