import React, { useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Home, Users, Bed, LogOut, Bell, PlusCircle, Building, CreditCard, BarChart3, Hexagon, ShieldCheck, Menu, X, ShieldAlert, LayoutGrid, Volume2, VolumeX, Phone, BellRing, ChevronDown, Shirt, Keyboard, Search, Globe } from 'lucide-react';
import GlobalSearch from '../common/GlobalSearch';
import CommandPalette from '../common/CommandPalette';
import ShortcutsModal from '../common/ShortcutsModal';
import LanguageSettingsModal from '../common/LanguageSettingsModal';
import soundAlert from '../../utils/soundAlert';
import PoliceReportModal from '../../pages/admin/PoliceReportModal';
import { apiCache, prefetchRoute } from '../../utils/apiCache';
import { useLanguage } from '../../context/LanguageContext';

const AppLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const { language, setLanguage, t, isHindi } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const isMac = typeof window !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0;

  const fetchHostels = () => {
    if (!user) return;
    axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
      .then(res => {
        const fetchedHostels = res.data.data || [];
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
  };

  useEffect(() => {
    fetchHostels();
    window.addEventListener('propertyChanged', fetchHostels);
    return () => window.removeEventListener('propertyChanged', fetchHostels);
  }, [user]);

  // Global Keyboard Shortcuts (⌘K / Ctrl+K, single-key navigation & cheatsheet)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // 1. Toggle Command Palette with Cmd+K or Ctrl+K (works anywhere!)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }

      // 2. Escape closes open menus/modals
      if (e.key === 'Escape') {
        if (showCommandPalette) setShowCommandPalette(false);
        if (showShortcutsModal) setShowShortcutsModal(false);
        return;
      }

      // Check if user is typing in an input / textarea / select
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable;
      if (isInput || showCommandPalette || showShortcutsModal) return;

      // 3. Question mark (?) opens shortcuts guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // 4. Standalone single-letter navigation
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === 'n') {
          e.preventDefault();
          navigate('/checkin');
        } else if (k === 'o') {
          e.preventDefault();
          navigate('/checkouts');
        } else if (k === 'r') {
          e.preventDefault();
          navigate('/rooms');
        } else if (k === 'd') {
          e.preventDefault();
          navigate('/dashboard');
        } else if (k === 'p') {
          e.preventDefault();
          navigate('/payments');
        } else if (k === 'l') {
          e.preventDefault();
          navigate('/laundry');
        } else if (k === 'f') {
          e.preventDefault();
          navigate('/admin/reports');
        } else if (k === 'g') {
          e.preventDefault();
          navigate('/guests');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showCommandPalette, showShortcutsModal, navigate]);

  const [isAlertMuted, setIsAlertMuted] = useState(soundAlert.getMuteState());

  useEffect(() => {
    const isReceptionist = user?.role === 'receptionist';

    const checkCheckouts = async () => {
      if (!user || user.role === 'superadmin') return;
      try {
        let propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
        const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/stays?status=Active${propQuery}`);
        const stays = res.data.data;
        if (Array.isArray(stays)) {
          apiCache.set(`stays_active_${globalProperty}`, stays);
        }
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

  const assignedHostelId = typeof user?.assignedHostel === 'object' ? user?.assignedHostel?._id : user?.assignedHostel;
  const activeHostel = user?.role === 'receptionist'
    ? (hostels.find(h => h._id === assignedHostelId) || user?.assignedHostel || hostels[0])
    : (globalProperty !== 'all' ? (hostels.find(h => h._id === globalProperty) || hostels[0]) : (hostels[0] || null));

  const isCurrentPropertyExpired = isHostelExpired(activeHostel);

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target)) {
        setIsAdminMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsAdminMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const adminMenuItems = [
    { name: t('nav.financialReports', 'Financials & Reports'), desc: isHindi ? 'रेवेन्यू, कलेक्शन व रिपोर्ट्स' : 'Revenue, collections & PDF', path: '/admin/reports', icon: BarChart3, color: 'text-emerald-600' },
    { name: t('nav.propertySettings', 'Properties'), desc: isHindi ? 'होटल ब्रांचेस मैनेज करें' : 'Manage hotel branches', path: '/admin/hostels', icon: Building, color: 'text-blue-600' },
    { name: t('nav.manageStaff', 'Staff Management'), desc: isHindi ? 'रिसेप्शनिस्ट लॉगिन व राइट्स' : 'Receptionist logins & access', path: '/admin/staff', icon: ShieldCheck, color: 'text-purple-600' },
    { name: t('nav.manageRooms', 'Manage Rooms'), desc: isHindi ? 'कमरे, किराया व टाइप सेटअप' : 'Room setup, pricing & types', path: '/admin/rooms', icon: Bed, color: 'text-amber-600' },
  ];

  const isAdminRouteActive = adminMenuItems.some(item => location.pathname.startsWith(item.path));

  let navItems = [];
  
  if (user?.role === 'superadmin') {
    navItems = [
      { id: 'superadmin', name: t('nav.superadmin', 'Super Admin'), path: '/superadmin', icon: ShieldAlert }
    ];
  } else {
    navItems = [
      { id: 'dashboard', name: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home },
      { id: 'stays', name: t('nav.stays', 'Stays'), path: '/checkouts', icon: Bed },
      { id: 'rooms', name: t('nav.rooms', 'Rooms'), path: '/rooms', icon: LayoutGrid },
      { id: 'history', name: t('nav.history', 'History'), path: '/guests', icon: Users },
      { id: 'payments', name: t('nav.payments', 'Payments'), path: '/payments', icon: CreditCard },
    ];

    const isLaundryEnabledForUser = user?.role === 'superadmin' ||
      (user?.role === 'receptionist' ? Boolean(activeHostel?.laundryEnabled) :
        (globalProperty !== 'all' ? Boolean(activeHostel?.laundryEnabled) : hostels.some(h => h.laundryEnabled)));

    if (isLaundryEnabledForUser) {
      navItems.push({ id: 'laundry', name: t('nav.laundry', 'Laundry'), path: '/laundry', icon: Shirt });
    }
    
    if (user?.role === 'admin') {
      navItems.push({ id: 'reports', name: t('nav.financialReports', 'Financials'), path: '/admin/reports', icon: BarChart3 });
      navItems.push({ id: 'hostels', name: t('nav.propertySettings', 'Properties'), path: '/admin/hostels', icon: Building });
      navItems.push({ id: 'staff', name: t('nav.manageStaff', 'Staff'), path: '/admin/staff', icon: ShieldCheck });
      navItems.push({ id: 'rooms_admin', name: t('nav.manageRooms', 'Manage Rooms'), path: '/admin/rooms', icon: Bed });
    }
  }

  const primaryNavItems = user?.role === 'superadmin' ? navItems : navItems.filter(item => ['dashboard', 'stays', 'rooms', 'history', 'payments', 'laundry'].includes(item.id));

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
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs sticky top-0 z-40 w-full">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-2 xl:gap-4">
            
            {/* Logo & Navigation */}
            <div className="flex items-center space-x-2 xl:space-x-4 min-w-0">
              <Link to={user?.role === 'superadmin' ? '/superadmin' : '/dashboard'} className="flex-shrink-0 flex items-center space-x-2 mr-1 sm:mr-3">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shrink-0">
                  <Hexagon className="text-white w-5 h-5" />
                </div>
                <span className="text-lg xl:text-xl font-black tracking-tight text-gray-900 shrink-0">NX<span className="text-gray-400">Hotel</span></span>
              </Link>
              
              <nav className="hidden lg:flex items-center space-x-1 xl:space-x-1.5 min-w-0">
                {primaryNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      onMouseEnter={() => prefetchRoute(item.path, globalProperty)}
                      className={`px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center shrink-0 ${
                        isActive
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className={`mr-1.5 h-3.5 w-3.5 xl:h-4 xl:w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}

                {/* Admin Management Dropdown */}
                {user?.role === 'admin' && (
                  <div className="relative shrink-0" ref={adminMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                      className={`px-2 py-1.5 xl:px-3 xl:py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                        isAdminRouteActive
                          ? 'bg-black text-white shadow-md'
                          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Hotel Administration & Settings"
                    >
                      <ShieldCheck className={`h-3.5 w-3.5 xl:h-4 xl:w-4 ${isAdminRouteActive ? 'text-white' : 'text-gray-400'}`} />
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

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button
                            type="button"
                            onClick={() => { setIsAdminMenuOpen(false); setShowLangModal(true); }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 transition-colors text-gray-700 hover:bg-gray-50 font-bold text-left cursor-pointer"
                          >
                            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-tight">{isHindi ? 'भाषा सेटिंग्स' : 'Language Settings'}</p>
                              <p className="text-[10px] text-gray-400 font-normal truncate mt-0.5">{isHindi ? 'English / हिंदी बदलें' : 'Switch English & Hindi'}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </div>
            
            {/* Profile & Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Command Palette Trigger */}
              <button
                type="button"
                onClick={() => setShowCommandPalette(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200/90 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-950 transition-all shadow-2xs group cursor-pointer shrink-0"
                title={isHindi ? "सर्च या कमांड (⌘K / Ctrl+K)" : "Search or command (⌘K / Ctrl+K)"}
              >
                <Search size={14} className="text-gray-400 group-hover:text-black transition-colors" />
                <span className="hidden xl:inline text-xs font-bold text-gray-500 group-hover:text-black">{t('common.search', 'Search')}</span>
                <kbd className="hidden sm:inline-flex items-center px-1 py-0.2 bg-white border border-gray-200 rounded text-[9px] font-mono font-black text-gray-400 group-hover:text-black shadow-2xs">
                  {isMac ? '⌘K' : '^K'}
                </kbd>
              </button>

              {/* Daily Official Police Verification Report Button */}
              {user && user.role !== 'superadmin' && (
                <button
                  type="button"
                  onClick={() => setShowPoliceModal(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                  title={isHindi ? "दैनिक पुलिस सत्यापन रिपोर्ट तैयार करें" : "Generate Daily Police Verification Report"}
                >
                  <ShieldCheck size={14} className="stroke-[2.5]" />
                  <span className="hidden sm:inline">{t('nav.policeReport', 'Police Report')}</span>
                </button>
              )}

              {/* Property Selector for Multi-Property Admins */}
              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="hidden md:block max-w-[120px] lg:max-w-[140px] truncate bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-xl focus:ring-black focus:border-black p-1.5 font-semibold shadow-2xs outline-none shrink-0"
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

              {/* Overdue & Departure Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-xl transition-colors relative ${notifications.length > 0 ? 'text-gray-900 bg-red-50 hover:bg-red-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
                  title={notifications.length > 0 ? `${notifications.length} Overdue Checkouts` : 'Checkout Alerts'}
                >
                  <Bell size={18} className={notifications.length > 0 ? 'animate-pulse text-red-600' : ''} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-red-600 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-sm">
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

              {/* ─── Unified Account & Settings Dropdown ─── */}
              <div className="relative shrink-0" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                  title={`${user?.name} (${user?.role})`}
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-gray-900 to-gray-700 text-white shadow-2xs flex items-center justify-center font-black text-xs uppercase shrink-0">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left hidden xl:block min-w-0 max-w-[120px]">
                    <p className="text-xs font-bold text-gray-900 leading-tight truncate">{user?.name}</p>
                    <p className="text-[10px] font-semibold text-gray-400 capitalize truncate">{user?.role}</p>
                  </div>
                  <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 hidden sm:block ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-black text-sm uppercase shrink-0">
                          {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-gray-900 truncate">{user?.name}</p>
                          <p className="text-xs text-gray-500 font-medium capitalize truncate">{user?.role} • {activeHostel?.name || 'NXHotel'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Language Switch Segment */}
                    <div className="px-3.5 py-2.5 border-b border-gray-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <Globe size={11} className="text-indigo-600" />
                          <span>{isHindi ? 'सिस्टम भाषा' : 'Display Language'}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 bg-gray-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLanguage('en')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                            language === 'en'
                              ? 'bg-white text-gray-950 shadow-2xs font-black'
                              : 'text-gray-600 hover:text-gray-950'
                          }`}
                        >
                          English
                        </button>
                        <button
                          type="button"
                          onClick={() => setLanguage('hi')}
                          className={`py-1.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                            language === 'hi'
                              ? 'bg-white text-gray-950 shadow-2xs font-black'
                              : 'text-gray-600 hover:text-gray-950'
                          }`}
                        >
                          हिंदी
                        </button>
                      </div>
                    </div>

                    {/* Quick Operations */}
                    <div className="py-1">
                      {user?.role !== 'superadmin' && (
                        <button
                          type="button"
                          onClick={() => { setIsUserMenuOpen(false); setShowPoliceModal(true); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                        >
                          <ShieldCheck size={15} className="text-indigo-600 shrink-0" />
                          <span>{t('nav.policeReport', 'Police Verification Report')}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => { setIsUserMenuOpen(false); setShowShortcutsModal(true); }}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Keyboard size={15} className="text-gray-500 shrink-0" />
                          <span>{isHindi ? 'कीबोर्ड शॉर्टकट्स' : 'Keyboard Shortcuts'}</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">?</kbd>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setIsUserMenuOpen(false); setShowCommandPalette(true); }}
                        className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Search size={15} className="text-gray-500 shrink-0" />
                          <span>{isHindi ? 'कमांड पैलेट' : 'Command Palette'}</span>
                        </div>
                        <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono text-gray-500">{isMac ? '⌘K' : '^K'}</kbd>
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="border-t border-gray-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={() => { setIsUserMenuOpen(false); logout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={15} className="shrink-0" />
                        <span>{t('nav.logout', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-24 md:pb-8">
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
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowCommandPalette(true);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 active:scale-95 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Search size={15} className="text-gray-500" />
                    <span>Search or Commands</span>
                  </span>
                  <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded font-mono font-black text-gray-500">
                    {isMac ? '⌘K' : 'Ctrl+K'}
                  </span>
                </button>
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

              {/* Mobile Language Switcher */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => { setIsMobileMenuOpen(false); setShowLangModal(true); }}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-800 border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe size={18} className="text-indigo-600" />
                    <span>{isHindi ? 'भाषा सेटिंग्स' : 'Language Settings'}</span>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white text-gray-900 border border-gray-200">
                    {isHindi ? 'हिंदी' : 'English'}
                  </span>
                </button>
              </div>
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
            <Link to="/dashboard" onMouseEnter={() => prefetchRoute('/dashboard', globalProperty)} onTouchStart={() => prefetchRoute('/dashboard', globalProperty)} className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/dashboard' ? 'text-black' : 'text-gray-400'}`}>
              <Home size={22} className={location.pathname === '/dashboard' ? 'fill-black' : ''} />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">{t('nav.dashboard', 'Home')}</span>
            </Link>

            <Link to="/rooms" onMouseEnter={() => prefetchRoute('/rooms', globalProperty)} onTouchStart={() => prefetchRoute('/rooms', globalProperty)} className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname === '/rooms' ? 'text-black' : 'text-gray-400'}`}>
              <LayoutGrid size={22} className={location.pathname === '/rooms' ? 'stroke-black stroke-[2.5]' : ''} />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">{t('nav.rooms', 'Rooms')}</span>
            </Link>
            
            <div className="relative -top-5">
              <Link to="/checkin" onMouseEnter={() => prefetchRoute('/checkin', globalProperty)} onTouchStart={() => prefetchRoute('/checkin', globalProperty)} className="flex items-center justify-center w-14 h-14 bg-black text-white rounded-full shadow-xl hover:bg-gray-800 transition-all active:scale-95 border-4 border-[#F9FAFB]">
                <PlusCircle size={28} />
              </Link>
            </div>
            
            <Link to="/checkouts" onMouseEnter={() => prefetchRoute('/checkouts', globalProperty)} onTouchStart={() => prefetchRoute('/checkouts', globalProperty)} className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'text-black' : 'text-gray-400'}`}>
              <Users size={22} className={location.pathname.startsWith('/checkouts') || location.pathname.startsWith('/guests') ? 'fill-black' : ''} />
              <span className="text-[9px] font-bold mt-1 uppercase tracking-widest">{t('nav.stays', 'Stays')}</span>
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

      {/* Global Command Palette (⌘K / Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenPoliceReport={() => setShowPoliceModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        user={user}
        globalProperty={globalProperty}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal (?) */}
      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Language Settings Modal */}
      <LanguageSettingsModal
        isOpen={showLangModal}
        onClose={() => setShowLangModal(false)}
      />
      
    </div>
  );
};

export default AppLayout;
