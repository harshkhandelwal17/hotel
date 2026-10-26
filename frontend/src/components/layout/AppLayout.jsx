import React, { useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck, Menu, X, ShieldAlert, LayoutGrid, Volume2, VolumeX, Phone, BellRing, ChevronDown, Shirt } from 'lucide-react';
import GlobalSearch from '../common/GlobalSearch';
import soundAlert from '../../utils/soundAlert';
import PoliceReportModal from '../../pages/admin/PoliceReportModal';

const AppLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
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

  const [isAlertMuted, setIsAlertMuted] = useState(soundAlert.getMuteState());

  useEffect(() => {
    const isReceptionist = user?.role === 'receptionist';

    const checkCheckouts = async () => {
      if (!user || user.role === 'superadmin') return;
      try {
        let propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/stays?status=Active${propQuery}`);
        const stays = res.data.data;
        const now = new Date();
        const upcoming = [];

        let shouldPlayUpcoming = false;
        let shouldPlayOverdue = false;
        
        stays.forEach(stay => {
          const checkoutDate = new Date(stay.expectedCheckOutDate);
          const diffMs = checkoutDate - now;
          const diffMins = Math.floor(diffMs / 60000);
          
          const roomDisplay = stay.room ? stay.room.roomNumber : 'N/A';
          const guestName = stay.guest ? stay.guest.fullName : 'Unknown Guest';
          const guestPhone = stay.guest?.mobileNumber || '';
          
          // 1. Upcoming checkout (in bell dropdown list)
          if (diffMins <= 30 && diffMins > 0) {
            upcoming.push({ 
              id: stay._id, 
              type: 'warning', 
              title: 'Checkout Soon', 
              text: `${guestName} (Room ${roomDisplay}) checkout in ${diffMins} mins.`,
              phone: guestPhone,
              guestName,
              room: roomDisplay
            });

            // 🛎️ Audio Bell 1: Only for receptionist, exactly 1 time at 10 minutes before checkout
            if (isReceptionist && diffMins <= 10 && !soundAlert.hasAlertRung(stay._id, '10m_upcoming')) {
              shouldPlayUpcoming = true;
              soundAlert.markAlertRung(stay._id, '10m_upcoming');
            }
          } 
          // 2. Overdue checkout (any stay whose expected checkout time has passed)
          else if (diffMins <= 0) {
            const overdueMins = Math.abs(diffMins);
            let timeText = `${overdueMins} mins`;
            if (overdueMins >= 1440) {
              const days = Math.floor(overdueMins / 1440);
              timeText = `${days} day${days > 1 ? 's' : ''}`;
            } else if (overdueMins >= 60) {
              const hrs = Math.floor(overdueMins / 60);
              const mins = overdueMins % 60;
              timeText = mins > 0 ? `${hrs}h ${mins}m` : `${hrs} hours`;
            }

            upcoming.push({ 
              id: stay._id, 
              type: 'danger', 
              title: 'Checkout Overdue', 
              text: `${guestName} (Room ${roomDisplay}) is overdue by ${timeText}!`,
              phone: guestPhone,
              guestName,
              room: roomDisplay
            });

            // 🛎️ Audio Bell 2: Only for receptionist, exactly 1 time when 30 minutes overdue
            if (isReceptionist && overdueMins >= 30 && !soundAlert.hasAlertRung(stay._id, '30m_overdue')) {
              shouldPlayOverdue = true;
              soundAlert.markAlertRung(stay._id, '30m_overdue');
            }
          }
        });
        
        setNotifications(upcoming);

        // Play the concierge desk bell only for receptionist (double chime for overdue, single chime for 10m upcoming)
        if (isReceptionist) {
          if (shouldPlayOverdue) {
            soundAlert.playHotelBell('double');
          } else if (shouldPlayUpcoming) {
            soundAlert.playHotelBell('single');
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkCheckouts();
    const interval = setInterval(checkCheckouts, 30000); // Check every 30 seconds for precise time window
    
    const handlePropChange = () => checkCheckouts();
    window.addEventListener('propertyChanged', handlePropChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('propertyChanged', handlePropChange);
    };
  }, [globalProperty, user]);

  const toggleSoundMute = () => {
    const muted = soundAlert.toggleMute();
    setIsAlertMuted(muted);
  };

  const handlePropertyChange = (val) => {
    setGlobalProperty(val);
    localStorage.setItem('adminGlobalProperty', val);
    window.dispatchEvent(new Event('propertyChanged')); // simple way to notify
  };

  // 🔒 Plan Expiration Detection
  const isHostelExpired = (h) => {
    if (!h) return false;
    if (h.isActive === false) return true;
    if (h.planStatus === 'expired') return true;
    if (h.planEndDate && new Date(h.planEndDate) < new Date()) return true;
    return false;
  };

  const activeHostel = user?.role === 'receptionist'
    ? user?.assignedHostel
    : (globalProperty !== 'all' ? hostels.find(h => h._id === globalProperty) : null);

  const isCurrentPropertyExpired = isHostelExpired(activeHostel);

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsAdminMenuOpen(false);
  }, [location.pathname]);

  const adminMenuItems = [
    { name: 'Financials & Reports', desc: 'Revenue, collections & PDF', path: '/admin/reports', icon: BarChart3, color: 'text-emerald-600' },
    { name: 'Properties', desc: 'Manage hotel branches', path: '/admin/hostels', icon: Building, color: 'text-blue-600' },
    { name: 'Staff Management', desc: 'Receptionist logins & access', path: '/admin/staff', icon: ShieldCheck, color: 'text-purple-600' },
    { name: 'Manage Rooms', desc: 'Room setup, pricing & types', path: '/admin/rooms', icon: Bed, color: 'text-amber-600' },
  ];

  const isAdminRouteActive = adminMenuItems.some(item => location.pathname.startsWith(item.path));

  let navItems = [];
  
  if (user?.role === 'superadmin') {
    navItems = [
      { name: 'Super Admin', path: '/superadmin', icon: ShieldAlert }
    ];
  } else {
    navItems = [
      { name: 'Dashboard', path: '/dashboard', icon: Home },
      { name: 'Stays', path: '/checkouts', icon: Bed },
      { name: 'Rooms', path: '/rooms', icon: LayoutGrid },
      { name: 'History', path: '/guests', icon: Users },
      { name: 'Payments', path: '/payments', icon: CreditCard },
    ];

    const isLaundryEnabledForUser = user?.role === 'superadmin' ||
      (user?.role === 'receptionist' ? Boolean(activeHostel?.laundryEnabled) :
        (globalProperty !== 'all' ? Boolean(activeHostel?.laundryEnabled) : hostels.some(h => h.laundryEnabled)));

    if (isLaundryEnabledForUser) {
      navItems.push({ name: 'Laundry', path: '/laundry', icon: Shirt });
    }
    
    if (user?.role === 'admin') {
      navItems.push({ name: 'Financials', path: '/admin/reports', icon: BarChart3 });
      navItems.push({ name: 'Properties', path: '/admin/hostels', icon: Building });
      navItems.push({ name: 'Staff', path: '/admin/staff', icon: ShieldCheck });
      navItems.push({ name: 'Manage Rooms', path: '/admin/rooms', icon: Bed });
    }
  }

  const primaryNavItems = user?.role === 'superadmin' ? navItems : navItems.filter(item => ['Dashboard', 'Stays', 'Rooms', 'History', 'Payments', 'Laundry'].includes(item.name));

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
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      {isImpersonating && (
        <div className="bg-orange-500 text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center justify-between shadow-sm z-50 relative w-full">
          <span className="truncate mr-2">⚠️ You are impersonating {user?.name} ({user?.role})</span>
          <button onClick={handleReturnToSuperAdmin} className="bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded transition-colors active:scale-95 shrink-0">
            Return to Superadmin
          </button>
        </div>
      )}
      {/* Premium Topbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm sticky top-0 z-40 w-full">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16 gap-2">
            
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-2 lg:space-x-4 shrink-0">
              <Link to={user?.role === 'superadmin' ? '/superadmin' : '/dashboard'} className="flex-shrink-0 flex items-center space-x-2 mr-1 sm:mr-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-gray-900">NX<span className="text-gray-400">Hotel</span></span>
              </Link>
              <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center ${
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

                {/* Admin Management Dropdown */}
                {user?.role === 'admin' && (
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                      className={`px-2.5 lg:px-3 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 ${
                        isAdminRouteActive
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Hotel Administration & Settings"
                    >
                      <ShieldCheck className={`h-4 w-4 ${isAdminRouteActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>Admin</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isAdminMenuOpen && (
                      <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3.5 py-1.5 border-b border-gray-100 mb-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Management</p>
                        </div>
                        {adminMenuItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname.startsWith(item.path);
                          return (
                            <Link
                              key={item.name}
                              to={item.path}
                              onClick={() => setIsAdminMenuOpen(false)}
                              className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${
                                isActive ? 'bg-gray-100 text-black font-black' : 'text-gray-700 hover:bg-gray-50 font-bold'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg bg-gray-50 border border-gray-100 ${item.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs leading-tight">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-normal truncate mt-0.5">{item.desc}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>
            
            {/* Search Bar */}
            <div className="hidden lg:flex items-center justify-center shrink-1 min-w-0">
              <div className="w-32 lg:w-44 xl:w-56 focus-within:w-60 transition-all duration-300">
                <GlobalSearch />
              </div>
            </div>
            
            {/* Profile & Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Official Police Verification Report Button for Staff / Receptionists / Admin */}
              {user && user.role !== 'superadmin' && (
                <button
                  type="button"
                  onClick={() => setShowPoliceModal(true)}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Generate Official Police Verification Report"
                >
                  <ShieldCheck size={14} />
                  <span className="hidden xl:inline">Police Report</span>
                </button>
              )}

              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="hidden md:block max-w-[120px] lg:max-w-[150px] truncate bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl focus:ring-black focus:border-black p-2 font-semibold shadow-sm outline-none shrink-0"
                  title="Filter by Property"
                >
                  <option value="all">🏢 All Properties</option>
                  {hostels.map(h => {
                    const isExp = isHostelExpired(h);
                    return (
                      <option key={h._id} value={h._id}>
                        {h.name} {isExp ? '🔒 (Expired)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-full transition-colors relative ${notifications.length > 0 ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'}`}
                >
                  <Bell size={20} className={notifications.length > 0 ? 'animate-pulse' : ''} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                      {notifications.length}
                    </span>
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-gray-900">Checkout Alerts</h3>
                        <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full">{notifications.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => soundAlert.playHotelBell('double')}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95"
                          title="Click to test the 5-second loud concierge bell"
                        >
                          <BellRing size={11} className="stroke-[2.5]" />
                          <span>Test Bell</span>
                        </button>
                        <button 
                          onClick={toggleSoundMute}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                            isAlertMuted ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={isAlertMuted ? "Sound alerts muted. Click to un-mute" : "Sound alerts active. Click to mute"}
                        >
                          {isAlertMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          <span>{isAlertMuted ? 'Muted' : 'Sound On'}</span>
                        </button>
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No checkout alerts right now. All on schedule!</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notif, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3.5 transition-colors flex items-center justify-between gap-3 ${notif.type === 'danger' ? 'bg-red-50/40' : 'bg-orange-50/40'}`}
                            >
                              <Link 
                                to="/checkouts" 
                                onClick={() => setShowNotifications(false)}
                                className="flex items-start gap-2.5 flex-1 min-w-0"
                              >
                                <div className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${notif.type === 'danger' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}></div>
                                <div className="min-w-0">
                                  <p className={`text-[10px] font-black uppercase tracking-wider ${notif.type === 'danger' ? 'text-red-700' : 'text-orange-700'}`}>{notif.title}</p>
                                  <p className="text-xs font-bold text-gray-800 leading-snug truncate">{notif.text}</p>
                                </div>
                              </Link>

                              {notif.phone && (
                                <a 
                                  href={`tel:${notif.phone}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm active:scale-95 transition-all shrink-0"
                                  title={`Call ${notif.guestName} (${notif.phone})`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <Phone size={11} className="stroke-[2.5]" />
                                  <span>Call</span>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="hidden md:block h-6 w-[1px] bg-gray-200 mx-0.5 shrink-0"></div>
              
              <div className="hidden md:flex items-center space-x-2 shrink-0">
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[110px]">{user?.name}</p>
                  <p className="text-[10px] font-semibold text-gray-500 capitalize">{user?.role}</p>
                </div>
                <div 
                  className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 shadow-sm flex items-center justify-center text-gray-700 font-bold text-xs uppercase"
                  title={`${user?.name} (${user?.role})`}
                >
                  {user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              
              <button 
                onClick={logout}
                className="hidden md:block p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors shrink-0"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8 animate-in fade-in duration-500">
        {isCurrentPropertyExpired && (
          <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg mb-6 border-2 border-red-300 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded text-red-200">
                      Account Locked
                    </span>
                    <h3 className="text-base font-black tracking-tight">Subscription Plan Expired</h3>
                  </div>
                  <p className="text-xs text-red-100 font-semibold mt-1">
                    The subscription plan for <strong className="text-white underline">{activeHostel?.name || 'this property'}</strong> has expired. Guest check-in, checkout, and room operations are suspended.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                {user?.role === 'admin' ? (
                  <Link
                    to="/admin/hostels"
                    className="flex-1 sm:flex-none text-center px-4 py-2 bg-white text-red-700 hover:bg-red-50 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95"
                  >
                    View Plan Details
                  </Link>
                ) : (
                  <div className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 text-white">
                    Please contact Admin / SuperAdmin to renew
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {children || <Outlet context={{ globalProperty, isCurrentPropertyExpired, activeHostel }} />}
      </main>

      {/* Mobile Navigation Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <Link to={user?.role === 'superadmin' ? '/superadmin' : '/dashboard'} onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-xl font-black tracking-tight text-gray-900">NX<span className="text-gray-400">Hotel</span></span>
              </Link>
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
                  {hostels.map(h => {
                    const isExp = isHostelExpired(h);
                    return (
                      <option key={h._id} value={h._id}>
                        {h.name} {isExp ? '🔒 (Expired)' : ''}
                      </option>
                    );
                  })}
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

      {/* ─── Mobile Bottom App Bar (Staff & Admin only) ─── */}
      {user?.role !== 'superadmin' && (
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
      )}

      {/* Official Police Verification Report Modal */}
      <PoliceReportModal
        isOpen={showPoliceModal}
        onClose={() => setShowPoliceModal(false)}
        defaultHostel={globalProperty}
      />
      
    </div>
  );
};

export default AppLayout;
