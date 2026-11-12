import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format, isPast, isToday } from 'date-fns';
import { 
  Users, 
  BedDouble, 
  CalendarCheck, 
  Clock, 
  CreditCard, 
  ChevronRight, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  Phone, 
  Banknote,
  Search,
  CheckCircle2,
  User,
  MessageSquare
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiCache } from '../../utils/apiCache';
import { getInvoiceWhatsAppUrl } from '../../utils/invoice';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const SkeletonCard = () => (
  <div className="bg-white p-5 rounded-2xl shadow-2xs border border-gray-200/80 animate-pulse space-y-3">
    <div className="h-3.5 w-20 bg-gray-200 rounded" />
    <div className="h-8 w-24 bg-gray-200 rounded" />
    <div className="h-3 w-32 bg-gray-100 rounded" />
  </div>
);

const ReceptionistDashboard = () => {
  const { user } = useContext(AuthContext);
  const { t, isHindi } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
    }
  }, [user, navigate]);

  const [stats, setStats] = useState(null);
  const [recentStays, setRecentStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [now, setNow] = useState(new Date());
  const [guestSearch, setGuestSearch] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all' | 'overdue' | 'dueToday'
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    const cacheKey = `dashboard_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !showRefreshing) {
      setStats(cached.stats);
      setRecentStays(cached.stays);
      setLoading(false);
    } else if (!cached) {
      setLoading(true);
    }

    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [statsRes, staysRes, hostelsRes] = await Promise.all([
        axios.get(`${API}/api/reports/dashboard${propQuery}`),
        axios.get(`${API}/api/stays?status=Active${ampQuery}`),
        axios.get(`${API}/api/hostels`).catch(() => ({ data: { data: [] } }))
      ]);
      const newStats = statsRes.data.data;
      const newStays = staysRes.data.data || [];
      const hostelList = hostelsRes.data?.data || [];
      setHostels(hostelList);
      apiCache.set(cacheKey, { stats: newStats, stays: newStays });
      apiCache.set(`stays_active_${globalProperty}`, newStays);
      setStats(newStats);
      setRecentStays(newStays);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [globalProperty]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => {
    const h = () => fetchDashboardData(false);
    window.addEventListener('propertyChanged', h);
    window.addEventListener('hotelDataInvalidated', h);
    return () => {
      window.removeEventListener('propertyChanged', h);
      window.removeEventListener('hotelDataInvalidated', h);
    };
  }, [fetchDashboardData]);

  const overdueStays = useMemo(() => {
    return recentStays.filter(s => isPast(new Date(s.expectedCheckOutDate)));
  }, [recentStays]);

  const dueTodayStays = useMemo(() => {
    return recentStays.filter(s => isToday(new Date(s.expectedCheckOutDate)));
  }, [recentStays]);

  // Filtered in-house stays based on search & tab
  const filteredStays = useMemo(() => {
    return recentStays.filter(stay => {
      // Tab filter
      if (activeFilterTab === 'overdue' && !isPast(new Date(stay.expectedCheckOutDate))) return false;
      if (activeFilterTab === 'dueToday' && !isToday(new Date(stay.expectedCheckOutDate))) return false;

      // Search query
      if (!guestSearch.trim()) return true;
      const q = guestSearch.toLowerCase().trim();
      const name = (stay.guest?.fullName || '').toLowerCase();
      const phone = (stay.guest?.mobileNumber || '').toLowerCase();
      const room = (stay.room?.roomNumber || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || room.includes(q);
    });
  }, [recentStays, activeFilterTab, guestSearch]);

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full mx-auto pb-12">
        <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const totalRooms = stats?.totalRooms || ((stats?.occupiedRooms || 0) + (stats?.availableRooms || 0));
  const occupancyRate = stats ? Math.round((stats.occupiedRooms / (totalRooms || 1)) * 100) : 0;

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return t('dashboard.greetingMorning', 'Good Morning');
    if (hour < 17) return t('dashboard.greetingAfternoon', 'Good Afternoon');
    return t('dashboard.greetingEvening', 'Good Evening');
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-in fade-in duration-300 w-full mx-auto pb-12">
      
      {/* ─── Compact Executive Greeting Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight flex items-center gap-1.5">
              <span>{getGreeting()}</span>
              <span className="text-gray-400 font-bold">, {user?.name || 'Reception'}</span>
              <span>👋</span>
            </h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200/80 flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {stats?.occupiedRooms || 0}/{totalRooms} {t('dashboard.occupiedSummary', 'rooms occupied')} ({occupancyRate}% {t('dashboard.capacity', 'Capacity')})
            </span>
          </div>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">
            {format(now, 'EEEE, MMMM do, yyyy')} • {format(now, 'hh:mm a')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button"
            onClick={() => fetchDashboardData(true)} 
            className={`p-2 text-gray-600 hover:text-black bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-all cursor-pointer ${refreshing ? 'animate-spin' : 'hover:border-gray-300'}`}
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw size={15} />
          </button>

          <Link 
            to="/checkin" 
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle size={14} />
            <span>{t('dashboard.checkIn', 'Check-In')}</span>
          </Link>
        </div>
      </div>

      {/* ─── Urgent Overdue Checkout Banner ─── */}
      {overdueStays.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-red-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle size={16} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-red-950 uppercase tracking-wide">
                  {overdueStays.length} {t('dashboard.overdueBanner', 'Checkout(s) Overdue')}
                </span>
                <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded uppercase tracking-wider">
                  {t('common.actionRequired', 'Action Required')}
                </span>
              </div>
              <p className="text-xs text-red-800 font-medium mt-0.5 truncate">
                Rooms: {overdueStays.map(s => `Room ${s.room?.roomNumber} (${s.guest?.fullName || 'Guest'})`).join(' • ')}
              </p>
            </div>
          </div>

          <Link 
            to="/checkouts" 
            className="self-start sm:self-auto px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{t('dashboard.processCheckouts', 'Process Checkouts')}</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      )}

      {/* ─── KPI Metrics Grid (Executive Luxury Design) ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        
        {/* 1. Occupied */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-gray-400 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.occupiedTitle', 'Occupied')}</span>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                <BedDouble size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-950">{stats?.occupiedRooms || 0}</span>
              <span className="text-xs font-bold text-gray-400">/ {totalRooms}</span>
            </div>
          </div>
          <div className="mt-3.5">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-black h-1.5 rounded-full transition-all duration-700" style={{ width: `${occupancyRate}%` }} />
            </div>
            <p className="text-[10px] text-gray-500 font-bold mt-1.5">{occupancyRate}% {t('dashboard.capacity', 'Occupancy')}</p>
          </div>
        </div>

        {/* 2. Available */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.availableTitle', 'Available')}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CalendarCheck size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats?.availableRooms || 0}</span>
              <span className="text-xs font-bold text-gray-400">{t('dashboard.roomsFree', 'rooms free')}</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-700 font-bold mt-3.5">{t('dashboard.readyToCheckIn', 'Ready for check-in')}</p>
        </div>

        {/* 3. Check-Ins Today */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-gray-400 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.checkinsToday', 'Check-Ins')}</span>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                <Users size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-950">{stats?.checkinsToday || 0}</span>
              <span className="text-xs font-bold text-gray-400">{t('dashboard.arrivals', 'arrivals')}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold mt-3.5">{t('dashboard.recordedToday', 'Recorded today')}</p>
        </div>

        {/* 4. Checkouts Today */}
        <Link 
          to="/checkouts" 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-black transition-all group cursor-pointer"
        >
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.checkoutsToday', 'Checkouts')}</span>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-black group-hover:text-white transition-colors">
                <Clock size={14} />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-gray-950">{stats?.checkoutsToday || 0}</span>
              <span className="text-xs font-bold text-gray-400">{t('common.dueToday', 'today')}</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 font-bold mt-3.5 flex items-center gap-1 group-hover:text-black">
            <span>{t('dashboard.processDepartures', 'Process departures')}</span>
            <ChevronRight size={11} />
          </p>
        </Link>

        {/* 5. Pending Dues */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-rose-200 transition-colors">
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.pendingDues', 'Pending Dues')}</span>
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
                <CreditCard size={14} />
              </div>
            </div>
            <div className="flex items-baseline">
              <span className={`text-xl sm:text-2xl font-black ${(stats?.pendingPayments || 0) > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                ₹{(stats?.pendingPayments || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 font-bold mt-3.5">{t('dashboard.uncollectedBalance', 'Uncollected guest balance')}</p>
        </div>

        {/* 6. Net Cash in Drawer */}
        <Link 
          to="/reports" 
          className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between hover:border-emerald-300 transition-all group cursor-pointer"
        >
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{t('dashboard.drawerCash', 'Drawer Cash')}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Banknote size={14} />
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="text-xl sm:text-2xl font-black text-emerald-700">
                ₹{(stats?.todayNetCashInDrawer || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-gray-500 font-bold mt-3.5 flex items-center justify-between">
            <span>{t('dashboard.cashIn', 'In')}: ₹{(stats?.todayCashCollected || 0).toLocaleString('en-IN')}</span>
            <span className="text-rose-600">{t('dashboard.cashExp', 'Exp')}: -₹{(stats?.todayCashExpense || 0).toLocaleString('en-IN')}</span>
          </div>
        </Link>
      </div>

      {/* ─── Active Operations: In-House Guests Section ─── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200/70 shadow-xs overflow-hidden">
        
        {/* Section Header with Tabs & Search */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-950 uppercase tracking-wider flex items-center gap-2">
              <span>{t('dashboard.inHouseTitle', 'In-House Guests & Stays')}</span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold">
                {recentStays.length} {t('common.active', 'Active')}
              </span>
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {t('dashboard.inHouseSubtitle', 'Real-time room occupancy, checkout schedule, and folio balances')}
            </p>
          </div>

          {/* Search & Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200/60">
              <button
                type="button"
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilterTab === 'all' ? 'bg-white text-gray-950 shadow-2xs font-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {t('common.all', 'All')} ({recentStays.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab('overdue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeFilterTab === 'overdue' ? 'bg-white text-red-600 shadow-2xs font-black' : 'text-gray-500 hover:text-red-600'
                }`}
              >
                <span>{t('common.overdue', 'Overdue')}</span>
                {overdueStays.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-100 text-red-800 font-black">
                    {overdueStays.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveFilterTab('dueToday')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeFilterTab === 'dueToday' ? 'bg-white text-gray-950 shadow-2xs font-black' : 'text-gray-500 hover:text-black'
                }`}
              >
                {t('common.dueToday', 'Due Today')} ({dueTodayStays.length})
              </button>
            </div>

            {/* Quick Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('dashboard.searchGuestOrRoom', 'Search guest or room...')}
                value={guestSearch}
                onChange={(e) => setGuestSearch(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 placeholder-gray-400 focus:outline-hidden focus:bg-white focus:border-black transition-all"
              />
            </div>
          </div>
        </div>

        {/* Guests List */}
        {filteredStays.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredStays.map((stay) => {
              const isOverdue = isPast(new Date(stay.expectedCheckOutDate));
              const isTodayCheckout = isToday(new Date(stay.expectedCheckOutDate));
              const balance = Number(stay.totalAmount || 0) - Number(stay.paidAmount || 0);
              const guestId = stay.guest?._id;

              return (
                <div 
                  key={stay._id} 
                  className={`p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isOverdue ? 'bg-red-50/20' : ''
                  }`}
                >
                  {/* Left Column: Room & Guest Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Room Pill */}
                    <div className="w-14 h-14 rounded-2xl bg-gray-950 text-white flex flex-col items-center justify-center shrink-0 shadow-xs">
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Room</span>
                      <span className="text-base font-black leading-tight">{stay.room?.roomNumber || '—'}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {guestId ? (
                          <Link 
                            to={`/guests/${guestId}`}
                            className="font-black text-gray-950 text-sm hover:underline hover:text-black truncate"
                            title="Open full guest profile"
                          >
                            {stay.guest?.fullName || 'Guest'}
                          </Link>
                        ) : (
                          <span className="font-black text-gray-950 text-sm truncate">{stay.guest?.fullName || 'Guest'}</span>
                        )}

                        {isOverdue ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                            {t('common.overdue', 'Overdue')}
                          </span>
                        ) : isTodayCheckout ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                            {t('common.dueToday', 'Due Today')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-700">
                            {t('common.active', 'Active')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 font-bold mt-1 flex items-center gap-2 flex-wrap">
                        {stay.guest?.mobileNumber && (
                          <span className="text-gray-600 font-mono">{stay.guest.mobileNumber}</span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span>{stay.occupants || 1} {Number(stay.occupants) > 1 ? t('common.guests', 'Guests') : t('common.guest', 'Guest')}</span>
                        {stay.bookingNumber && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400 font-mono text-[11px]">#{stay.bookingNumber}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Checkout Schedule, Folio Balance & Direct Actions */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    
                    {/* Schedule */}
                    <div className="text-left md:text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.expectedCheckout', 'Expected Checkout')}</p>
                      <p className={`text-xs font-black mt-0.5 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                        {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        In: {format(new Date(stay.checkInDate), 'dd MMM')}
                      </p>
                    </div>

                    {/* Folio Balance */}
                    <div className="text-left md:text-right min-w-[90px]">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('dashboard.folio', 'Folio')}</p>
                      {balance > 0 ? (
                        <p className="text-xs font-black text-red-600 mt-0.5">
                          ₹{balance.toLocaleString('en-IN')} {t('common.pending', 'Due')}
                        </p>
                      ) : (
                        <p className="text-xs font-black text-emerald-700 mt-0.5 flex md:justify-end items-center gap-1">
                          <CheckCircle2 size={11} /> {t('common.paid', 'Paid')}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 font-medium">{t('common.total', 'Total')} ₹{Number(stay.totalAmount || 0).toLocaleString('en-IN')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {/* Direct Phone Call */}
                      {stay.guest?.mobileNumber && (
                        <a
                          href={`tel:${stay.guest.mobileNumber}`}
                          className="p-2 text-gray-600 hover:text-black bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title={`Call ${stay.guest?.fullName}`}
                        >
                          <Phone size={14} />
                        </a>
                      )}

                      {/* WhatsApp Link with Pre-filled Stay & Bill Summary */}
                      {stay.guest?.mobileNumber && (
                        <a
                          href={getInvoiceWhatsAppUrl(stay) || `https://wa.me/${stay.guest.mobileNumber.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs cursor-pointer"
                          title={isHindi ? "व्हाट्सएप पर बिल व विवरण भेजें" : "Send Bill & Stay Summary on WhatsApp"}
                        >
                          <MessageSquare size={14} />
                        </a>
                      )}

                      {/* Profile Button */}
                      {guestId && (
                        <Link
                          to={`/guests/${guestId}`}
                          className="px-3 py-2 bg-white hover:bg-gray-100 text-gray-900 border border-gray-200 rounded-xl font-bold text-xs transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Open full guest profile"
                        >
                          <span>{t('dashboard.profile', 'Profile')}</span>
                        </Link>
                      )}

                      {/* Manage / Checkout Button */}
                      <Link 
                        to={`/checkouts?stay=${stay._id}`} 
                        className={`px-3.5 py-2 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer ${
                          isOverdue 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-black hover:bg-gray-800'
                        }`}
                      >
                        {isOverdue ? t('dashboard.urgent', 'Urgent') : t('dashboard.manage', 'Manage')}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 mb-3">
              <Users size={26} />
            </div>
            <h3 className="text-base font-black text-gray-900">
              {guestSearch ? (isHindi ? 'कोई मेल खाता अतिथि नहीं मिला' : 'No matching in-house guests') : (isHindi ? 'वर्तमान में कोई इन-हाउस अतिथि नहीं है' : 'No in-house guests currently')}
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {guestSearch 
                ? (isHindi ? `"${guestSearch}" से मिलता-जुलता कोई रिकॉर्ड नहीं मिला।` : `No stays found matching "${guestSearch}". Try a different name or room.`)
                : (isHindi ? 'सभी कमरे खाली हैं और नए चेक-इन के लिए तैयार हैं।' : 'Rooms are vacant and ready for new reservations.')}
            </p>
            {!guestSearch && (
              <Link 
                to="/checkin" 
                className="mt-4 inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-sm hover:bg-gray-800 transition-all active:scale-95"
              >
                <PlusCircle size={15} />
                <span>{t('dashboard.checkIn', 'Start Check-In')}</span>
              </Link>
            )}
          </div>
        )}

        {/* Card Footer */}
        {recentStays.length > 0 && (
          <div className="p-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
            <span>{isHindi ? `कुल ${recentStays.length} में से ${filteredStays.length} सक्रिय स्टे दिखाए जा रहे हैं` : `Showing ${filteredStays.length} of ${recentStays.length} active stays`}</span>
            <Link to="/checkouts" className="text-gray-900 hover:underline flex items-center gap-1 font-black">
              <span>{isHindi ? 'सभी चेकआउट व फोलियो देखें' : 'View All Checkouts & Folios'}</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
