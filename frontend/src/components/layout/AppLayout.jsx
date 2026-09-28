import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck } from 'lucide-react';
import GlobalSearch from '../common/GlobalSearch';

const AppLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');

  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get('http://127.0.0.1:5001/api/hostels').then(res => setHostels(res.data.data)).catch(console.error);
    }
  }, [user]);

  const handlePropertyChange = (val) => {
    setGlobalProperty(val);
    localStorage.setItem('adminGlobalProperty', val);
    window.dispatchEvent(new Event('propertyChanged')); // simple way to notify
  };

  let navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Rooms', path: '/rooms', icon: Bed },
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
            <div className="flex items-center space-x-6">
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
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6">
              <div className="w-full max-w-md">
                <GlobalSearch />
              </div>
            </div>
            
            {/* Profile & Actions */}
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
              <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              <div className="h-8 w-[1px] bg-gray-200 mx-1"></div>
              
              <div className="flex items-center space-x-3">
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
                className="ml-1 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
    </div>
  );
};

export default AppLayout;
