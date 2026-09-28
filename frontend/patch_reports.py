import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# 1. Add state
old_state = "const [dateFilter, setDateFilter] = useState('all'); // today, yesterday, week, month, all"
new_state = "const [dateFilter, setDateFilter] = useState('all');\n  const [customStart, setCustomStart] = useState('');\n  const [customEnd, setCustomEnd] = useState('');"
content = content.replace(old_state, new_state)

# 2. Add filter logic
old_logic = "if (dateFilter === 'month' && !isThisMonth(pDate)) return false;"
new_logic = """      if (dateFilter === 'month' && !isThisMonth(pDate)) return false;
      if (dateFilter === 'custom' && customStart && customEnd) {
        const s = new Date(customStart); s.setHours(0,0,0,0);
        const e = new Date(customEnd); e.setHours(23,59,59,999);
        if (pDate < s || pDate > e) return false;
      }"""
content = content.replace(old_logic, new_logic)

# 3. Replace Filters UI
old_ui = """      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
          <input type="text" placeholder="Search Guest Name/Phone" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
        </div>
        
        <div>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div>
          <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Properties</option>
            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        </div>

        <div className="relative">
          <input type="text" placeholder="Filter by Room No." value={roomFilter} onChange={e => setRoomFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
        </div>
        
        <div className="flex items-center justify-end px-2 text-sm text-gray-500 font-medium">
          {filteredAndSortedPayments.length} Records found
        </div>
      </div>"""

new_ui = """      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
            <input type="text" placeholder="Search Guest Name/Phone" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
              <option value="all">All Properties</option>
              {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          </div>

          <div className="relative flex-1 min-w-[120px]">
            <input type="text" placeholder="Room No." value={roomFilter} onChange={e => setRoomFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
          </div>
          
          <div className="flex items-center justify-end px-2 text-sm text-gray-500 font-bold whitespace-nowrap">
            {filteredAndSortedPayments.length} Records
          </div>
        </div>
        
        {/* Custom Date Picker Row */}
        {dateFilter === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">From:</label>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 uppercase">To:</label>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
            </div>
          </div>
        )}
      </div>"""

content = content.replace(old_ui, new_ui)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated Reports.jsx")
