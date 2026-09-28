import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_target = "import { addDays, format } from 'date-fns';"
import_replace = "import { addDays, format, addHours } from 'date-fns';"
if "addHours" not in content:
    content = content.replace(import_target, import_replace)

# 1. Initial State
state_target = """  const [stayInfo, setStayInfo] = useState({
    checkInDate: format(new Date(), 'yyyy-MM-dd'),
    expectedCheckOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),"""

state_replace = """  const [stayInfo, setStayInfo] = useState({
    checkInDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    expectedCheckOutDate: format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),"""
content = content.replace(state_target, state_replace)

# 2. Add duration change handler
duration_target = """                    <button
                      key={o.id} type="button"
                      onClick={() => setStayInfo({ ...stayInfo, durationOption: o.id })}"""

duration_replace = """                    <button
                      key={o.id} type="button"
                      onClick={() => {
                        let newCheckOut = new Date(stayInfo.checkInDate);
                        if (o.id === '24h') {
                          newCheckOut = addDays(newCheckOut, 1);
                        } else if (o.id === '12h') {
                          newCheckOut = addHours(newCheckOut, 12);
                        } else if (o.id.startsWith('custom_')) {
                          const hrs = parseInt(o.id.split('_')[1], 10);
                          newCheckOut = addHours(newCheckOut, hrs);
                        }
                        setStayInfo({ 
                          ...stayInfo, 
                          durationOption: o.id,
                          expectedCheckOutDate: format(newCheckOut, "yyyy-MM-dd'T'HH:mm")
                        });
                      }}"""
content = content.replace(duration_target, duration_replace)

# 3. Update Custom Duration handler
custom_target = """                      onClick={() => setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}` })}"""
custom_replace = """                      onClick={() => {
                        const newCheckOut = addHours(new Date(stayInfo.checkInDate), rate.hours);
                        setStayInfo({ ...stayInfo, durationOption: `custom_${rate.hours}`, expectedCheckOutDate: format(newCheckOut, "yyyy-MM-dd'T'HH:mm") })
                      }}"""
content = content.replace(custom_target, custom_replace)

# 4. Remove `stayInfo.durationOption === '24h' && (` block because we want to ALWAYS show Check-out date so they can edit it!
checkout_ui_target = """                {stayInfo.durationOption === '24h' && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-out Date</label>
                    <input type="date" required min={format(addDays(new Date(stayInfo.checkInDate), 1), 'yyyy-MM-dd')}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold"
                      value={stayInfo.expectedCheckOutDate}
                      onChange={e => setStayInfo({ ...stayInfo, expectedCheckOutDate: e.target.value })}
                    />
                    <p className="text-xs text-indigo-600 font-bold mt-2">Total: {nights} night{nights > 1 ? 's' : ''}</p>
                  </div>
                )}"""

checkout_ui_replace = """                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-in Time</label>
                    <input type="datetime-local" required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.checkInDate}
                      onChange={e => {
                        const newIn = new Date(e.target.value);
                        let newOut = new Date(stayInfo.expectedCheckOutDate);
                        if (newIn >= newOut) newOut = addDays(newIn, 1);
                        setStayInfo({ ...stayInfo, checkInDate: e.target.value, expectedCheckOutDate: format(newOut, "yyyy-MM-dd'T'HH:mm") });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Check-out Time</label>
                    <input type="datetime-local" required min={stayInfo.checkInDate}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                      value={stayInfo.expectedCheckOutDate}
                      onChange={e => setStayInfo({ ...stayInfo, expectedCheckOutDate: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-indigo-600 font-bold mt-1">Calculated Math: {nights} night{nights > 1 ? 's' : ''} (or exact hours for short-stays)</p>
                  </div>
                </div>"""
content = content.replace(checkout_ui_target, checkout_ui_replace)

# 5. Fix checkoutDate API payload
payload_target = """      // 2. Create Stay
      const checkoutDate = (stayInfo.durationOption === '12h' || stayInfo.durationOption.startsWith('custom_')) ? stayInfo.checkInDate : stayInfo.expectedCheckOutDate;"""

payload_replace = """      // 2. Create Stay
      const checkoutDate = stayInfo.expectedCheckOutDate;"""
content = content.replace(payload_target, payload_replace)

# 6. Fix Review UI Dates
review_dates_target = """                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Dates</p>
                  <p className="font-bold text-gray-900 mt-0.5">
                    {format(new Date(stayInfo.checkInDate), 'dd MMM')}
                    {stayInfo.durationOption === '24h' && ` → ${format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM')}`}
                  </p>
                </div>"""

review_dates_replace = """                <div className="col-span-2">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Exact Timings</p>
                  <p className="font-bold text-gray-900 mt-0.5 text-sm">
                    {format(new Date(stayInfo.checkInDate), 'dd MMM, hh:mm a')} → {format(new Date(stayInfo.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                  </p>
                </div>"""
content = content.replace(review_dates_target, review_dates_replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckIn with DateTime-local for accurate billing")
