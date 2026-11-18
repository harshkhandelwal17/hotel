import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Clock, CheckCircle2, Wrench, BedDouble, RefreshCw, Search, Sparkles } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { apiCache } from '../../utils/apiCache';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const RoomsView = () => {
  const [rooms, setRooms] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

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
  const REASONS = ['AC not working', 'Water leakage', 'Electrical / TV', 'Plumbing', 'Pest / Cleaning', 'Furniture repair'];

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
      setLoading(false); // Instant render in 0ms!
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

  const filtered = rooms.filter(room => {
    const status = getRoomStatus(room);
    const matchSearch = !search || room.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      status.stay?.guest?.fullName?.toLowerCase().includes(search.toLowerCase());
    let matchFilter;
    if (filter === 'dirty') {
      matchFilter = status.label === 'Available' && getHKStatus(room._id) === 'dirty';
    } else {
      matchFilter = filter === 'all' || status.label.toLowerCase() === filter;
    }
    return matchSearch && matchFilter;
  });

  const availCount = rooms.filter(r => getRoomStatus(r).label === 'Available').length;
  const occupCount = rooms.filter(r => getRoomStatus(r).label === 'Occupied').length;
  const maintCount = rooms.filter(r => getRoomStatus(r).label === 'Maintenance').length;
  const dirtyCount = rooms.filter(r => getRoomStatus(r).label === 'Available' && getHKStatus(r._id) === 'dirty').length;

  const statusConfig = {
    Available: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', card: 'border-slate-200 hover:border-slate-300', header: 'bg-emerald-50/60' },
    Occupied:  { dot: 'bg-rose-500 animate-pulse', badge: 'bg-rose-50 text-rose-700 border-rose-200', card: 'border-slate-200 hover:border-slate-300', header: 'bg-rose-50/60' },
    Maintenance:{ dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200', card: 'border-slate-200 hover:border-slate-300', header: 'bg-amber-50/60' },
  };

  if (loading) return (
    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4 animate-pulse">
      {[...Array(10)].map((_, i) => <div key={i} className="h-44 bg-gray-200 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Room Status & Live Occupancy</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {availCount} Available
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {occupCount} Occupied
            </span>
            {maintCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                {maintCount} Maintenance
              </span>
            )}
            {dirtyCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                {dirtyCount} Cleaning Needed
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
            title="Refresh Rooms"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search room number or guest..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {['all', 'available', 'dirty', 'occupied', 'maintenance'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filter === f
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {f === 'dirty' ? '🧹 Dirty' : f === 'all' ? 'All Rooms' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {filtered.length === 0 ? (
        rooms.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs space-y-4 my-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
              🏨
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">No Rooms Configured Yet</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Your property has 0 rooms. Generate starter rooms with realistic categories (Deluxe, Standard, Suite & Family) to instantly test check-in, AI scanner, and occupancy.
              </p>
            </div>
            <button
              onClick={handleSeedStarterRooms}
              disabled={seedingRooms}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>{seedingRooms ? 'Generating Rooms...' : '⚡ Setup 6 Starter Demo Rooms (1-Click)'}</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-400 font-bold">No rooms matching the selected filter.</div>
        )
      ) : (
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 sm:gap-4">
          {filtered.map((room) => {
            const { label, stay } = getRoomStatus(room);
            const cfg = statusConfig[label];
            const balance = stay ? stay.totalAmount - stay.paidAmount : 0;
            const isOverdue = stay && isPast(new Date(stay.expectedCheckOutDate));
            return (
              <div key={room._id} className={`bg-white rounded-2xl border-2 shadow-2xs overflow-hidden transition-all hover:shadow-sm ${cfg.card}`}>
                {/* Top Color Bar */}
                <div className={`h-1.5 w-full ${
                  label === 'Available'
                    ? (getHKStatus(room._id) === 'clean' ? 'bg-green-400' : 'bg-orange-400')
                    : label === 'Occupied' ? 'bg-red-500' : 'bg-yellow-400'
                }`} />
                
                <div className={`px-3 sm:px-4 py-2.5 sm:py-3 ${cfg.header} border-b border-gray-100`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                        <h3 className="font-black text-gray-900 text-base sm:text-lg leading-none">Room {room.roomNumber}</h3>
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">F{room.floor || '1'} • {room.capacity}P</p>
                    </div>
                    {label === 'Available' ? <CheckCircle2 size={16} className="text-green-500 shrink-0" /> :
                     label === 'Occupied' ? <Users size={16} className="text-red-500 shrink-0" /> :
                     <Wrench size={16} className="text-yellow-500 shrink-0" />}
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 space-y-1.5 sm:space-y-2">
                  {stay ? (
                    <>
                      <p className="font-black text-gray-900 text-sm truncate">{stay.guest?.fullName}</p>
                      <p className="text-[10px] font-bold text-gray-500">{stay.occupants} guest{stay.occupants > 1 ? 's' : ''}</p>
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${isOverdue ? 'text-red-600' : 'text-gray-400'}`}>
                        <Clock size={10} />
                        Out: {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                      </div>
                      {balance > 0 && (
                        <div className="bg-red-50 border border-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded-lg">₹{balance} due</div>
                      )}
                      {isOverdue && <div className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">⚠ Overdue</div>}
                      <Link to={`/checkouts?stay=${stay._id}`} className="block mt-1 text-center text-[10px] font-black uppercase tracking-widest py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95">
                        Manage →
                      </Link>
                    </>
                  ) : label === 'Available' ? (
                    <>
                      {/* Housekeeping Status Toggle */}
                      {(() => {
                        const hk = getHKStatus(room._id);
                        return (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRoomHKStatus(room._id, hk === 'clean' ? 'dirty' : 'clean'); }}
                            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                              hk === 'clean'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                            }`}
                            title={hk === 'clean' ? 'Room is cleaned & inspected. Click to mark dirty.' : 'Needs cleaning. Click to mark clean.'}
                          >
                            <span>{hk === 'clean' ? '✓ Clean & Ready' : '🧹 Needs Cleaning'}</span>
                          </button>
                        );
                      })()}
                      <div className="space-y-1.5 text-[10px] text-gray-500 pt-1">
                        <div className="flex justify-between"><span>12h Rate</span><span className="font-black text-gray-800">₹{room.price12h || '—'}</span></div>
                        <div className="flex justify-between"><span>24h Rate</span><span className="font-black text-gray-800">₹{room.price24h || '—'}</span></div>
                      </div>
                      <Link to="/checkin" className="block mt-1 text-center text-[10px] font-black uppercase tracking-widest py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all active:scale-95">
                        + Check In
                      </Link>
                      <button onClick={() => openMaintenance(room, 'start')} className="w-full flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest py-1.5 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-xl hover:bg-yellow-100 transition-all">
                        <Wrench size={11} /> Maintenance
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black text-yellow-700 text-center">Under Maintenance</p>
                      {room.maintenanceReason && (
                        <p className="text-[11px] font-bold text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1.5 leading-snug">{room.maintenanceReason}</p>
                      )}
                      {room.maintenanceSince && (
                        <p className="text-[10px] font-bold text-gray-400 text-center">Since {format(new Date(room.maintenanceSince), 'dd MMM, hh:mm a')}</p>
                      )}
                      <button onClick={() => openMaintenance(room, 'end')} className="w-full text-[10px] font-black uppercase tracking-widest py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all active:scale-95">
                        ✓ Mark Repaired
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Maintenance dialog */}
      {mDialog && createPortal(
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto" onClick={() => setMDialog(null)}>
          <form onSubmit={submitMaintenance} onClick={e => e.stopPropagation()} className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm my-0 sm:my-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 space-y-4 max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><Wrench size={18} className="text-yellow-600" />
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
