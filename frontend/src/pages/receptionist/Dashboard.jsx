import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import axios from 'axios';
import { format, isPast } from 'date-fns';
import { Users, BedDouble, CalendarCheck, Clock, CreditCard, ChevronRight, AlertTriangle, PlusCircle, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
    <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
    <div className="h-10 w-20 bg-gray-200 rounded" />
  </div>
);

const ReceptionistDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentStays, setRecentStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(new Date());
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [statsRes, staysRes] = await Promise.all([
        axios.get(`${API}/api/reports/dashboard${propQuery}`),
        axios.get(`${API}/api/stays?status=Active${ampQuery}`)
      ]);
      setStats(statsRes.data.data);
      setRecentStays(staysRes.data.data); // already sorted by checkout time (earliest first)
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [globalProperty]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => {
    const h = () => fetchDashboardData();
    window.addEventListener('propertyChanged', h);
    return () => window.removeEventListener('propertyChanged', h);
  }, [fetchDashboardData]);

  const overdueStays = recentStays.filter(s => isPast(new Date(s.expectedCheckOutDate)));
  const visibleStays = recentStays.slice(0, 8);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-64 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const occupancyRate = stats ? Math.round((stats.occupiedRooms / ((stats.occupiedRooms || 0) + (stats.availableRooms || 1))) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{format(now, 'EEEE, MMMM do')}</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'} 👋</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">{format(now, 'hh:mm a')} • {stats?.occupiedRooms || 0} rooms occupied</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => fetchDashboardData(true)} className={`p-2.5 text-gray-500 hover:text-black bg-white border border-gray-200 rounded-xl transition-all ${refreshing ? 'animate-spin' : 'hover:border-gray-400'}`}>
            <RefreshCw size={18} />
          </button>
          <Link to="/checkin" className="bg-black text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs shadow-md hover:shadow-xl hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2">
            <PlusCircle size={16} /> Check-In
          </Link>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueStays.length > 0 && (
        <Link to="/checkouts" className="block bg-red-50 border-2 border-red-200 rounded-2xl p-4 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-black text-red-900 text-sm">{overdueStays.length} Overdue Checkout{overdueStays.length > 1 ? 's' : ''}!</p>
              <p className="text-xs text-red-700 font-semibold mt-0.5">{overdueStays.map(s => s.guest?.fullName).join(', ')} — tap to process</p>
            </div>
            <ChevronRight size={20} className="text-red-400" />
          </div>
        </Link>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Occupied</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform"><BedDouble size={16} /></div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-gray-900">{stats?.occupiedRooms || 0}</span>
            <span className="text-xs font-bold text-gray-400">/ {(stats?.occupiedRooms || 0) + (stats?.availableRooms || 0)}</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-700" style={{width: `${occupancyRate}%`}} />
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1">{occupancyRate}% occupancy</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-green-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Available</span>
            <div className="p-2 bg-green-50 text-green-600 rounded-xl group-hover:scale-110 transition-transform"><CalendarCheck size={16} /></div>
          </div>
          <div className="flex items-baseline">
            <span className="text-4xl font-black text-green-600">{stats?.availableRooms || 0}</span>
            <span className="text-xs font-bold text-gray-400 ml-2">rooms free</span>
          </div>
          <p className="text-[10px] text-green-600 font-bold mt-4">Ready to check-in</p>
        </div>

        <Link to="/checkouts" className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-orange-200 hover:shadow-md transition-all block">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Checkouts</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl group-hover:scale-110 transition-transform"><Clock size={16} /></div>
          </div>
          <div className="flex items-baseline">
            <span className="text-4xl font-black text-gray-900">{stats?.checkoutsToday || 0}</span>
            <span className="text-xs font-bold text-gray-400 ml-2">today</span>
          </div>
          <p className="text-[10px] text-orange-500 font-bold mt-4 flex items-center gap-1">Process now <ChevronRight size={10}/></p>
        </Link>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group hover:border-purple-200 hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Dues</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform"><CreditCard size={16} /></div>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-black text-gray-900">₹{(stats?.pendingPayments || 0).toLocaleString('en-IN')}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4">Uncollected balance</p>
        </div>
      </div>

      {/* Active Stays */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">In-House Guests <span className="text-gray-400 text-sm normal-case font-bold">(earliest checkout first)</span></h2>
          <Link to="/checkouts" className="text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
            See all {recentStays.length} <ChevronRight size={14} />
          </Link>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {visibleStays.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {visibleStays.map(stay => {
                const isOverdue = isPast(new Date(stay.expectedCheckOutDate));
                const balance = stay.totalAmount - stay.paidAmount;
                return (
                  <li key={stay._id} className={`p-4 sm:p-5 hover:bg-gray-50/80 transition-colors ${isOverdue ? 'bg-red-50/30' : ''}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-11 w-11 flex-shrink-0 rounded-2xl flex items-center justify-center font-black text-lg ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-800'}`}>
                          {stay.guest?.fullName?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-sm truncate">{stay.guest?.fullName}</p>
                          <p className="text-xs font-bold text-gray-400 mt-0.5">
                            Room <span className="text-gray-900">{stay.room?.roomNumber}</span> • {stay.occupants} {stay.occupants > 1 ? 'guests' : 'guest'}
                          </p>
                          {isOverdue && (
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                              <AlertTriangle size={10} /> Overdue checkout!
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Out</p>
                          <p className={`text-xs font-black ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>{format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</p>
                        </div>
                        {balance > 0 && (
                          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">₹{balance} due</span>
                        )}
                        <Link to={`/checkouts?stay=${stay._id}`} className={`px-3 py-1.5 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm ${isOverdue ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}>
                          {isOverdue ? 'Urgent' : 'Manage'}
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 text-gray-400 mb-4">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-black text-gray-900">No active guests</h3>
              <p className="text-sm text-gray-500 mt-1 font-medium">Hotel is currently empty.</p>
              <Link to="/checkin" className="mt-5 inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-md hover:bg-gray-800 transition-all active:scale-95">
                <PlusCircle size={16} /> Start Check-In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceptionistDashboard;
