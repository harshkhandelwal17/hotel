import sys, re

with open('src/pages/receptionist/Dashboard.jsx', 'r') as f:
    content = f.read()

# We'll replace the top header part with a huge quick action button for Check-in
target_header = re.compile(r'<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">.*?</div>\s*</div>', re.DOTALL)

replacement_header = """<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Front Desk Dashboard</h1>
          <p className="text-gray-500 font-medium mt-1">Manage today's operations and check-ins.</p>
        </div>
        
        <Link to="/checkin" className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-gray-800 hover:shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95">
          <Plus size={24} /> 
          <span className="text-lg uppercase tracking-wide">New Check-In</span>
        </Link>
      </div>"""

content = re.sub(target_header, replacement_header, content)

# I'll also modify the KPI layout to wrap better on mobile (they are already grid-cols-1 md:grid-cols-2 lg:grid-cols-4, which is good, but let's make them punchier).
# Actually, the user said "faltu chize hta do". I'll remove the Recent Check-ins list if it's too big, or just make it ultra-clean.
# The "Recent Check-ins" is fine, but maybe let's turn "Need Attention" into big buttons next to the KPIs.

with open('src/pages/receptionist/Dashboard.jsx', 'w') as f:
    f.write(content)
print("Dashboard Header Patched")
