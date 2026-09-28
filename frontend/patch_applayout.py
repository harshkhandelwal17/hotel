import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# 1. Add states for notifications
state_target = """  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');"""

state_replace = """  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);"""
content = content.replace(state_target, state_replace)

# 2. Add useEffect for polling
effect_target = """  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels').then(res => setHostels(res.data.data)).catch(console.error);
    }
  }, [user]);"""

effect_replace = """  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels').then(res => setHostels(res.data.data)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const checkCheckouts = async () => {
      if (!user) return;
      try {
        let propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/stays?status=Active${propQuery}`);
        const stays = res.data.data;
        const now = new Date();
        const upcoming = [];
        
        stays.forEach(stay => {
          const checkoutDate = new Date(stay.expectedCheckOutDate);
          const diffMs = checkoutDate - now;
          const diffMins = Math.floor(diffMs / 60000);
          
          if (diffMins <= 30 && diffMins > 0) {
            upcoming.push({ id: stay._id, type: 'warning', text: `⏳ ${stay.guest?.fullName} (Room ${stay.room?.roomNumber}) checkout in ${diffMins} mins.` });
          } else if (diffMins <= 0 && diffMins >= -1440) { // Up to 24 hours overdue
            upcoming.push({ id: stay._id, type: 'danger', text: `🚨 ${stay.guest?.fullName} (Room ${stay.room?.roomNumber}) checkout OVERDUE by ${Math.abs(diffMins)} mins!` });
          }
        });
        
        setNotifications(upcoming);
      } catch (err) {
        console.error(err);
      }
    };

    checkCheckouts();
    const interval = setInterval(checkCheckouts, 60000); // Check every minute
    
    const handlePropChange = () => checkCheckouts();
    window.addEventListener('propertyChanged', handlePropChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('propertyChanged', handlePropChange);
    };
  }, [globalProperty, user]);"""
content = content.replace(effect_target, effect_replace)

# 3. Update the Bell Icon to show the dropdown
bell_target = """              <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>"""

bell_replace = """              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-full transition-colors relative ${notifications.length > 0 ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <Bell size={20} className={notifications.length > 0 ? 'animate-pulse' : ''} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-black text-gray-900">Alerts</h3>
                      <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No new notifications</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {notifications.map((notif, idx) => (
                            <div key={idx} className={`p-4 text-sm font-medium ${notif.type === 'danger' ? 'bg-red-50 text-red-800' : 'bg-orange-50 text-orange-800'}`}>
                              {notif.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>"""
content = content.replace(bell_target, bell_replace)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Added Notification system to AppLayout.jsx")
