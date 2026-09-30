import sys, re

with open('src/components/layout/AppLayout.jsx', 'r') as f:
    content = f.read()

# Fix the notification text generation
target_logic = """          if (diffMins <= 30 && diffMins > 0) {
            upcoming.push({ id: stay._id, type: 'warning', text: `⏳ ${stay.guest?.fullName} (Room ${stay.room?.roomNumber}) checkout in ${diffMins} mins.` });
          } else if (diffMins <= 0 && diffMins >= -1440) { // Up to 24 hours overdue
            upcoming.push({ id: stay._id, type: 'danger', text: `🚨 ${stay.guest?.fullName} (Room ${stay.room?.roomNumber}) checkout OVERDUE by ${Math.abs(diffMins)} mins!` });
          }"""

replacement_logic = """          const roomDisplay = stay.room ? stay.room.roomNumber : 'N/A';
          const guestName = stay.guest ? stay.guest.fullName : 'Unknown Guest';
          
          if (diffMins <= 30 && diffMins > 0) {
            upcoming.push({ id: stay._id, type: 'warning', title: 'Checkout Soon', text: `${guestName} (Room ${roomDisplay}) checkout in ${diffMins} mins.` });
          } else if (diffMins <= 0 && diffMins >= -1440) {
            upcoming.push({ id: stay._id, type: 'danger', title: 'Checkout Overdue', text: `${guestName} (Room ${roomDisplay}) is overdue by ${Math.abs(diffMins)} mins!` });
          }"""

content = content.replace(target_logic, replacement_logic)

# Fix the notification UI rendering
target_ui = """                        <div className="divide-y divide-gray-50">
                          {notifications.map((notif, idx) => (
                            <div key={idx} className={`p-4 text-sm font-medium ${notif.type === 'danger' ? 'bg-red-50 text-red-800' : 'bg-orange-50 text-orange-800'}`}>
                              {notif.text}
                            </div>
                          ))}
                        </div>"""

replacement_ui = """                        <div className="divide-y divide-gray-100">
                          {notifications.map((notif, idx) => (
                            <Link 
                              to="/checkouts" 
                              key={idx} 
                              onClick={() => setShowNotifications(false)}
                              className={`block p-4 transition-colors hover:bg-gray-50 ${notif.type === 'danger' ? 'bg-red-50/30' : 'bg-orange-50/30'}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.type === 'danger' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}></div>
                                <div>
                                  <p className={`text-xs font-black uppercase tracking-widest mb-1 ${notif.type === 'danger' ? 'text-red-700' : 'text-orange-700'}`}>{notif.title}</p>
                                  <p className="text-sm font-bold text-gray-800 leading-tight">{notif.text}</p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>"""

content = content.replace(target_ui, replacement_ui)

with open('src/components/layout/AppLayout.jsx', 'w') as f:
    f.write(content)
print("Notifications patched")
