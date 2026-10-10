import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck, Menu, X, ShieldAlert } from 'lucide-react';
import GlobalSearch from '../common/GlobalSearch';

const AppLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
        .then(res => {
          const fetchedHostels = res.data.data;
          setHostels(fetchedHostels);
          
          // Reset globalProperty if it doesn't belong to this admin
          if (globalProperty !== 'all') {
            const isValid = fetchedHostels.some(h => h._id === globalProperty);
            if (!isValid) {
              setGlobalProperty('all');
              localStorage.setItem('adminGlobalProperty', 'all');
              window.dispatchEvent(new Event('propertyChanged'));
            }
          }
        })
        .catch(console.error);
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
          
          const roomDisplay = stay.room ? stay.room.roomNumber : 'N/A';
          const guestName = stay.guest ? stay.guest.fullName : 'Unknown Guest';
          
          if (diffMins <= 30 && diffMins > 0) {
            upcoming.push({ id: stay._id, type: 'warning', title: 'Checkout Soon', text: `${guestName} (Room ${roomDisplay}) checkout in ${diffMins} mins.` });
          } else if (diffMins <= 0 && diffMins >= -1440) {
            upcoming.push({ id: stay._id, type: 'danger', title: 'Checkout Overdue', text: `${guestName} (Room ${roomDisplay}) is overdue by ${Math.abs(diffMins)} mins!` });
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
  }, [globalProperty, user]);

  const handlePropertyChange = (val) => {
    setGlobalProperty(val);
    localStorage.setItem('adminGlobalProperty', val);
    window.dispatchEvent(new Event('propertyChanged')); // simple way to notify
  };

  let navItems = [];
  
  if (user?.role === 'superadmin') {
    navItems = [
      { name: 'Super Admin', path: '/superadmin', icon: ShieldAlert }
    ];
  } else {
    navItems = [
      { name: 'Dashboard', path: '/dashboard', icon: Home },
      { name: 'Stays', path: '/checkouts', icon: Bed },
      { name: 'History', path: '/guests', icon: Users },
      { name: 'Payments', path: '/payments', icon: CreditCard },
    ];
    
    if (user?.role === 'admin') {
      navItems.push({ name: 'Properties', path: '/admin/hostels', icon: Building });
      navItems.push({ name: 'Staff', path: '/admin/staff', icon: ShieldCheck });
      navItems.push({ name: 'Manage Rooms', path: '/admin/rooms', icon: Bed });
      navItems.push({ name: 'Financials', path: '/admin/reports', icon: BarChart3 });
    }
  }

  const handleReturnToSuperAdmin = () => {
    const saToken = localStorage.getItem('superAdminToken');
    if (saToken) {
      localStorage.setItem('token', saToken);
      localStorage.removeItem('superAdminToken');
      window.location.href = '/superadmin';
    }
  };

  const isImpersonating = !!localStorage.getItem('superAdminToken');

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {isImpersonating && (
        <div className="bg-orange-500 text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center justify-between shadow-sm z-50 relative">
          <span>⚠️ You are impersonating {user?.name} ({user?.role})</span>
          <button onClick={handleReturnToSuperAdmin} className="bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded transition-colors active:scale-95">
            Return to Superadmin
          </button>
        </div>
      )}
      {/* Premium Topbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-4 md:space-x-6">
              
              {/* Mobile Menu Button (Hidden now since we have bottom nav, but kept in DOM for reference) */}
              <div className="hidden"></div>
              <Link to="/dashboard" className="flex-shrink-0 flex items-center space-x-2 mr-4">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-gray-900">NX<span className="text-gray-400">Hotel</span></span>
              </Link>
              <nav className="hidden md:flex space-x-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center ${
                        isActive
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`mr-1.5 h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            
            {/* Search Bar */}
            <div className="hidden md:flex flex-1 items-center justify-center px-4 sm:px-6">
              <div className="w-full max-w-md">
                <GlobalSearch />
              </div>
            </div>
            
            {/* Profile & Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="hidden md:block bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black p-2 font-semibold shadow-sm outline-none"
                >
                  <option value="all">🏢 All Properties</option>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              )}
              <div className="relative">
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
                  <div className="absolute right-0 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="text-sm font-black text-gray-900">Alerts</h3>
                      <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No new notifications</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
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
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="hidden md:block h-8 w-[1px] bg-gray-200 mx-1"></div>
              
              <div className="hidden md:flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-xs font-semibold text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 shadow-sm flex items-center justify-center text-gray-700 font-bold uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              
              <button 
                onClick={logout}
                className="hidden md:block ml-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8 animate-in fade-in duration-500">
        {children || <Outlet context={{ globalProperty }} />}
      </main>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-gray-900">NX<span className="text-gray-400">Hotel</span></span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-red-600 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="px-4 pt-4 pb-2">
              <div className="mb-4">
                <GlobalSearch onResultClick={() => setIsMobileMenuOpen(false)} />
              </div>
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
            <nav className="flex-1 px-4 pb-6 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`px-4 py-3.5 rounded-xl text-base font-bold transition-all flex items-center ${
                      isActive
                        ? 'bg-black text-white shadow-md'
                        : 'text-gray-600 hover:text-black hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 border border-gray-300 shadow-sm flex items-center justify-center text-gray-800 font-black uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-xs font-bold text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Mobile Bottom App Bar ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center h-16 px-2">
          <Link to="/dashboard" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/dashboard' ? 'text-black' : 'text-gray-400'}`}>
            <Home size={22} className={location.pathname === '/dashboard' ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Home</span>
          </Link>
          
          <Link to="/checkouts" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'text-black' : 'text-gray-400'}`}>
            <Users size={22} className={location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Guests</span>
          </Link>
          
          <div className="relative -top-5">
            <Link to="/checkin" className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-xl hover:bg-gray-800 transition-all active:scale-95 border-4 border-[#F9FAFB]">
              <PlusCircle size={28} />
            </Link>
          </div>
          
          <Link to="/payments" className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/payments' ? 'text-black' : 'text-gray-400'}`}>
            <CreditCard size={22} className={location.pathname === '/payments' ? 'fill-black' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">Pay</span>
          </Link>
          
          <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center justify-center w-16 h-full text-gray-400 hover:text-black transition-colors">
            <Menu size={22} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">More</span>
          </button>
        </div>
      </nav>
      
    </div>
  );
};

export default AppLayout;
