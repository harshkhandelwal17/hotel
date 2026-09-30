import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Search, Download, TrendingUp, PieChart, Users, Receipt } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const Reports = () => {
  const [stays, setStays] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (globalProperty) setHostelFilter(globalProperty);
  }, [globalProperty]);

  async function fetchData() {
    try {
      setLoading(true);
      const [staysRes, hostelsRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
      ]);
      setStays(staysRes.data.data);
      setHostels(hostelsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Stays
  const filteredStays = useMemo(() => {
    return stays.filter(stay => {
      // 1. Property Filter
      if (hostelFilter !== 'all' && stay.hostel?._id !== hostelFilter && stay.hostel !== hostelFilter) {
        return false;
      }
      
      // 2. Search Filter
      const searchStr = searchQuery.toLowerCase();
      if (searchStr && !stay.guest?.fullName?.toLowerCase().includes(searchStr) && 
          !stay.room?.roomNumber?.toLowerCase().includes(searchStr) &&
          !stay.commissionTo?.toLowerCase().includes(searchStr)) {
        return false;
      }

      // 3. Date Filter (Based on check-in date)
      if (dateFilter !== 'all') {
        const date = new Date(stay.checkInDate);
        if (dateFilter === 'today' && !isToday(date)) return false;
        if (dateFilter === 'yesterday' && !isYesterday(date)) return false;
        if (dateFilter === 'week' && !isThisWeek(date)) return false;
        if (dateFilter === 'month' && !isThisMonth(date)) return false;
        if (dateFilter === 'custom' && customStart && customEnd) {
           const start = startOfDay(parseISO(customStart));
           const end = endOfDay(parseISO(customEnd));
           if (!isWithinInterval(date, { start, end })) return false;
        }
      }
      
      return true;
    }).sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
  }, [stays, hostelFilter, searchQuery, dateFilter, customStart, customEnd]);

  // Calculate Financial Stats
  const stats = useMemo(() => {
    let grossBooking = 0;
    let totalDiscount = 0;
    let totalCommission = 0;
    let netProfit = 0;
    let cashCollected = 0;
    
    filteredStays.forEach(stay => {
      grossBooking += (stay.totalAmount || 0);
      totalDiscount += (stay.discountAmount || 0);
      totalCommission += (stay.commissionAmount || 0);
      netProfit += ((stay.totalAmount || 0) - (stay.commissionAmount || 0));
      cashCollected += (stay.paidAmount || 0);
    });
    
    return { grossBooking, totalDiscount, totalCommission, netProfit, cashCollected };
  }, [filteredStays]);

  const downloadCSV = () => {
    const headers = ['Check-In Date', 'Guest Name', 'Room No', 'Booking Amount', 'Discount', 'Broker Name', 'Commission Paid', 'Net Profit', 'Total Collected', 'Status'];
    const csvData = filteredStays.map(stay => {
      const net = (stay.totalAmount || 0) - (stay.commissionAmount || 0);
      return `"${format(new Date(stay.checkInDate), 'dd MMM yyyy')}","${stay.guest?.fullName || 'N/A'}","${stay.room?.roomNumber || 'N/A'}",${stay.totalAmount || 0},${stay.discountAmount || 0},"${stay.commissionTo || ''}",${stay.commissionAmount || 0},${net},${stay.paidAmount || 0},"${stay.status}"`;
    });
    const csvContent = [headers.join(','), ...csvData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Financial & Profit Analytics</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Track Bookings, Commissions, and real Net Profits.</p>
        </div>
        <button onClick={downloadCSV} className="px-6 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2 active:scale-95">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gross Bookings</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div>
            <h2 className="text-2xl font-black text-gray-900">₹{stats.grossBooking.toLocaleString()}</h2>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Discounts Given</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-lg"><TrendingUp size={20} className="rotate-180" /></div>
            <h2 className="text-2xl font-black text-gray-900">₹{stats.totalDiscount.toLocaleString()}</h2>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Commission (Broker)</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><Users size={20} /></div>
            <h2 className="text-2xl font-black text-gray-900">₹{stats.totalCommission.toLocaleString()}</h2>
          </div>
        </div>

        <div className="bg-gray-900 p-5 rounded-2xl border border-black shadow-lg transform hover:scale-[1.02] transition-transform">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Net Profit</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-2.5 bg-white/10 text-green-400 rounded-lg"><PieChart size={20} /></div>
            <h2 className="text-2xl font-black text-white">₹{stats.netProfit.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
          <input type="text" placeholder="Search Guest, Room or Broker..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" />
        </div>
        
        <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="custom">Custom Date</option>
        </select>

        {globalProperty === 'all' && (
          <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Properties</option>
            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        )}
      </div>
      
      {dateFilter === 'custom' && (
        <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" />
          <span className="self-center font-bold text-gray-400">TO</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" />
        </div>
      )}

      {/* Financial Data Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Date & Room</th>
                <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Guest Details</th>
                <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Gross Booked</th>
                <th className="px-6 py-4 font-black text-xs text-red-400 uppercase tracking-widest text-right">Discount</th>
                <th className="px-6 py-4 font-black text-xs text-orange-400 uppercase tracking-widest text-right">Commission</th>
                <th className="px-6 py-4 font-black text-xs text-green-600 uppercase tracking-widest text-right">Net Profit</th>
                <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStays.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No bookings found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStays.map(stay => {
                  const net = (stay.totalAmount || 0) - (stay.commissionAmount || 0);
                  return (
                    <tr key={stay._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{format(new Date(stay.checkInDate), 'dd MMM yyyy')}</p>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">Room {stay.room?.roomNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{stay.guest?.fullName}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-0.5">{stay.guest?.mobileNumber}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-gray-900">₹{stay.totalAmount}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {stay.discountAmount > 0 ? (
                          <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">-₹{stay.discountAmount}</span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {stay.commissionAmount > 0 ? (
                          <div>
                            <p className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded inline-block">-₹{stay.commissionAmount}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">To: {stay.commissionTo}</p>
                          </div>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-black text-green-600 bg-green-50 px-3 py-1 rounded inline-block">₹{net}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${stay.status === 'Checked Out' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>
                          {stay.status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
