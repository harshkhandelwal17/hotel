import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

old_str = """        <div className="flex gap-2">
          <button onClick={downloadCSV} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2"><Download size={16} /> Export</button>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guest, mobile, room..."
            className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>"""

new_str = """        <div className="flex gap-2">
          <button onClick={downloadCSV} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2"><Download size={16} /> Export</button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search guest, mobile, room..."
              className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>"""

if old_str in content:
    with open(sys.argv[1], "w") as f:
        f.write(content.replace(old_str, new_str))
    print("Fixed")
else:
    print("Not found")
