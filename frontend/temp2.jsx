import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CheckoutModal from './CheckoutModal';
import { format, isPast, isToday } from 'date-fns';
import { Users, Clock, Download, AlertTriangle, Search, ChevronRight } from 'lucide-react';

const CheckoutList = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStay, setSelectedStay] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'overdue', 'today', 'active'
  const [search, setSearch] = useState('');

  useEffect(() => { fetchStays(); }, []);

  const fetchStays = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5001/api/stays?status=Active');
      setStays(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStayBadge = (stay) => {
    const checkoutDate = new Date(stay.expectedCheckOutDate);
    const balance = stay.totalAmount - stay.paidAmount;
    if (isPast(checkoutDate) && !isToday(checkoutDate)) return { label: 'Overdue', color: 'bg-red-100 text-red-800 border-red-200' };
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
    if (filter === 'overdue') return isPast(checkoutDate) && !isToday(checkoutDate);
    if (filter === 'today') return isToday(checkoutDate);
    return true;
  });

  const overdueCt = stays.filter(s => isPast(new Date(s.expectedCheckOutDate)) && !isToday(new Date(s.expectedCheckOutDate))).length;
  const todayCt = stays.filter(s => isToday(new Date(s.expectedCheckOutDate))).length;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Active Stays</h1>
          <p className="text-gray-500 text-sm mt-1">{stays.length} guests currently staying</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadCSV} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 flex items-center gap-2"><Download size={16} /> Export</button>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guest, mobile, room..."
            className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-64"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
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
                  onClick={() => setSelectedStay(stay)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                        {stay.guest?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 text-sm">{stay.guest?.fullName}</p>
                          {stay.occupants > 1 && (
                            <span className="flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              <Users size={11} /> {stay.occupants}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {stay.guest?.mobileNumber} &bull; Room {stay.room?.roomNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <Clock size={12} className="mr-1" />
                          Checkout: {format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          Total: ₹{stay.totalAmount}
                          {balance > 0 && <span className="text-red-600 ml-2">(-₹{balance} due)</span>}
                          {balance <= 0 && <span className="text-green-600 ml-2">✓ Paid</span>}
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${badge.color}`}>
                        {badge.label}
                      </span>
                      <ChevronRight size={18} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
