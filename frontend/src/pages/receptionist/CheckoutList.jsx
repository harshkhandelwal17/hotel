import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import CheckoutModal from './CheckoutModal';
import StayManageModal from './StayManageModal';
import { format, isPast, isToday } from 'date-fns';
import { Users, Clock, Download, AlertTriangle, Search, ChevronRight } from 'lucide-react';

const CheckoutList = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStay, setSelectedStay] = useState(null);
  const [managedStay, setManagedStay] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'overdue', 'today', 'active'
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  useEffect(() => { fetchStays(); }, [globalProperty]);
  useEffect(() => {
    const handlePropChange = () => fetchStays();
    window.addEventListener('propertyChanged', handlePropChange);
    return () => window.removeEventListener('propertyChanged', handlePropChange);
  }, [globalProperty]);

  async function fetchStays() {
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays?status=Active${propQuery}`);
      setStays(res.data.data);

      // Deep link from Dashboard / Rooms: /checkouts?stay=<id>
      const wanted = searchParams.get('stay');
      if (wanted) {
        const found = res.data.data.find(s => s._id === wanted);
        if (found) setManagedStay(found);
        setSearchParams({}, { replace: true });
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };


  const downloadCSV = () => {
    const headers = ['Guest Name', 'Mobile', 'Co-Guests', 'Room', 'Check-in', 'Expected Check-out', 'Total Bill', 'Paid', 'Balance', 'Status'];
    const csvData = stays.map(stay => {
      const coGuestsStr = stay.coGuests?.map(g => g.fullName).join(', ') || 'None';
      const checkIn = format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a');
      const checkOut = format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy, hh:mm a');
      const balance = stay.totalAmount - stay.paidAmount;
      return `"${stay.guest?.fullName}","${stay.guest?.mobileNumber}","${coGuestsStr}","${stay.room?.roomNumber}","${checkIn}","${checkOut}",${stay.totalAmount},${stay.paidAmount},${balance},"${stay.status}"`;
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `hotel_guests_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStayBadge = (stay) => {
    const checkoutDate = new Date(stay.expectedCheckOutDate);
    const balance = stay.totalAmount - stay.paidAmount;
    if (isPast(checkoutDate)) return { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' };
    if (isToday(checkoutDate)) return { label: 'Due Today', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    if (balance > 0) return { label: 'Pending ₹' + balance, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'Active', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const filteredStays = stays.filter(stay => {
    const checkoutDate = new Date(stay.expectedCheckOutDate);
    const matchesSearch = !search ||
      stay.guest?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      stay.guest?.mobileNumber?.includes(search) ||
      stay.room?.roomNumber?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'overdue') return isPast(checkoutDate);
    if (filter === 'today') return isToday(checkoutDate) && !isPast(checkoutDate);
    return true;
  });

  const overdueCt = stays.filter(s => isPast(new Date(s.expectedCheckOutDate))).length;
  const todayCt = stays.filter(s => isToday(new Date(s.expectedCheckOutDate)) && !isPast(new Date(s.expectedCheckOutDate))).length;

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-gray-200 rounded-xl" />
      <div className="h-14 w-full bg-gray-200 rounded-2xl" />
      <div className="flex gap-2"><div className="h-8 w-24 bg-gray-200 rounded-xl" /><div className="h-8 w-24 bg-gray-200 rounded-xl" /></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">In-House Guests</h1>
            <p className="text-gray-500 font-medium mt-1">Tap a guest to add charges, take payment, change room, extend stay or check out.</p>
          </div>
          <button onClick={downloadCSV} className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2 shadow-sm"><Download size={16} /> Export CSV</button>
        </div>

        {/* Massive Search Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={24} className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Room No. (e.g. 101) or Guest Name..."
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-lg font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: `All (${stays.length})` },
          { key: 'overdue', label: `Overdue (${overdueCt})`, warn: overdueCt > 0 },
          { key: 'today', label: `Checkout Today (${todayCt})`, warn: todayCt > 0 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.key
                ? 'bg-black text-white shadow-md'
                : tab.warn
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.warn && filter !== tab.key && <AlertTriangle size={13} className="inline mr-1" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredStays.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mb-3">
              <Users size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No stays found</h3>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredStays.map(stay => {
              const badge = getStayBadge(stay);
              const balance = stay.totalAmount - stay.paidAmount;
              return (
                <div
                  key={stay._id}
                  className="p-5 hover:bg-gray-50/60 transition-colors cursor-pointer"
                  onClick={() => setManagedStay(stay)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0 shadow-inner">
                        {stay.guest?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-base">{stay.guest?.fullName}</p>
                          {stay.occupants > 1 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                              <Users size={11} /> {stay.occupants}
                            </span>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-1">
                          {stay.guest?.mobileNumber} &bull; <span className="text-indigo-600 font-bold">Room {stay.room?.roomNumber}</span>
                        </p>
                        
                        {/* Mobile Details */}
                        <div className="mt-2 block sm:hidden">
                           <div className="text-xs font-bold text-gray-700">Total: ₹{stay.totalAmount} {balance > 0 ? <span className="text-red-500 ml-1">(-₹{balance} due)</span> : <span className="text-green-600 ml-1">✓ Paid</span>}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                          <Clock size={12} className="mr-1" />
                          Checkout At
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                        </div>
                      </div>
                      
                      <div className="hidden sm:block text-right ml-6">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billing</div>
                        <div className="text-sm font-bold text-gray-900">
                          Total: ₹{stay.totalAmount}
                          {balance > 0 && <span className="text-red-600 ml-1">(-₹{balance})</span>}
                          {balance <= 0 && <span className="text-green-600 ml-1">✓ Paid</span>}
                        </div>
                      </div>
                      
                      <ChevronRight size={20} className="text-gray-300 ml-4 hidden sm:block" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {managedStay && (
        <StayManageModal
          stay={managedStay}
          onClose={() => { setManagedStay(null); fetchStays(); }}
          onChanged={fetchStays}
          onCheckout={(freshStay) => { setManagedStay(null); setSelectedStay(freshStay); }}
        />
      )}

      {selectedStay && (
        <CheckoutModal
          stay={selectedStay}
          onClose={() => setSelectedStay(null)}
          onSuccess={() => { setSelectedStay(null); fetchStays(); }}
        />
      )}
    </div>
  );
};

export default CheckoutList;
