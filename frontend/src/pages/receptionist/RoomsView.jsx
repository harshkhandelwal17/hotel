import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Clock, CheckCircle2, Wrench, BedDouble, RefreshCw, Search, Sparkles } from 'lucide-react';
import { format, isPast } from 'date-fns';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const RoomsView = () => {
  const [rooms, setRooms] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  // Maintenance dialog: { room, mode: 'start' | 'end' }
  const [mDialog, setMDialog] = useState(null);
  const [mText, setMText] = useState('');
  const [mBusy, setMBusy] = useState(false);
  const [mError, setMError] = useState('');
  const REASONS = ['AC not working', 'Water leakage', 'Electrical / TV', 'Plumbing', 'Pest / Cleaning', 'Furniture repair'];

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
      fetchData();
    } catch (err) {
      setMError(err.response?.data?.message || 'Something went wrong');
    } finally { setMBusy(false); }
  };

  useEffect(() => { fetchData(); }, [globalProperty]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const prop = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`${API}/api/rooms${prop}`),
        axios.get(`${API}/api/stays?status=Active${globalProperty !== 'all' ? `&hostel=${globalProperty}` : ''}`),
      ]);
      setRooms(roomsRes.data.data);
      setActiveStays(staysRes.data.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleHousekeeping = async (room, status) => {
    try {
      // Optimistic instant UI update
      setRooms(prev => prev.map(r => r._id === room._id ? { ...r, housekeepingStatus: status, lastCleanedAt: status === 'Clean' ? new Date() : r.lastCleanedAt } : r));
      await axios.patch(`${API}/api/rooms/${room._id}/housekeeping`, { housekeepingStatus: status });
    } catch (err) {
      console.error('Failed to update housekeeping:', err);
      fetchData(); // Rollback on error
    }
  };

  const getRoomStatus = (room) => {
    const stay = activeStays.find(s => s.room?._id === room._id);
    if (room.status === 'Maintenance') return { label: 'Maintenance', stay: null, hk: 'Maintenance' };
    if (stay) return { label: 'Occupied', stay, hk: 'Occupied' };
    const hk = room.housekeepingStatus || 'Clean';
    return { label: 'Available', stay: null, hk };
  };

  const filtered = rooms.filter(room => {
    const status = getRoomStatus(room);
    const matchSearch = !search || room.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      status.stay?.guest?.fullName?.toLowerCase().includes(search.toLowerCase());
    
    let matchFilter = true;
    if (filter === 'clean') {
      matchFilter = status.label === 'Available' && (room.housekeepingStatus === 'Clean' || !room.housekeepingStatus);
    } else if (filter === 'dirty') {
      matchFilter = status.label === 'Available' && (room.housekeepingStatus === 'Dirty' || room.housekeepingStatus === 'Cleaning');
    } else if (filter === 'occupied') {
      matchFilter = status.label === 'Occupied';
    } else if (filter === 'maintenance') {
      matchFilter = status.label === 'Maintenance';
    }
    return matchSearch && matchFilter;
  });

  const cleanCount = rooms.filter(r => getRoomStatus(r).label === 'Available' && (r.housekeepingStatus === 'Clean' || !r.housekeepingStatus)).length;
  const dirtyCount = rooms.filter(r => getRoomStatus(r).label === 'Available' && (r.housekeepingStatus === 'Dirty' || r.housekeepingStatus === 'Cleaning')).length;
  const occupCount = rooms.filter(r => getRoomStatus(r).label === 'Occupied').length;
  const maintCount = rooms.filter(r => getRoomStatus(r).label === 'Maintenance').length;

  const statusConfig = {
    Available: { dot: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200', card: 'border-green-100 hover:border-green-300 hover:shadow-green-50', header: 'bg-green-50' },
    Occupied:  { dot: 'bg-red-500 animate-pulse', badge: 'bg-red-50 text-red-700 border-red-200', card: 'border-red-100 hover:border-red-300 hover:shadow-red-50', header: 'bg-red-50' },
    Maintenance:{ dot: 'bg-yellow-500', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', card: 'border-yellow-100', header: 'bg-yellow-50' },
  };

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 animate-pulse">
      {[...Array(12)].map((_, i) => <div key={i} className="h-44 bg-gray-200 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Room Status & Housekeeping</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap text-xs sm:text-sm font-bold">
            <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
              <Sparkles size={13} className="text-emerald-600" /> {cleanCount} Clean & Ready
            </span>
            {dirtyCount > 0 && (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                🧹 {dirtyCount} Needs Cleaning
              </span>
            )}
            <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/60">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> {occupCount} Occupied
            </span>
            {maintCount > 0 && (
              <span className="flex items-center gap-1.5 text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-200/60">
                <Wrench size={13} className="text-yellow-600" /> {maintCount} Maintenance
              </span>
            )}
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 text-gray-500 hover:text-black bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-all self-start sm:self-auto shadow-xs">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search room or guest..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:border-black focus:ring-0 outline-none transition-all shadow-xs"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {[
            { key: 'all', label: `All (${rooms.length})` },
            { key: 'clean', label: `Clean (${cleanCount})` },
            { key: 'dirty', label: `Dirty (${dirtyCount})` },
            { key: 'occupied', label: `Occupied (${occupCount})` },
            { key: 'maintenance', label: `Maintenance (${maintCount})` }
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shrink-0 ${filter === f.key ? 'bg-black text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-2xl border border-gray-100">No rooms match the current filter.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((room) => {
            const { label, stay } = getRoomStatus(room);
            const isDirty = label === 'Available' && room.housekeepingStatus === 'Dirty';
            const isCleaning = label === 'Available' && room.housekeepingStatus === 'Cleaning';
            
            // Dynamic Header border
            const cardBorder = label === 'Occupied' 
              ? 'border-red-200 hover:border-red-400 shadow-xs' 
              : label === 'Maintenance' 
              ? 'border-yellow-200' 
              : isDirty 
              ? 'border-amber-300 shadow-xs' 
              : isCleaning 
              ? 'border-blue-300' 
              : 'border-emerald-200 hover:border-emerald-400 shadow-xs';

            const topBarColor = label === 'Occupied' 
              ? 'bg-red-500' 
              : label === 'Maintenance' 
              ? 'bg-yellow-400' 
              : isDirty 
              ? 'bg-amber-400' 
              : isCleaning 
              ? 'bg-blue-400' 
              : 'bg-emerald-500';

            const headerBg = label === 'Occupied' 
              ? 'bg-red-50/50' 
              : label === 'Maintenance' 
              ? 'bg-yellow-50/50' 
              : isDirty 
              ? 'bg-amber-50/50' 
              : isCleaning 
              ? 'bg-blue-50/50' 
              : 'bg-emerald-50/50';

            const balance = stay ? stay.totalAmount - stay.paidAmount : 0;
            const isOverdue = stay && isPast(new Date(stay.expectedCheckOutDate));

            return (
              <div key={room._id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md ${cardBorder}`}>
                {/* Top Color Bar */}
                <div className={`h-1.5 w-full ${topBarColor}`} />
                
                <div className={`px-4 py-3 ${headerBg} border-b border-gray-100`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${label === 'Occupied' ? 'bg-red-500 animate-pulse' : label === 'Maintenance' ? 'bg-yellow-500' : isDirty ? 'bg-amber-500' : isCleaning ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'} flex-shrink-0`} />
                        <h3 className="font-black text-gray-900 text-lg leading-none">Room {room.roomNumber}</h3>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Floor {room.floor || '-'} • Cap {room.capacity}</p>
                    </div>

                    {label === 'Occupied' ? (
                      <span className="text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-md uppercase">Occupied</span>
                    ) : label === 'Maintenance' ? (
                      <Wrench size={18} className="text-yellow-600" />
                    ) : isDirty ? (
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md uppercase">Dirty</span>
                    ) : isCleaning ? (
                      <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md uppercase">Cleaning</span>
                    ) : (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    )}
                  </div>
                </div>

                <div className="p-3.5 space-y-2.5">
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
                      <Link to={`/checkouts?stay=${stay._id}`} className="block mt-1 text-center text-[10px] font-black uppercase tracking-widest py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-xs">
                        Manage →
                      </Link>
                    </>
                  ) : label === 'Available' ? (
                    <div className="space-y-2">
                      {/* Housekeeping Pill */}
                      {isDirty ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-amber-900">
                            🧹 Needs Cleaning
                          </p>
                          <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Guest checked out</p>
                        </div>
                      ) : isCleaning ? (
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-2.5 text-center">
                          <p className="text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-blue-800 animate-pulse">
                            ⏳ Cleaning in Progress...
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-2 text-center">
                          <p className="text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 text-emerald-700">
                            <Sparkles size={12} /> Clean & Ready
                          </p>
                          {room.lastCleanedAt && (
                            <p className="text-[9px] text-emerald-600 font-bold mt-0.5">
                              Cleaned: {format(new Date(room.lastCleanedAt), 'dd MMM, hh:mm a')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tariffs */}
                      <div className="space-y-1 text-[10px] text-gray-500 pt-1 border-t border-gray-100">
                        <div className="flex justify-between"><span>12h Rate</span><span className="font-black text-gray-800">₹{room.price12h || '—'}</span></div>
                        <div className="flex justify-between"><span>24h Rate</span><span className="font-black text-gray-800">₹{room.price24h || '—'}</span></div>
                      </div>

                      {/* Actions based on Housekeeping Status */}
                      {isDirty ? (
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleHousekeeping(room, 'Clean')}
                            className="w-full text-center text-[10px] font-black uppercase tracking-widest py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Sparkles size={12} /> Mark Cleaned
                          </button>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleHousekeeping(room, 'Cleaning')}
                              className="text-[9px] font-bold py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
                            >
                              ⏳ In Progress
                            </button>
                            <Link
                              to="/checkin"
                              className="text-[9px] font-bold py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-center rounded-lg transition-colors"
                            >
                              + Check-In
                            </Link>
                          </div>
                        </div>
                      ) : isCleaning ? (
                        <div className="space-y-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleHousekeeping(room, 'Clean')}
                            className="w-full text-center text-[10px] font-black uppercase tracking-widest py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Sparkles size={12} /> Finish Cleaning (Clean)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          <Link to="/checkin" className="block text-center text-[10px] font-black uppercase tracking-widest py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95 shadow-sm">
                            + Check In
                          </Link>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleHousekeeping(room, 'Dirty')}
                              className="text-[9px] font-bold py-1.5 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                              title="Mark room as Dirty if inspection finds it needs cleaning"
                            >
                              🧹 Mark Dirty
                            </button>
                            <button
                              type="button"
                              onClick={() => openMaintenance(room, 'start')}
                              className="text-[9px] font-bold py-1.5 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors flex items-center justify-center gap-1"
                            >
                              <Wrench size={10} /> Maintenance
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-black text-yellow-700 text-center">Under Maintenance</p>
                      {room.maintenanceReason && (
                        <p className="text-[11px] font-bold text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg px-2 py-1.5 leading-snug">{room.maintenanceReason}</p>
                      )}
                      {room.maintenanceSince && (
                        <p className="text-[10px] font-bold text-gray-400 text-center">Since {format(new Date(room.maintenanceSince), 'dd MMM, hh:mm a')}</p>
                      )}
                      <button onClick={() => openMaintenance(room, 'end')} className="w-full text-[10px] font-black uppercase tracking-widest py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-all active:scale-95 shadow-xs">
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
      {mDialog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setMDialog(null)}>
          <form onSubmit={submitMaintenance} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 space-y-4 max-h-[92vh] flex flex-col overflow-y-auto">
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
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button type="button" onClick={() => setMDialog(null)} className="w-full sm:flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button disabled={mBusy} className="w-full sm:flex-1 py-3 bg-black text-white rounded-xl font-bold disabled:opacity-50 text-sm shadow-md active:scale-95">
                {mBusy ? 'Saving...' : mDialog.mode === 'start' ? 'Block Room' : 'Mark Repaired'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default RoomsView;
