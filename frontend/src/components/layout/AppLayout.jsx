import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck, Menu, X } from 'lucide-react';
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
  }, [globalProperty, user]);

  const handlePropertyChange = (val) => {
    setGlobalProperty(val);
    localStorage.setItem('adminGlobalProperty', val);
    window.dispatchEvent(new Event('propertyChanged')); // simple way to notify
  };

  let navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Guests', path: '/checkouts', icon: Users },
    { name: 'Payments', path: '/payments', icon: CreditCard },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Properties', path: '/admin/hostels', icon: Building });
    navItems.push({ name: 'Staff', path: '/admin/staff', icon: ShieldCheck });
    navItems.push({ name: 'Manage Rooms', path: '/admin/rooms', icon: Bed });
    navItems.push({ name: 'Financials', path: '/admin/reports', icon: BarChart3 });
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {/* Premium Topbar */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-4 md:space-x-6">
              
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:text-black rounded-lg focus:outline-none"
              >
                <Menu size={24} />
              </button>
              <Link to="/dashboard" className="flex-shrink-0 flex items-center space-x-2 mr-4">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-gray-900">Hotel<span className="text-gray-400">Pro</span></span>
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
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
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
                <span className="text-xl font-black tracking-tight text-gray-900">Hotel<span className="text-gray-400">Pro</span></span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-400 hover:text-red-600 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="px-4 pt-4 pb-2">
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
    </div>
  );
};

export default AppLayout;
