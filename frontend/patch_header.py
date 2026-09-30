import sys, re

with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

# 1. Hide Global Search on mobile
search_target = '<div className="flex-1 flex items-center justify-center px-4 sm:px-6">'
search_replacement = '<div className="hidden md:flex flex-1 items-center justify-center px-4 sm:px-6">'
content = content.replace(search_target, search_replacement)

# 2. Hide Property Selector on mobile topbar
prop_select_target = '<select \n                  value={globalProperty}'
prop_select_replacement = '<select \n                  value={globalProperty} \n                  className="hidden sm:block bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black p-2 font-semibold shadow-sm outline-none"\n'
# Also need to fix the existing className of select if it was inline
# Wait, let's just use regex for the select
select_regex = re.compile(r'<select \n                  value=\{globalProperty\} \n                  onChange=\{e => handlePropertyChange\(e\.target\.value\)\}\n                  className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black block p-2 font-semibold shadow-sm outline-none"\n                >')
select_replace = r"""<select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="hidden md:block bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black p-2 font-semibold shadow-sm outline-none"
                >"""
content = re.sub(select_regex, select_replace, content)

# 3. Add Property Selector to Mobile Navigation Overlay
mobile_nav_target = '<nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">'
mobile_nav_replacement = """<div className="px-4 pt-4 pb-2">
              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => { handlePropertyChange(e.target.value); setIsMobileMenuOpen(false); }}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-xl focus:ring-black focus:border-black block p-3 font-semibold shadow-sm outline-none mb-4"
                >
                  <option value="all">🏢 All Properties</option>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              )}
            </div>
            <nav className="flex-1 px-4 pb-6 space-y-2 overflow-y-auto">"""
content = content.replace(mobile_nav_target, mobile_nav_replacement)

# 4. Hide vertical line and logout on mobile
line_target = '<div className="h-8 w-[1px] bg-gray-200 mx-1"></div>'
line_replacement = '<div className="hidden md:block h-8 w-[1px] bg-gray-200 mx-1"></div>'
content = content.replace(line_target, line_replacement)

profile_target = '<div className="flex items-center space-x-3">'
profile_replacement = '<div className="hidden md:flex items-center space-x-3">'
content = content.replace(profile_target, profile_replacement)
# Wait, this might replace the profile in the mobile menu overlay too!
# Let's fix that.
content = content.replace('<div className="hidden md:flex items-center space-x-3">\n                <div className="h-10 w-10', '<div className="flex items-center space-x-3">\n                <div className="h-10 w-10')

logout_btn = r'<button \n                onClick=\{logout\}\n                className="ml-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"'
logout_btn_rep = r'<button \n                onClick={logout}\n                className="hidden md:block ml-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"'
content = re.sub(logout_btn, logout_btn_rep, content)

# Header right side gap-4 -> gap-2 on mobile
header_right = '<div className="flex items-center gap-4">'
header_right_rep = '<div className="flex items-center gap-2 md:gap-4">'
content = content.replace(header_right, header_right_rep)

with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("Header patched for mobile.")
