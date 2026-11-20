import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  Clock,
  CheckCircle2,
  Wrench,
  BedDouble,
  RefreshCw,
  Search,
  Sparkles,
  Building2,
  Phone,
  MessageSquare,
  ArrowRight,
  Layers,
  Filter,
  Check,
  AlertTriangle,
  Zap,
  DollarSign,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { apiCache } from '../../utils/apiCache';
import { useLanguage } from '../../context/LanguageContext';
import { getStayWhatsAppUrl } from '../../utils/whatsapp';
import StayManageModal from './StayManageModal';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const RoomsView = () => {
  const [rooms, setRooms] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'available' | 'occupied' | 'dirty' | 'maintenance'
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [selectedStayForManage, setSelectedStayForManage] = useState(null);
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const { isHindi, t } = useLanguage();
  const navigate = useNavigate();

  const [housekeepingStatus, setHousekeepingStatus] = useState({});
  const [seedingRooms, setSeedingRooms] = useState(false);

  const handleSeedStarterRooms = async () => {
    try {
      setSeedingRooms(true);
      await axios.post(`${API}/api/rooms/seed-starter`, {
        hostelId: globalProperty !== 'all' ? globalProperty : undefined
      });
      apiCache.clear(`rooms_${globalProperty}`);
      window.dispatchEvent(new Event('hotelDataInvalidated'));
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to seed starter rooms');
    } finally {
      setSeedingRooms(false);
    }
  };

  const activeStaysRef = useRef([]);
  useEffect(() => { activeStaysRef.current = activeStays; }, [activeStays]);

  const setRoomHKStatus = async (roomId, status) => {
    // 1. Instant optimistic UI update
    setHousekeepingStatus(prev => ({ ...prev, [roomId]: status }));
    setRooms(prev => prev.map(r => r._id === roomId ? { ...r, housekeepingStatus: status } : r));

    // 2. Persist to MongoDB server so all staff/devices see it in real-time
    try {
      await axios.patch(`${API}/api/rooms/${roomId}/housekeeping`, { status });
      apiCache.clear(`rooms_${globalProperty}`);
    } catch (err) {
      console.error('Failed to update housekeeping on server', err);
    }
  };

  const getHKStatus = (roomOrId) => {
    const roomId = typeof roomOrId === 'object' && roomOrId !== null ? roomOrId._id : roomOrId;
    if (housekeepingStatus[roomId]) return housekeepingStatus[roomId];
    if (typeof roomOrId === 'object' && roomOrId?.housekeepingStatus) return roomOrId.housekeepingStatus;
    const found = rooms.find(r => r._id === roomId);
    return found?.housekeepingStatus || 'clean';
  };

  // Maintenance dialog: { room, mode: 'start' | 'end' }
  const [mDialog, setMDialog] = useState(null);
  const [mText, setMText] = useState('');
  const [mBusy, setMBusy] = useState(false);
  const [mError, setMError] = useState('');
  const REASONS = [
    'AC not working',
    'Water leakage / Plumbing',
    'Electrical / TV issue',
    'Deep cleaning required',
    'Furniture repair',
    'Door lock / Key issue'
  ];

  useEffect(() => {
    if (mDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mDialog]);

  const openMaintenance = (room, mode) => { setMDialog({ room, mode }); setMText(''); setMError(''); };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    setMBusy(true); setMError('');
    try {
      const { room, mode } = mDialog;
      if (mode === 'start') {
        await axios.post(`${API}/api/rooms/${room._id}/maintenance`, { reason: mText });
      } else {
        await axios.post(`${API}/api/rooms/${room._id}/maintenance/resolve`, { note: mText });
      }
      setMDialog(null);
      apiCache.invalidate('rooms');
      fetchData(true);
    } catch (err) {
      setMError(err.response?.data?.message || 'Something went wrong');
    } finally { setMBusy(false); }
  };

  const fetchData = async (forceSpinner = false) => {
    const cacheKey = `rooms_view_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setRooms(cached.rooms);
      setActiveStays(cached.stays);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const prop = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`${API}/api/rooms${prop}`),
        axios.get(`${API}/api/stays?status=Active${globalProperty !== 'all' ? `&hostel=${globalProperty}` : ''}`),
      ]);
      const newRooms = roomsRes.data.data || [];
      const newStays = staysRes.data.data || [];
      apiCache.set(cacheKey, { rooms: newRooms, stays: newStays });
      apiCache.set(`rooms_${globalProperty}`, newRooms);
      apiCache.set(`stays_active_${globalProperty}`, newStays);
      setRooms(newRooms);
      setActiveStays(newStays);

      // Auto-mark rooms as dirty when they become vacant after checkout
      setHousekeepingStatus(prev => {
        const updated = { ...prev };
        newRooms.forEach(room => {
          const hasActiveStay = newStays.some(s => s.room?._id === room._id);
          if (!hasActiveStay && room.status !== 'Maintenance') {
            const wasOccupied = activeStaysRef.current.some(s => s.room?._id === room._id);
            if (wasOccupied && !updated[room._id]) {
              updated[room._id] = 'dirty';
            }
          }
        });
        localStorage.setItem('hk_status', JSON.stringify(updated));
        return updated;
      });
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData();
    const handleInvalidation = (e) => {
      const prefix = e?.detail?.prefix || '';
      if (!prefix || prefix.includes('rooms') || prefix.includes('stays')) {
        fetchData(false);
      }
    };
    window.addEventListener('hotelDataInvalidated', handleInvalidation);
    return () => window.removeEventListener('hotelDataInvalidated', handleInvalidation);
  }, [globalProperty]);

  const getRoomStatus = (room) => {
    const stay = activeStays.find(s => s.room?._id === room._id);
    if (room.status === 'Maintenance') return { label: 'Maintenance', stay: null };
    if (stay) return { label: 'Occupied', stay };
    return { label: 'Available', stay: null };
  };

  // Distinct floors for floor tabs
  const uniqueFloors = Array.from(new Set(rooms.map(r => String(r.floor || '1')))).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = rooms.filter(room => {
    const status = getRoomStatus(room);
    const roomNo = room.roomNumber || '';
    const guestName = status.stay?.guest?.fullName || '';
    const guestPhone = status.stay?.guest?.mobileNumber || '';

    const matchSearch = !search ||
      roomNo.toLowerCase().includes(search.toLowerCase()) ||
      guestName.toLowerCase().includes(search.toLowerCase()) ||
      guestPhone.includes(search);

    let matchFilter;
    if (filter === 'dirty') {
      matchFilter = status.label === 'Available' && getHKStatus(room._id) === 'dirty';
    } else {
      matchFilter = filter === 'all' || status.label.toLowerCase() === filter;
    }

    const matchFloor = selectedFloor === 'all' || String(room.floor || '1') === selectedFloor;

    return matchSearch && matchFilter && matchFloor;
  });

  const availCount = rooms.filter(r => getRoomStatus(r).label === 'Available').length;
  const occupCount = rooms.filter(r => getRoomStatus(r).label === 'Occupied').length;
  const maintCount = rooms.filter(r => getRoomStatus(r).label === 'Maintenance').length;
  const dirtyCount = rooms.filter(r => getRoomStatus(r).label === 'Available' && getHKStatus(r._id) === 'dirty').length;
  const totalCount = rooms.length;
  const occupancyPercent = totalCount > 0 ? Math.round((occupCount / totalCount) * 100) : 0;

  const handleCardClick = (room, status) => {
    if (status.label === 'Available') {
      // Direct 1-Click Check-In route with preselected roomId and roomNumber
      navigate(`/checkin?roomId=${room._id}&roomNumber=${room.roomNumber}`);
    } else if (status.label === 'Occupied' && status.stay) {
      // Instant Stay Management modal right on screen
      setSelectedStayForManage(status.stay);
    } else if (status.label === 'Maintenance') {
      openMaintenance(room, 'end');
    }
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-14 bg-gray-200 rounded-2xl w-full" />
      <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(10)].map((_, i) => <div key={i} className="h-56 bg-gray-200 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      
      {/* ====================================================================
          TOP OCCUPANCY MATRIX & LIVE METRICS BAR
      ==================================================================== */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BedDouble className="text-emerald-600" size={24} />
              <span>{isHindi ? 'कमरा स्थिति एवं लाइव ऑक्यूपेंसी' : 'Room Status & Live Occupancy'}</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-900 text-white shadow-xs">
              {totalCount} {isHindi ? 'कुल कमरे' : 'Rooms'}
            </span>
          </div>

          {/* Occupancy Progress & Metric Strip */}
          <div className="flex items-center gap-2 sm:gap-4 mt-2.5 flex-wrap text-xs font-black">
            {/* Live Occupancy Percentage Gauge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-900 border border-slate-200 shadow-2xs">
              <TrendingUp size={14} className="text-emerald-600" />
              <span>{occupancyPercent}% {isHindi ? 'ऑक्यूपेंसी' : 'Occupancy'}</span>
            </div>

            {/* Available */}
            <button
              type="button"
              onClick={() => setFilter('available')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                filter === 'available'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>{availCount} {isHindi ? 'उपलब्ध' : 'Available'}</span>
            </button>

            {/* Occupied */}
            <button
              type="button"
              onClick={() => setFilter('occupied')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                filter === 'occupied'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>{occupCount} {isHindi ? 'अधिग्रहित' : 'Occupied'}</span>
            </button>

            {/* Needs Cleaning */}
            {dirtyCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter('dirty')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                  filter === 'dirty'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <span>🧹</span>
                <span>{dirtyCount} {isHindi ? 'सफाई बाकी' : 'Needs Cleaning'}</span>
              </button>
            )}

            {/* Maintenance */}
            {maintCount > 0 && (
              <button
                type="button"
                onClick={() => setFilter('maintenance')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all border cursor-pointer ${
                  filter === 'maintenance'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                }`}
              >
                <Wrench size={12} className="text-amber-500" />
                <span>{maintCount} {isHindi ? 'मेंटेनेंस' : 'Maintenance'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Controls: Group Check-in + Refresh */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <Link
            to="/checkin?mode=group"
            className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Users size={14} />
            <span>{isHindi ? 'ग्रुप चेक-इन' : 'Group Check-In'}</span>
          </Link>
          <button
            onClick={() => fetchData(true)}
            className="p-2 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Refresh Rooms"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ====================================================================
          SEARCH & FILTER STRIP (FLOOR + STATUS TABS)
      ==================================================================== */}
      <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={isHindi ? "कमरा नंबर, अतिथि का नाम या फोन सर्च करें..." : "Search room number, guest name or phone..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
          />
        </div>

        {/* Floor Filter Chips */}
        {uniqueFloors.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 hidden sm:inline">
              {isHindi ? 'मंजिल:' : 'Floor:'}
            </span>
            <button
              onClick={() => setSelectedFloor('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedFloor === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {isHindi ? 'सभी मंजिलें' : 'All Floors'}
            </button>
            {uniqueFloors.map(floor => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedFloor === floor
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {isHindi ? `मंजिल ${floor}` : `Floor ${floor}`}
              </button>
            ))}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar shrink-0">
          {[
            { id: 'all', label: isHindi ? 'सभी कमरे' : 'All Rooms', count: totalCount },
            { id: 'available', label: isHindi ? '✨ उपलब्ध' : '✨ Available', count: availCount },
            { id: 'dirty', label: isHindi ? '🧹 सफाई बाकी' : '🧹 Dirty', count: dirtyCount },
            { id: 'occupied', label: isHindi ? '🔴 अधिग्रहित' : '🔴 Occupied', count: occupCount },
            { id: 'maintenance', label: isHindi ? '⚠️ मेंटेनेंस' : '⚠️ Maintenance', count: maintCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/90'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${filter === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ====================================================================
          ROOMS GRID (LUXURY, HIGH-VISIBILITY COLOR MATRIX)
      ==================================================================== */}
      {filtered.length === 0 ? (
        rooms.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
              🏨
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {isHindi ? 'कोई कमरा सेटअप नहीं है' : 'No Rooms Configured Yet'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {isHindi
                  ? 'आपकी प्रॉपर्टी में अभी कमरे नहीं हैं। 1-क्लिक में 6 डेमो कमरे बनाएं और चेक-इन, रेट्स एवं ऑक्यूपेंसी टेस्ट करें।'
                  : 'Your property has 0 rooms. Generate starter rooms with realistic categories (Deluxe, Standard, Suite & Family) to instantly test check-in, AI scanner, and occupancy.'}
              </p>
            </div>
            <button
              onClick={handleSeedStarterRooms}
              disabled={seedingRooms}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>{seedingRooms ? (isHindi ? 'कमरे बन रहे हैं...' : 'Generating Rooms...') : (isHindi ? '⚡ 6 डेमो कमरे बनाएं (1-Click)' : '⚡ Setup 6 Starter Demo Rooms (1-Click)')}</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold">
            {isHindi ? 'चयनित फिल्टर से मेल खाने वाला कोई कमरा नहीं मिला।' : 'No rooms matching the selected filter.'}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((room) => {
            const { label, stay } = getRoomStatus(room);
            const isAvailable = label === 'Available';
            const isOccupied = label === 'Occupied';
            const isMaint = label === 'Maintenance';
            const hk = getHKStatus(room._id);
            const isDirty = isAvailable && hk === 'dirty';
            const balance = stay ? (Number(stay.totalAmount) || 0) - (Number(stay.paidAmount) || 0) : 0;
            const isOverdue = stay && isPast(new Date(stay.expectedCheckOutDate));

            return (
              <div
                key={room._id}
                onClick={() => handleCardClick(room, { label, stay })}
                className={`group bg-white rounded-2xl border-2 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer relative ${
                  isAvailable
                    ? (isDirty
                        ? 'border-amber-200 hover:border-amber-400 bg-amber-50/10'
                        : 'border-slate-200 hover:border-emerald-500 hover:shadow-emerald-500/10')
                    : isOccupied
                    ? 'border-slate-200 hover:border-rose-400 hover:shadow-rose-500/10'
                    : 'border-amber-300 bg-amber-50/20'
                }`}
              >
                {/* Top Glowing Color Accent Bar */}
                <div
                  className={`h-2 w-full transition-all ${
                    isAvailable
                      ? (isDirty ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500')
                      : isOccupied
                      ? 'bg-gradient-to-r from-rose-500 to-red-600'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500'
                  }`}
                />

                {/* Card Header: Room Number + Status Badge */}
                <div className={`p-3.5 pb-2.5 border-b ${
                  isAvailable
                    ? (isDirty ? 'bg-amber-50/40 border-amber-100' : 'bg-emerald-50/30 border-emerald-100/60')
                    : isOccupied
                    ? 'bg-rose-50/30 border-rose-100/60'
                    : 'bg-amber-50/40 border-amber-100'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          isAvailable
                            ? (isDirty ? 'bg-amber-500' : 'bg-emerald-500')
                            : isOccupied
                            ? 'bg-rose-500 animate-pulse'
                            : 'bg-amber-500'
                        }`} />
                        <h3 className="font-black text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors">
                          Room {room.roomNumber}
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        F{room.floor || '1'} • {room.roomType || 'Standard'} • {room.capacity}P
                      </p>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0 text-right">
                      {isAvailable ? (
                        isDirty ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                            <span>🧹</span>
                            <span>{isHindi ? 'सफाई बाकी' : 'Dirty'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={10} className="text-emerald-600" />
                            <span>{isHindi ? 'उपलब्ध' : 'Available'}</span>
                          </span>
                        )
                      ) : isOccupied ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                          <span>{isHindi ? 'अधिग्रहित' : 'Occupied'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Wrench size={10} className="text-amber-700" />
                          <span>{isHindi ? 'मेंटेनेंस' : 'Blocked'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body: Dynamic Content per Status */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  {/* CASE 1: AVAILABLE ROOM */}
                  {isAvailable && (
                    <>
                      <div className="space-y-2">
                        {/* Housekeeping Toggle Pill */}
                        <div className="flex items-center justify-between gap-1 text-[10.5px]">
                          <span className="text-slate-400 font-bold">{isHindi ? 'सफाई स्थिति:' : 'Housekeeping:'}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRoomHKStatus(room._id, hk === 'clean' ? 'dirty' : 'clean');
                            }}
                            className={`px-2 py-0.5 rounded-lg font-black text-[9.5px] uppercase transition-all cursor-pointer border ${
                              hk === 'clean'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                            }`}
                            title="Click to toggle room clean/dirty status"
                          >
                            {hk === 'clean' ? (isHindi ? '✓ साफ व तैयार' : '✓ Clean & Ready') : (isHindi ? '🧹 सफाई जरूरी' : '🧹 Needs Cleaning')}
                          </button>
                        </div>

                        {/* Room Price Strip */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-slate-500 font-bold">
                            <span>12 Hours Rate</span>
                            <span className="font-black text-slate-900">₹{room.price12h || '—'}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-500 font-bold">
                            <span>24 Hours Rate</span>
                            <span className="font-black text-slate-900">₹{room.price24h || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Available Room Primary Action: Instant Check-In */}
                      <div className="space-y-1.5 pt-1">
                        <Link
                          to={`/checkin?roomId=${room._id}&roomNumber=${room.roomNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
                        >
                          <Zap size={13} className="text-amber-300" />
                          <span>{isHindi ? 'चेक-इन करें →' : 'Check In Now →'}</span>
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMaintenance(room, 'start');
                          }}
                          className="w-full py-1 text-[10px] font-bold text-slate-400 hover:text-amber-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Wrench size={10} />
                          <span>{isHindi ? 'मेंटेनेंस में डालें' : 'Block for Maintenance'}</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* CASE 2: OCCUPIED ROOM */}
                  {isOccupied && stay && (
                    <>
                      <div className="space-y-2">
                        {/* Group Booking Badge if present */}
                        {stay.groupId && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 truncate max-w-full">
                            <Building2 size={10} className="shrink-0 text-purple-700" />
                            <span className="truncate">{stay.groupName || 'Group'}</span>
                          </div>
                        )}

                        {/* Guest Primary Details */}
                        <div>
                          <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight flex items-center justify-between">
                            <span>{stay.guest?.fullName || 'Guest'}</span>
                            <span className="text-[10px] text-slate-400 font-bold lowercase">
                              {stay.occupants}p
                            </span>
                          </p>
                          {stay.guest?.mobileNumber && (
                            <p className="text-[10.5px] font-bold text-slate-500 mt-0.5">
                              📞 +91 {stay.guest.mobileNumber}
                            </p>
                          )}
                        </div>

                        {/* Expected Check-Out Time & Overdue Alert */}
                        <div className={`p-2 rounded-xl border text-[11px] font-bold ${
                          isOverdue
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                              <Clock size={11} />
                              <span>{isHindi ? 'चेक-आउट:' : 'Out:'}</span>
                            </span>
                            <span className="font-black">
                              {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                            </span>
                          </div>
                          {isOverdue && (
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-700">
                              <AlertTriangle size={11} />
                              <span>{isHindi ? 'चेक-आउट समय समाप्त!' : 'Check-Out Overdue!'}</span>
                            </div>
                          )}
                        </div>

                        {/* Financial Balance Tag */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-bold text-[10.5px]">{isHindi ? 'पेमेंट स्थिति:' : 'Payment:'}</span>
                          {balance > 0 ? (
                            <span className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              ₹{balance} {isHindi ? 'बाकी' : 'Due'}
                            </span>
                          ) : (
                            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              ✓ {isHindi ? 'पूर्ण भुगतान' : 'Fully Paid'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Occupied Actions: Manage Stay Modal + WhatsApp */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStayForManage(stay);
                          }}
                          className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-center"
                        >
                          <UserCheck size={13} className="text-emerald-400" />
                          <span>{isHindi ? 'स्टे मैनेज करें →' : 'Manage Stay →'}</span>
                        </button>

                        {stay.guest?.mobileNumber && (
                          <a
                            href={getStayWhatsAppUrl(stay, 'bill') || `https://wa.me/${stay.guest.mobileNumber.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                            title="Send WhatsApp message / Bill"
                          >
                            <MessageSquare size={14} />
                          </a>
                        )}
                      </div>
                    </>
                  )}

                  {/* CASE 3: MAINTENANCE ROOM */}
                  {isMaint && (
                    <>
                      <div className="space-y-2 text-center py-2">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                          <Wrench size={18} />
                        </div>
                        <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                          {isHindi ? 'कमरा मेंटेनेंस में है' : 'Under Maintenance'}
                        </p>
                        {room.maintenanceReason && (
                          <p className="text-xs font-bold text-slate-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 text-left">
                            {room.maintenanceReason}
                          </p>
                        )}
                        {room.maintenanceSince && (
                          <p className="text-[10px] font-bold text-slate-400">
                            Since {format(new Date(room.maintenanceSince), 'dd MMM, hh:mm a')}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMaintenance(room, 'end');
                        }}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        {isHindi ? '✓ रिपेयर पूर्ण मार्क करें' : '✓ Mark Repaired & Ready'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          SEAMLESS STAY MANAGE MODAL (OPENS DIRECTLY INSIDE ROOMS MATRIX)
      ==================================================================== */}
      {selectedStayForManage && (
        <StayManageModal
          stay={selectedStayForManage}
          onClose={() => setSelectedStayForManage(null)}
          onChanged={() => {
            fetchData(true);
          }}
          onCheckout={() => {
            setSelectedStayForManage(null);
            fetchData(true);
          }}
        />
      )}

      {/* ====================================================================
          MAINTENANCE REASON & REPAIR MODAL
      ==================================================================== */}
      {mDialog && createPortal(
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto" onClick={() => setMDialog(null)}>
          <form onSubmit={submitMaintenance} onClick={e => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm my-0 sm:my-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 space-y-4 max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Wrench size={18} className="text-amber-600" />
                {mDialog.mode === 'start' ? `Room ${mDialog.room.roomNumber} → Maintenance` : `Room ${mDialog.room.roomNumber} repaired?`}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {mDialog.mode === 'start'
                  ? 'The room will be blocked from check-in until you mark it repaired.'
                  : 'The room will become available for check-in again.'}
              </p>
            </div>
            {mError && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">{mError}</div>}
            {mDialog.mode === 'start' && (
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button type="button" key={r} onClick={() => setMText(r)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${mText === r ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}>{r}</button>
                ))}
              </div>
            )}
            <input
              required={mDialog.mode === 'start'}
              value={mText} onChange={e => setMText(e.target.value)}
              placeholder={mDialog.mode === 'start' ? 'What is the problem?' : 'What was fixed? (optional)'}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-black outline-none" />
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-2">
              <button type="button" onClick={() => setMDialog(null)} className="w-full sm:flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button disabled={mBusy} className="w-full sm:flex-1 py-3 bg-black text-white rounded-xl font-bold disabled:opacity-50 text-sm shadow-md active:scale-95">
                {mBusy ? 'Saving...' : mDialog.mode === 'start' ? 'Block Room' : 'Mark Repaired'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RoomsView;
