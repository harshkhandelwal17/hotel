import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Clock, CheckCircle2, Wrench, BedDouble, RefreshCw, Search } from 'lucide-react';
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
    const matchFilter = filter === 'all' || status.label.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const availCount = rooms.filter(r => getRoomStatus(r).label === 'Available').length;
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
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Room Status</h1>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600"><span className="w-2 h-2 rounded-full bg-green-500" />{availCount} Available</span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-red-600"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{occupCount} Occupied</span>
            {maintCount > 0 && <span className="flex items-center gap-1.5 text-sm font-bold text-yellow-600"><span className="w-2 h-2 rounded-full bg-yellow-500" />{maintCount} Maintenance</span>}
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 text-gray-500 hover:text-black bg-white border border-gray-200 rounded-xl hover:border-gray-400 transition-all self-start sm:self-auto">
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
            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-900 focus:border-black focus:ring-0 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'available', 'occupied', 'maintenance'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-black text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Room Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 font-bold">No rooms found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map((room) => {
            const { label, stay } = getRoomStatus(room);
            const cfg = statusConfig[label];
            const balance = stay ? stay.totalAmount - stay.paidAmount : 0;
            const isOverdue = stay && isPast(new Date(stay.expectedCheckOutDate));
            return (
              <div key={room._id} className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all hover:shadow-md ${cfg.card}`}>
                {/* Top Color Bar */}
                <div className={`h-1.5 w-full ${label === 'Available' ? 'bg-green-400' : label === 'Occupied' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                
                <div className={`px-4 py-3 ${cfg.header} border-b border-gray-100`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                        <h3 className="font-black text-gray-900 text-lg leading-none">Room {room.roomNumber}</h3>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Floor {room.floor || '-'} • Cap {room.capacity}</p>
                    </div>
                    {label === 'Available' ? <CheckCircle2 size={18} className="text-green-500" /> :
                     label === 'Occupied' ? <Users size={18} className="text-red-500" /> :
                     <Wrench size={18} className="text-yellow-500" />}
                  </div>
                </div>

                <div className="p-3 space-y-2">
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
                      <p className="text-xs font-bold text-gray-400 text-center mt-1">Ready for guest</p>
                      <div className="space-y-1.5 text-[10px] text-gray-500">
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
      {mDialog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setMDialog(null)}>
          <form onSubmit={submitMaintenance} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
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
            <div className="flex gap-3">
              <button type="button" onClick={() => setMDialog(null)} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50">Cancel</button>
              <button disabled={mBusy} className="flex-1 py-3 bg-black text-white rounded-xl font-bold disabled:opacity-50">
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
