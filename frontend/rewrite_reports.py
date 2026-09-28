import sys

new_reports = """import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { Search, Filter, Download, ArrowUpDown, TrendingUp, IndianRupee, CreditCard, Building } from 'lucide-react';

const Reports = () => {
  const [payments, setPayments] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('all'); // today, yesterday, week, month, all
  const [hostelFilter, setHostelFilter] = useState('all');
  const [roomFilter, setRoomFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'paymentDate', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, hostelsRes] = await Promise.all([
        axios.get('http://127.0.0.1:5001/api/payments'),
        axios.get('http://127.0.0.1:5001/api/hostels')
      ]);
      setPayments(paymentsRes.data.data);
      setHostels(hostelsRes.data.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedPayments = useMemo(() => {
    let filtered = payments.filter(p => {
      const pDate = new Date(p.paymentDate);
      
      // Date Filter
      if (dateFilter === 'today' && !isToday(pDate)) return false;
      if (dateFilter === 'yesterday' && !isYesterday(pDate)) return false;
      if (dateFilter === 'week' && !isThisWeek(pDate)) return false;
      if (dateFilter === 'month' && !isThisMonth(pDate)) return false;
      
      // Property Filter
      if (hostelFilter !== 'all' && p.hostel?._id !== hostelFilter) return false;
      
      // Room Filter
      if (roomFilter && p.stay?.room?.roomNumber) {
        if (!p.stay.room.roomNumber.toLowerCase().includes(roomFilter.toLowerCase())) return false;
      }
      
      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const guestName = p.guest?.fullName?.toLowerCase() || '';
        const guestMobile = p.guest?.mobileNumber || '';
        if (!guestName.includes(q) && !guestMobile.includes(q)) return false;
      }
      
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'paymentDate':
          aVal = new Date(a.paymentDate).getTime();
          bVal = new Date(b.paymentDate).getTime();
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'guest':
          aVal = a.guest?.fullName || '';
          bVal = b.guest?.fullName || '';
          break;
        case 'property':
          aVal = a.hostel?.name || '';
          bVal = b.hostel?.name || '';
          break;
        case 'room':
          aVal = a.stay?.room?.roomNumber || '';
          bVal = b.stay?.room?.roomNumber || '';
          break;
        default:
          aVal = 0; bVal = 0;
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [payments, dateFilter, hostelFilter, roomFilter, searchQuery, sortConfig]);

  const stats = useMemo(() => {
    return filteredAndSortedPayments.reduce((acc, curr) => {
      acc.total += curr.amount;
      if (curr.paymentMethod.toLowerCase() === 'cash') acc.cash += curr.amount;
      else acc.online += curr.amount;
      return acc;
    }, { total: 0, cash: 0, online: 0 });
  }, [filteredAndSortedPayments]);

  const downloadCSV = () => {
    const headers = ['Date', 'Receipt No', 'Guest', 'Mobile', 'Property', 'Room', 'Amount', 'Payment Method'];
    const csvData = filteredAndSortedPayments.map(p => {
      return `"${format(new Date(p.paymentDate), 'dd MMM yyyy HH:mm')}","${p.receiptNumber}","${p.guest?.fullName}","${p.guest?.mobileNumber}","${p.hostel?.name}","${p.stay?.room?.roomNumber || 'N/A'}",${p.amount},"${p.paymentMethod}"`;
    });
    
    const csvContent = [headers.join(','), ...csvData].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `financial_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Advanced collection tracking & revenue analytics</p>
        </div>
        <button onClick={downloadCSV} className="px-5 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2">
          <Download size={16} /> Export to Excel
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">₹{stats.total.toLocaleString()}</h2>
            </div>
            <div className="bg-green-100 p-3 rounded-xl text-green-700"><TrendingUp size={24} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cash Collection</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">₹{stats.cash.toLocaleString()}</h2>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl text-blue-700"><IndianRupee size={24} /></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Online / UPI / Card</p>
              <h2 className="text-3xl font-black text-gray-900 mt-2">₹{stats.online.toLocaleString()}</h2>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl text-purple-700"><CreditCard size={24} /></div>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
          <input type="text" placeholder="Search Guest Name/Phone" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
        </div>
        
        <div>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>

        <div>
          <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Properties</option>
            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        </div>

        <div className="relative">
          <input type="text" placeholder="Filter by Room No." value={roomFilter} onChange={e => setRoomFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none" />
        </div>
        
        <div className="flex items-center justify-end px-2 text-sm text-gray-500 font-medium">
          {filteredAndSortedPayments.length} Records found
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['paymentDate', 'guest', 'property', 'room', 'amount', 'paymentMethod'].map((key) => (
                  <th key={key} onClick={() => handleSort(key)} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none">
                    <div className="flex items-center gap-1">
                      {key === 'paymentDate' ? 'Date & Time' : key === 'guest' ? 'Guest Details' : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      <ArrowUpDown size={12} className={sortConfig.key === key ? 'text-black' : 'text-gray-300'} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredAndSortedPayments.map(p => (
                <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-bold text-gray-900">{format(new Date(p.paymentDate), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-500">{format(new Date(p.paymentDate), 'hh:mm a')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{p.guest?.fullName}</p>
                    <p className="text-xs text-gray-500">{p.guest?.mobileNumber}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <Building size={10} className="mr-1" /> {p.hostel?.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                    {p.stay?.room?.roomNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                    ₹{p.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {p.paymentMethod.toLowerCase() === 'cash' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-100 text-green-800 border border-green-200">CASH</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">ONLINE</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAndSortedPayments.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
"""

with open(sys.argv[1], "w") as f:
    f.write(new_reports)
print("Reports.jsx rewritten")
