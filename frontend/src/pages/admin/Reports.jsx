import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Search, Download, TrendingUp, PieChart, Users, Receipt, ArrowRight, ShieldCheck, Trash, Shirt, BookOpen, Wallet, Share2, Clock, Banknote, CheckCircle, Building, Sparkles } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import PoliceReportModal from './PoliceReportModal';
import ShiftHandoverModal from './ShiftHandoverModal';

const Reports = () => {
  const [stays, setStays] = useState([]);
  const [payments, setPayments] = useState([]);
  const [laundryOrders, setLaundryOrders] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState('bookings'); // bookings, transactions, laundry, khata

  // Khata Summary
  const [khataSummary, setKhataSummary] = useState({
    totalMarketDue: 0,
    totalAdvanceHeld: 0,
    netBalance: 0,
    dueGuestsCount: 0,
    advanceGuestsCount: 0,
    totalCreditAccounts: 0,
    customers: []
  });
  const [khataTypeFilter, setKhataTypeFilter] = useState('all'); // all, due, advance

  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (globalProperty) setHostelFilter(globalProperty);
  }, [globalProperty]);

  async function fetchData() {
    try {
      setLoading(true);
      const [staysRes, hostelsRes, paymentsRes, laundryRes, khataRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/payments'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/laundry').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/guests/khata/summary').catch(() => ({ data: { data: { totalMarketDue: 0, totalAdvanceHeld: 0, netBalance: 0, customers: [] } } }))
      ]);
      setStays(staysRes.data.data);
      setHostels(hostelsRes.data.data);
      setPayments(paymentsRes.data.data);
      setLaundryOrders(laundryRes?.data?.data || []);
      if (khataRes?.data?.data) {
        setKhataSummary(khataRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  // Extract list of all staff / receptionists who handled stays or payments
  const staffList = useMemo(() => {
    const map = new Map();
    payments.forEach(p => {
      const creator = p.createdBy;
      if (creator && typeof creator === 'object' && creator._id) {
        if (!map.has(creator._id)) {
          map.set(creator._id, { id: creator._id, name: creator.name || 'Staff', role: creator.role || 'Receptionist' });
        }
      }
    });
    stays.forEach(s => {
      const creator = s.createdBy;
      if (creator && typeof creator === 'object' && creator._id) {
        if (!map.has(creator._id)) {
          map.set(creator._id, { id: creator._id, name: creator.name || 'Staff', role: creator.role || 'Receptionist' });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [payments, stays]);

  // Shift preset helper
  const applyShiftPreset = (preset) => {
    setDateFilter('custom');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterday = new Date(Date.now() - 86400000);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

    if (preset === 'morning') {
      setCustomStart(todayStr);
      setCustomEnd(todayStr);
      setCustomStartTime('08:00');
      setCustomEndTime('16:00');
    } else if (preset === 'evening') {
      setCustomStart(todayStr);
      setCustomEnd(todayStr);
      setCustomStartTime('16:00');
      setCustomEndTime('23:59');
    } else if (preset === 'night') {
      setCustomStart(yesterdayStr);
      setCustomEnd(todayStr);
      setCustomStartTime('23:00');
      setCustomEndTime('08:00');
    } else if (preset === 'hotel24') {
      setCustomStart(yesterdayStr);
      setCustomEnd(todayStr);
      setCustomStartTime('12:00');
      setCustomEndTime('12:00');
    } else if (preset === 'todayFull') {
      setCustomStart(todayStr);
      setCustomEnd(todayStr);
      setCustomStartTime('00:00');
      setCustomEndTime('23:59');
    } else if (preset === 'clear') {
      setCustomStartTime('');
      setCustomEndTime('');
    }
  };

  // Active Date & Time Range Calculator (Exact to the minute)
  const activeDateTimeRange = useMemo(() => {
    if (dateFilter === 'today') {
      const now = new Date();
      return { start: startOfDay(now), end: endOfDay(now), label: 'Today (Full Day)' };
    }
    if (dateFilter === 'yesterday') {
      const yesterday = new Date(Date.now() - 86400000);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday), label: 'Yesterday (Full Day)' };
    }
    if (dateFilter === 'week') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = startOfDay(new Date(now.setDate(diff)));
      const end = endOfDay(new Date());
      return { start, end, label: 'This Week' };
    }
    if (dateFilter === 'month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = endOfDay(now);
      return { start, end, label: 'This Month' };
    }
    if (dateFilter === 'custom' && customStart) {
      let start;
      if (customStartTime) {
        start = new Date(`${customStart}T${customStartTime}:00`);
      } else {
        start = startOfDay(parseISO(customStart));
      }

      let end;
      const endDateStr = customEnd || customStart;
      if (customEndTime) {
        end = new Date(`${endDateStr}T${customEndTime}:59`);
      } else {
        end = endOfDay(parseISO(endDateStr));
      }

      let label = `${format(start, 'dd MMM yyyy')}`;
      if (customStartTime) label += ` ${format(start, 'hh:mm a')}`;
      label += `  ➔  ${format(end, 'dd MMM yyyy')}`;
      if (customEndTime) label += ` ${format(end, 'hh:mm a')}`;

      return { start, end, label };
    }
    return null;
  }, [dateFilter, customStart, customEnd, customStartTime, customEndTime]);

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

      // 3. Date & Time Filter (Based on check-in date/time)
      if (activeDateTimeRange) {
        const date = new Date(stay.checkInDate);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      // 4. Staff Filter
      if (staffFilter !== 'all') {
        const creatorId = stay.createdBy?._id || (typeof stay.createdBy === 'string' ? stay.createdBy : null);
        if (creatorId !== staffFilter) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
  }, [stays, hostelFilter, searchQuery, activeDateTimeRange, staffFilter]);

  // Filter Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // 1. Property Filter
      if (hostelFilter !== 'all' && payment.hostel?._id !== hostelFilter && payment.hostel !== hostelFilter) {
        return false;
      }
      
      // 2. Search Filter
      const searchStr = searchQuery.toLowerCase();
      if (searchStr && !payment.guest?.fullName?.toLowerCase().includes(searchStr) && 
          !payment.stay?.room?.roomNumber?.toLowerCase().includes(searchStr) &&
          !payment.paymentMethod?.toLowerCase().includes(searchStr)) {
        return false;
      }

      // 3. Payment Method Filter
      if (paymentMethodFilter !== 'all') {
        const method = (payment.paymentMethod || '').toLowerCase();
        if (method !== paymentMethodFilter.toLowerCase()) return false;
      }

      // 4. Date & Time Filter (Based on payment timestamp)
      if (activeDateTimeRange) {
        const date = new Date(payment.paymentDate);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      // 5. Staff / Receptionist Filter
      if (staffFilter !== 'all') {
        const creatorId = payment.createdBy?._id || (typeof payment.createdBy === 'string' ? payment.createdBy : null);
        if (creatorId !== staffFilter) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [payments, hostelFilter, searchQuery, paymentMethodFilter, activeDateTimeRange, staffFilter]);

  // Filter Laundry Orders
  const filteredLaundryOrders = useMemo(() => {
    return laundryOrders.filter(order => {
      // 1. Property Filter
      if (hostelFilter !== 'all' && order.hostel?._id !== hostelFilter && order.hostel !== hostelFilter) {
        return false;
      }
      
      // 2. Search Filter
      const searchStr = searchQuery.toLowerCase();
      if (searchStr && 
          !order.orderNumber?.toLowerCase().includes(searchStr) && 
          !order.vendorName?.toLowerCase().includes(searchStr) &&
          !order.vendorPhone?.toLowerCase().includes(searchStr)) {
        return false;
      }

      // 3. Date & Time Filter (Based on sentDate or createdAt)
      if (activeDateTimeRange) {
        const date = new Date(order.sentDate || order.createdAt);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.sentDate || b.createdAt) - new Date(a.sentDate || a.createdAt));
  }, [laundryOrders, hostelFilter, searchQuery, activeDateTimeRange]);

  // Calculate Financial Stats
  const stats = useMemo(() => {
    let grossBooking = 0;
    let totalCommission = 0;
    
    filteredStays.forEach(stay => {
      grossBooking += (stay.totalAmount || 0);
      totalCommission += (stay.commissionAmount || 0);
    });

    let totalLaundryBilled = 0;
    let totalLaundryExpense = 0;
    let pendingLaundryDue = 0;
    let totalPiecesSent = 0;
    let totalPiecesMissing = 0;

    filteredLaundryOrders.forEach(order => {
      totalLaundryBilled += (order.totalAmount || 0);
      totalLaundryExpense += (order.paidAmount || 0);
      pendingLaundryDue += Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
      totalPiecesSent += (order.totalPiecesSent || 0);
      totalPiecesMissing += (order.totalPiecesMissing || 0);
    });

    // Net Profit = Gross Bookings - Broker Commissions - Laundry Expenses
    const netProfit = grossBooking - totalCommission - totalLaundryExpense;

    let totalCollected = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let walletTotal = 0;
    let khataTotal = 0;
    const staffCollectionMap = {};

    filteredPayments.forEach(p => {
      const amt = Number(p.amount) || 0;
      totalCollected += amt;
      const method = (p.paymentMethod || 'Cash').toLowerCase();
      if (method === 'cash') cashTotal += amt;
      else if (method === 'upi') upiTotal += amt;
      else if (method === 'card' || method === 'bank') cardTotal += amt;
      else if (method === 'wallet' || method === 'advance') walletTotal += amt;
      else if (method === 'khata') khataTotal += amt;
      else cardTotal += amt;

      const sId = p.createdBy?._id || (typeof p.createdBy === 'string' ? p.createdBy : 'reception');
      const sName = p.createdBy?.name || (typeof p.createdBy === 'string' ? 'Staff' : 'Reception Staff');
      const sRole = p.createdBy?.role || 'Staff';

      if (!staffCollectionMap[sId]) {
        staffCollectionMap[sId] = {
          id: sId,
          name: sName,
          role: sRole,
          total: 0,
          cash: 0,
          upi: 0,
          card: 0,
          other: 0,
          count: 0
        };
      }
      staffCollectionMap[sId].total += amt;
      staffCollectionMap[sId].count += 1;
      if (method === 'cash') staffCollectionMap[sId].cash += amt;
      else if (method === 'upi') staffCollectionMap[sId].upi += amt;
      else if (method === 'card' || method === 'bank') staffCollectionMap[sId].card += amt;
      else staffCollectionMap[sId].other += amt;
    });

    const staffBreakdown = Object.values(staffCollectionMap).sort((a, b) => b.total - a.total);
    
    return {
      grossBooking,
      totalCommission,
      totalLaundryExpense,
      totalLaundryBilled,
      pendingLaundryDue,
      totalPiecesSent,
      totalPiecesMissing,
      netProfit,
      totalCollected,
      cashTotal,
      upiTotal,
      cardTotal,
      walletTotal,
      khataTotal,
      staffBreakdown
    };
  }, [filteredStays, filteredPayments, filteredLaundryOrders]);

  const filteredKhataCustomers = useMemo(() => {
    let list = khataSummary.customers || [];
    if (hostelFilter !== 'all') {
      list = list.filter(c => (c.hostel?._id || c.hostel) === hostelFilter);
    }
    if (khataTypeFilter === 'due') {
      list = list.filter(c => c.dueAmount > 0);
    } else if (khataTypeFilter === 'advance') {
      list = list.filter(c => c.advanceAmount > 0);
    }
    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.mobileNumber && c.mobileNumber.toLowerCase().includes(q)) ||
        (c.idProofNumber && c.idProofNumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [khataSummary, hostelFilter, khataTypeFilter, searchQuery]);

  const downloadCSV = () => {
    let csvContent = "";
    if (activeTab === 'bookings') {
      const headers = ['Check-In Date', 'Guest Name', 'Room No', 'Booking Amount', 'Broker Name', 'Commission Paid', 'Laundry Cost Deducted', 'Net Profit', 'Total Collected', 'Status'];
      const csvData = filteredStays.map(stay => {
        const net = (stay.totalAmount || 0) - (stay.commissionAmount || 0);
        return `"${format(new Date(stay.checkInDate), 'dd MMM yyyy')}","${stay.guest?.fullName || 'N/A'}","${stay.room?.roomNumber || 'N/A'}",${stay.totalAmount || 0},"${stay.commissionTo || ''}",${stay.commissionAmount || 0},0,${net},${stay.paidAmount || 0},"${stay.status}"`;
      });
      csvContent = [headers.join(','), ...csvData].join('\n');
    } else if (activeTab === 'transactions') {
      const headers = ['Date', 'Guest Name', 'Room No', 'Amount', 'Method', 'Note', 'Collected By'];
      const csvData = filteredPayments.map(p => {
        return `"${format(new Date(p.paymentDate), 'dd MMM yyyy hh:mm a')}","${p.guest?.fullName || 'N/A'}","${p.stay?.room?.roomNumber || 'N/A'}",${p.amount},"${p.paymentMethod}","${p.note || ''}","${p.createdBy?.name || 'Unknown'}"`;
      });
      csvContent = [headers.join(','), ...csvData].join('\n');
    } else if (activeTab === 'laundry') {
      const headers = ['Order Number', 'Date Sent', 'Vendor Name', 'Vendor Phone', 'Pieces Sent', 'Pieces Received', 'Pieces Missing', 'Total Bill', 'Paid (Expense)', 'Due Amount', 'Payment Status', 'Status'];
      const csvData = filteredLaundryOrders.map(o => {
        const due = Math.max(0, (o.totalAmount || 0) - (o.paidAmount || 0));
        return `"${o.orderNumber || ''}","${format(new Date(o.sentDate || o.createdAt), 'dd MMM yyyy')}","${o.vendorName || ''}","${o.vendorPhone || ''}",${o.totalPiecesSent || 0},${o.totalPiecesReceived || 0},${o.totalPiecesMissing || 0},${o.totalAmount || 0},${o.paidAmount || 0},${due},"${o.paymentStatus || ''}","${o.status || ''}"`;
      });
      csvContent = [headers.join(','), ...csvData].join('\n');
    } else if (activeTab === 'khata') {
      const headers = ['Guest Name', 'Mobile Number', 'ID Proof', 'Account Status', 'Due Amount (Receivable)', 'Advance Amount (Held)', 'Net Balance'];
      const csvData = (khataSummary.customers || []).map(c => {
        return `"${c.fullName || ''}","${c.mobileNumber || ''}","${c.idProofType || ''} ${c.idProofNumber || ''}","${c.status || ''}",${c.dueAmount || 0},${c.advanceAmount || 0},${c.ledgerBalance || 0}`;
      });
      csvContent = [headers.join(','), ...csvData].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${activeTab}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteStay = async (stayId) => {
    if (window.confirm("Are you sure you want to permanently delete this stay and all its payments? This action cannot be undone.")) {
      try {
        await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stayId}`);
        setStays(stays.filter(s => s._id !== stayId));
        setPayments(payments.filter(p => p.stay?._id !== stayId));
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Failed to delete stay');
      }
    }
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
          <p className="text-sm text-gray-500 mt-1 font-medium">Track Bookings, Commissions, and real Cash Flow.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowHandoverModal(true)} 
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
            title="Generate Printable Shift Handover & Cash Drawer Voucher"
          >
            <Banknote size={16} /> Shift Handover Slip
          </button>
          <button 
            onClick={() => setShowPoliceModal(true)} 
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2 active:scale-95"
            title="Generate Official Police Verification Report"
          >
            <ShieldCheck size={16} /> Police Report
          </button>
          <button onClick={downloadCSV} className="flex-1 sm:flex-none justify-center px-5 sm:px-6 py-2.5 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2 active:scale-95">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-full sm:w-fit">
          <button onClick={() => setActiveTab('bookings')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all text-center ${activeTab === 'bookings' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
            Booking Ledger
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all text-center ${activeTab === 'transactions' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
            Cash Flow / Payments
          </button>
          <button onClick={() => setActiveTab('laundry')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${activeTab === 'laundry' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}>
            <Shirt size={15} /> Laundry Expenses
          </button>
          <button onClick={() => setActiveTab('khata')} className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${activeTab === 'khata' ? 'bg-white shadow-sm text-amber-700 font-black' : 'text-gray-500 hover:text-gray-900'}`}>
            <BookOpen size={15} /> Khata & Credit (उधार / जमा)
          </button>
        </div>
        {activeTab === 'laundry' && (
          <Link to="/laundry" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors">
            Open Laundry Module <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      {activeTab === 'bookings' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Gross Bookings</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Receipt size={20} /></div>
              <h2 className="text-2xl font-black text-gray-900">₹{stats.grossBooking.toLocaleString()}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Commission (Broker)</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg"><Users size={20} /></div>
              <h2 className="text-2xl font-black text-gray-900">₹{stats.totalCommission.toLocaleString()}</h2>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Laundry Expenses (Paid)</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg"><Shirt size={20} /></div>
              <div>
                <h2 className="text-2xl font-black text-indigo-700">-₹{stats.totalLaundryExpense.toLocaleString()}</h2>
                {stats.pendingLaundryDue > 0 && (
                  <p className="text-[10px] text-amber-600 font-bold mt-0.5">Due: ₹{stats.pendingLaundryDue.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-5 rounded-2xl border border-black shadow-lg transform hover:scale-[1.02] transition-transform">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Final Net Profit</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-white/10 text-green-400 rounded-lg"><PieChart size={20} /></div>
              <div>
                <h2 className="text-2xl font-black text-white">₹{stats.netProfit.toLocaleString()}</h2>
                <p className="text-[9px] text-gray-400 font-medium">After Commission & Laundry</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'laundry' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Laundry Billed</p>
            <div className="mt-2 text-2xl font-black text-gray-900">₹{stats.totalLaundryBilled.toLocaleString()}</div>
            <p className="text-[10px] text-gray-400 mt-1">From all dispatched batches</p>
          </div>
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-200 shadow-sm transition-colors">
            <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Paid Out (Net Expense)</p>
            <div className="mt-2 text-2xl font-black text-indigo-800">₹{stats.totalLaundryExpense.toLocaleString()}</div>
            <p className="text-[10px] text-indigo-600 mt-1">Deducted from hotel profit</p>
          </div>
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm transition-colors">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Pending Vendor Bills (Due)</p>
            <div className="mt-2 text-2xl font-black text-amber-800">₹{stats.pendingLaundryDue.toLocaleString()}</div>
            <p className="text-[10px] text-amber-600 mt-1">Unpaid to dhobi/vendor</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Linen Sent / Missing</p>
            <div className="mt-2 text-2xl font-black text-gray-900">
              {stats.totalPiecesSent} <span className="text-sm font-bold text-red-500">({stats.totalPiecesMissing} missing)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Pieces sent to laundry</p>
          </div>
        </div>
      ) : activeTab === 'khata' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm transition-colors">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Market Credit Due (उधार बाकी)</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-red-100 text-red-700 rounded-lg"><BookOpen size={20} /></div>
              <div>
                <h2 className="text-2xl font-black text-red-700">₹{khataSummary.totalMarketDue.toLocaleString()}</h2>
                <p className="text-[10px] text-red-500 font-bold mt-0.5">{khataSummary.dueGuestsCount} Guests owe payment</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm transition-colors">
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Advance Deposits Held (जमा राशि)</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg"><Wallet size={20} /></div>
              <div>
                <h2 className="text-2xl font-black text-emerald-700">₹{khataSummary.totalAdvanceHeld.toLocaleString()}</h2>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{khataSummary.advanceGuestsCount} Guests with advance</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Khata Position</p>
            <div className="mt-2 text-2xl font-black text-gray-900">
              <span className={khataSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                {khataSummary.netBalance >= 0 ? `+₹${khataSummary.netBalance.toLocaleString()}` : `-₹${Math.abs(khataSummary.netBalance).toLocaleString()}`}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Advance held minus market credit</p>
          </div>

          <div className="bg-gray-900 p-5 rounded-2xl border border-black shadow-lg">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Khata Customers</p>
            <div className="mt-2 text-2xl font-black text-white">
              {khataSummary.totalCreditAccounts} Active Accounts
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Regular customer accounts</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Cash</p>
            <div className="mt-2 text-xl font-black text-gray-900">₹{stats.cashTotal.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">UPI</p>
            <div className="mt-2 text-xl font-black text-gray-900">₹{stats.upiTotal.toLocaleString()}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-black transition-colors">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Card/Other</p>
            <div className="mt-2 text-xl font-black text-gray-900">₹{stats.cardTotal.toLocaleString()}</div>
          </div>
          <div className="bg-green-600 p-5 rounded-2xl border border-green-700 shadow-lg transform hover:scale-[1.02] transition-transform">
            <p className="text-[10px] font-black text-green-200 uppercase tracking-widest">Total Collected</p>
            <div className="mt-2 text-xl font-black text-white">₹{stats.totalCollected.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
          <input type="text" placeholder={activeTab === 'laundry' ? "Search Vendor, Order #..." : activeTab === 'khata' ? "Search Customer Name, Mobile, ID..." : "Search Guest, Room..."} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" />
        </div>
        
        {activeTab !== 'khata' && (
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date</option>
          </select>
        )}

        {activeTab === 'khata' && (
          <select value={khataTypeFilter} onChange={e => setKhataTypeFilter(e.target.value)} className="w-full md:w-56 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Khata Accounts</option>
            <option value="due">Only Market Due (उधार बाकी)</option>
            <option value="advance">Only Advance Held (जमा राशि)</option>
          </select>
        )}

        {activeTab === 'transactions' && (
          <select value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Methods</option>
            <option value="Cash">Cash (कैश)</option>
            <option value="UPI">UPI (GooglePay/PhonePe/Paytm)</option>
            <option value="Card">Card / POS Machine</option>
            <option value="Wallet">Wallet / Advance Credit</option>
            <option value="Khata">Khata (उधार)</option>
            <option value="Bank">Bank Transfer / NEFT</option>
          </select>
        )}

        {(activeTab === 'bookings' || activeTab === 'transactions') && (
          <select
            value={staffFilter}
            onChange={e => setStaffFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none"
          >
            <option value="all">All Staff / Receptionists</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        )}

        {globalProperty === 'all' && (
          <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Properties</option>
            {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>
        )}
      </div>
      
      {/* Custom Date & Time Filter Panel with Hotel Shift Presets */}
      {dateFilter === 'custom' && (
        <div className="p-5 bg-gradient-to-br from-gray-50 to-amber-50/30 rounded-3xl border border-gray-200 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2">
          {/* Quick Shift Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 mr-1 flex items-center gap-1">
              <Clock size={13} className="text-amber-600" /> Hotel Shift Presets:
            </span>
            <button
              type="button"
              onClick={() => applyShiftPreset('morning')}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-gray-800 border border-gray-200 hover:border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              ☀️ Morning (08:00 AM – 04:00 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('evening')}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-gray-800 border border-gray-200 hover:border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              🌆 Evening (04:00 PM – 11:59 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('night')}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-gray-800 border border-gray-200 hover:border-amber-300 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              🌙 Night Shift (11:00 PM – 08:00 AM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('hotel24')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              🏨 Hotel 24h (12:00 PM – 12:00 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('todayFull')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              ⏰ Today Full Day (00:00 – 23:59)
            </button>
            {(customStartTime || customEndTime) && (
              <button
                type="button"
                onClick={() => applyShiftPreset('clear')}
                className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors ml-auto"
              >
                Reset Times
              </button>
            )}
          </div>

          {/* Exact Date & Time Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Start Date & Time */}
            <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Start Date & Time (से)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
                <input
                  type="time"
                  value={customStartTime}
                  onChange={e => setCustomStartTime(e.target.value)}
                  placeholder="00:00"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
            </div>

            {/* End Date & Time */}
            <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> End Date & Time (तक)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
                <input
                  type="time"
                  value={customEndTime}
                  onChange={e => setCustomEndTime(e.target.value)}
                  placeholder="23:59"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Active Range Preview Label */}
          {activeDateTimeRange?.label && (
            <div className="flex items-center justify-between text-xs bg-white px-4 py-2 rounded-xl border border-gray-200 font-bold text-gray-700">
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-500" /> Active Range: <span className="text-gray-900 font-black">{activeDateTimeRange.label}</span>
              </span>
              <span className="text-[10px] text-gray-400 font-medium">Exact minute precision</span>
            </div>
          )}
        </div>
      )}

      {/* Cash Flow Drawer & Shift Handover Summary (Transactions Tab) */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 mb-2">
          {/* Drawer Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-gray-900 p-4 rounded-2xl shadow-sm text-white">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Collected</p>
              <p className="text-2xl font-black text-white mt-1">₹{stats.totalCollected.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-400 mt-1 font-medium">{filteredPayments.length} Payments recorded</p>
            </div>

            <div className="bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-200">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Cash In Hand (Drawer)</p>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{stats.cashTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600 mt-1 font-bold">Physical cash to handover</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl shadow-sm border border-purple-200">
              <p className="text-[10px] font-black text-purple-800 uppercase tracking-widest">UPI Direct (Bank)</p>
              <p className="text-2xl font-black text-purple-700 mt-1">₹{stats.upiTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-purple-600 mt-1 font-medium">GPay / PhonePe / QR</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl shadow-sm border border-blue-200">
              <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Card / POS</p>
              <p className="text-2xl font-black text-blue-700 mt-1">₹{stats.cardTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-blue-600 mt-1 font-medium">Credit/Debit machine</p>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl shadow-sm border border-amber-200">
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Wallet / Khata</p>
              <p className="text-2xl font-black text-amber-700 mt-1">₹{(stats.walletTotal + stats.khataTotal).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-amber-600 mt-1 font-medium">Pre-deposit / Ledger</p>
            </div>
          </div>

          {/* Staff-wise Collection Breakdown & Shift Verification Banner */}
          {stats.staffBreakdown && stats.staffBreakdown.length > 0 && (
            <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide flex items-center gap-2">
                    <Users size={16} className="text-amber-600" /> Staff-Wise Collection & Shift Handover Tally
                  </h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    Breakdown of physical cash and digital collections per receptionist in this time window
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(true)}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <Banknote size={14} className="text-amber-400" /> Print Shift Handover Voucher
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                {stats.staffBreakdown.map((staff, idx) => (
                  <div key={staff.id || idx} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200/80 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-black text-white font-black text-xs flex items-center justify-center">
                          {staff.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-tight">{staff.name}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{staff.role}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-gray-900">₹{staff.total.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-gray-200/60 text-center">
                      <div className="bg-emerald-100/60 p-1.5 rounded-lg">
                        <p className="text-[9px] font-black text-emerald-800 uppercase">Cash</p>
                        <p className="text-xs font-black text-emerald-900 mt-0.5">₹{staff.cash.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-purple-100/60 p-1.5 rounded-lg">
                        <p className="text-[9px] font-black text-purple-800 uppercase">UPI</p>
                        <p className="text-xs font-black text-purple-900 mt-0.5">₹{staff.upi.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-blue-100/60 p-1.5 rounded-lg">
                        <p className="text-[9px] font-black text-blue-800 uppercase">Card/Other</p>
                        <p className="text-xs font-black text-blue-900 mt-0.5">₹{(staff.card + staff.other).toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'bookings' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Date & Room</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Guest Details</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Gross Booked</th>
                  <th className="px-6 py-4 font-black text-xs text-orange-400 uppercase tracking-widest text-right">Commission</th>
                  <th className="px-6 py-4 font-black text-xs text-green-600 uppercase tracking-widest text-right">Net Profit</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStays.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-indigo-600">Room {stay.room?.roomNumber}</span>
                            {stay.createdBy?.name && (
                              <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">
                                • {stay.createdBy.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{stay.guest?.fullName}</p>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{stay.guest?.mobileNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-gray-900">₹{stay.totalAmount}</p>
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
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDeleteStay(stay._id)} className="text-red-500 hover:text-red-700 p-2 transition-colors" title="Delete Stay">
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'transactions' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Guest & Room</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Method</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Collected By</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No payments found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{format(new Date(p.paymentDate), 'dd MMM yyyy')}</p>
                        <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(p.paymentDate), 'hh:mm a')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{p.guest?.fullName}</p>
                        <p className="text-xs font-bold text-indigo-600 mt-0.5">Room {p.stay?.room?.roomNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-green-600">₹{p.amount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                          p.paymentMethod === 'Cash' ? 'bg-green-50 text-green-700 border border-green-200' :
                          p.paymentMethod === 'UPI' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          p.paymentMethod === 'Mixed' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-700 text-xs">{p.createdBy?.name || 'Receptionist'}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{p.createdBy?.role}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500 max-w-[150px] truncate">{p.note || '-'}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'laundry' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Order & Date</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Vendor / Dhobi</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-center">Linen Pieces</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Bill Amount</th>
                  <th className="px-6 py-4 font-black text-xs text-indigo-700 uppercase tracking-widest text-right">Paid (Expense)</th>
                  <th className="px-6 py-4 font-black text-xs text-amber-600 uppercase tracking-widest text-right">Due</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Payment</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLaundryOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No laundry orders found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLaundryOrders.map(order => {
                    const due = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
                    return (
                      <tr key={order._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{format(new Date(order.sentDate || order.createdAt), 'dd MMM yyyy')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{order.vendorName}</p>
                          {order.vendorPhone && <p className="text-xs text-gray-500 mt-0.5">{order.vendorPhone}</p>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-gray-900">{order.totalPiecesSent || 0} sent</span>
                          {order.status === 'Received' && (
                            <span className="text-xs text-emerald-700 block mt-0.5 font-medium">{order.totalPiecesReceived || 0} recvd</span>
                          )}
                          {(order.totalPiecesMissing || 0) > 0 && (
                            <span className="text-xs text-rose-600 block mt-0.5 font-bold">⚠️ {order.totalPiecesMissing} missing</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-gray-900">₹{order.totalAmount || 0}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">₹{order.paidAmount || 0}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {due > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block">₹{due}</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">Cleared</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                            order.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            order.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {order.paymentStatus}
                          </span>
                          {order.paymentMethod && <span className="block text-[10px] text-gray-400 mt-0.5">{order.paymentMethod}</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                            order.status === 'Received' ? 'bg-emerald-100 text-emerald-800' :
                            order.status === 'Cancelled' ? 'bg-gray-100 text-gray-600' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status === 'Sent' ? 'With Dhobi' : order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'khata' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Customer Details</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">ID Proof</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Market Due (उधार)</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Advance Held (जमा)</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-center">Net Balance</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredKhataCustomers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No customer khata records found.
                    </td>
                  </tr>
                ) : (
                  filteredKhataCustomers.map(customer => {
                    const bal = Number(customer.ledgerBalance) || 0;
                    const cleanMobile = customer.mobileNumber ? customer.mobileNumber.replace(/[^0-9]/g, '') : '';
                    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
                    const waText = bal < 0 
                      ? encodeURIComponent(`Namaste ${customer.fullName}, this is a reminder from the hotel regarding your pending khata due balance of ₹${Math.abs(bal).toLocaleString('en-IN')}. Kindly clear this at your earliest convenience. Thank you!`)
                      : encodeURIComponent(`Namaste ${customer.fullName}, your current advance deposit balance with the hotel is ₹${bal.toLocaleString('en-IN')}. Thank you for choosing us!`);
                    const waLink = phone ? `https://wa.me/${phone}?text=${waText}` : null;

                    return (
                      <tr key={customer._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <Link to={`/guests/${customer._id}?tab=khata`} className="font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                            {customer.fullName}
                          </Link>
                          <p className="text-xs text-gray-500 mt-0.5">{customer.mobileNumber || 'No mobile'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                            {customer.idProofType}: {customer.idProofNumber || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {customer.dueAmount > 0 ? (
                            <span className="font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg inline-block">
                              ₹{customer.dueAmount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">₹0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {customer.advanceAmount > 0 ? (
                            <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
                              ₹{customer.advanceAmount.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">₹0</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${
                            bal < 0 ? 'bg-red-50 text-red-700 border-red-200' :
                            bal > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {bal < 0 ? `Due: ₹${Math.abs(bal).toLocaleString('en-IN')}` :
                             bal > 0 ? `Advance: ₹${bal.toLocaleString('en-IN')}` :
                             'Cleared ₹0'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {waLink && (
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-colors flex items-center gap-1 active:scale-95"
                                title="Send WhatsApp Reminder / Statement"
                              >
                                <Share2 size={13} /> WhatsApp
                              </a>
                            )}
                            <Link
                              to={`/guests/${customer._id}?tab=khata`}
                              className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1"
                            >
                              Passbook &rarr;
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* Police Report Generator Modal */}
      <PoliceReportModal
        isOpen={showPoliceModal}
        onClose={() => setShowPoliceModal(false)}
        stays={stays}
        hostels={hostels}
        defaultHostel={hostelFilter}
      />

      {/* Shift Handover & Cash Drawer Voucher Modal */}
      <ShiftHandoverModal
        isOpen={showHandoverModal}
        onClose={() => setShowHandoverModal(false)}
        windowLabel={activeDateTimeRange?.label || (dateFilter === 'all' ? 'All Time' : dateFilter)}
        stats={stats}
        payments={filteredPayments}
        staffBreakdown={stats.staffBreakdown || []}
        hostelName={hostels.find(h => h._id === hostelFilter)?.name || (hostelFilter === 'all' ? 'All Properties' : 'Hotel Property')}
      />
    </div>
  );
};

export default Reports;
