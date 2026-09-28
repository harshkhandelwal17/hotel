import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

ui_target = """            {/* Profile & Actions */}
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative">"""

ui_new = """            {/* Profile & Actions */}
            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black block p-2 font-semibold shadow-sm outline-none"
                >
                  <option value="all">🏢 All Properties</option>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              )}
              <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative">"""

if "🏢 All Properties" not in content:
    content = content.replace(ui_target, ui_new)
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Fixed")
