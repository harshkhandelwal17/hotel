import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { Search, Download, TrendingUp, TrendingDown, PieChart, Users, Receipt, ArrowRight, ShieldCheck, Trash, Shirt, BookOpen, Wallet, Share2, Clock, Banknote, CheckCircle, Building, Sparkles, PlusCircle } from 'lucide-react';
import { useOutletContext, Link } from 'react-router-dom';
import PoliceReportModal from './PoliceReportModal';
import ShiftHandoverModal from './ShiftHandoverModal';
import ExpenseModal from './ExpenseModal';
import { useToast } from '../../components/ui/Toast';

const safeFormat = (dateVal, formatStr, fallback = 'N/A') => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? fallback : format(d, formatStr);
  } catch (_) {
    return fallback;
  }
};

const Reports = () => {
  const toast = useToast();
  const [stays, setStays] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [laundryOrders, setLaundryOrders] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPoliceModal, setShowPoliceModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Tabs: bookings, transactions, expenses, laundry, khata
  const [activeTab, setActiveTab] = useState('transactions');

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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');

  useEffect(() => {
    if (globalProperty) setHostelFilter(globalProperty);
  }, [globalProperty]);

  async function fetchData() {
    try {
      setLoading(true);
      const [staysRes, hostelsRes, paymentsRes, expensesRes, laundryRes, khataRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/payments').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/expenses').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/laundry').catch(() => ({ data: { data: [] } })),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/guests/khata/summary').catch(() => ({ data: { data: { totalMarketDue: 0, totalAdvanceHeld: 0, netBalance: 0, customers: [] } } }))
      ]);
      setStays(staysRes?.data?.data || []);
      setHostels(hostelsRes?.data?.data || []);
      setPayments(paymentsRes?.data?.data || []);
      setExpenses(expensesRes?.data?.data || []);
      setLaundryOrders(laundryRes?.data?.data || []);
      if (khataRes?.data?.data) {
        setKhataSummary(khataRes.data.data);
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

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
      if (hostelFilter !== 'all' && stay.hostel?._id !== hostelFilter && stay.hostel !== hostelFilter) {
        return false;
      }
      
      const searchStr = (searchQuery || '').toLowerCase();
      if (searchStr && 
          !String(stay.guest?.fullName || '').toLowerCase().includes(searchStr) && 
          !String(stay.room?.roomNumber || '').toLowerCase().includes(searchStr) &&
          !String(stay.commissionTo || '').toLowerCase().includes(searchStr)) {
        return false;
      }

      if (activeDateTimeRange) {
        const date = new Date(stay.checkInDate);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

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
      if (hostelFilter !== 'all' && payment.hostel?._id !== hostelFilter && payment.hostel !== hostelFilter) {
        return false;
      }
      
      const searchStr = (searchQuery || '').toLowerCase();
      if (searchStr && 
          !String(payment.guest?.fullName || '').toLowerCase().includes(searchStr) && 
          !String(payment.stay?.room?.roomNumber || '').toLowerCase().includes(searchStr) &&
          !String(payment.paymentMethod || '').toLowerCase().includes(searchStr)) {
        return false;
      }

      if (paymentMethodFilter !== 'all') {
        const method = (payment.paymentMethod || '').toLowerCase();
        if (method !== paymentMethodFilter.toLowerCase()) return false;
      }

      if (activeDateTimeRange) {
        const date = new Date(payment.paymentDate);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      if (staffFilter !== 'all') {
        const creatorId = payment.createdBy?._id || (typeof payment.createdBy === 'string' ? payment.createdBy : null);
        if (creatorId !== staffFilter) return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
  }, [payments, hostelFilter, searchQuery, paymentMethodFilter, activeDateTimeRange, staffFilter]);

  // Filter Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (hostelFilter !== 'all' && exp.hostel?._id !== hostelFilter && exp.hostel !== hostelFilter) {
        return false;
      }

      const searchStr = searchQuery.toLowerCase();
      if (searchStr && !exp.title?.toLowerCase().includes(searchStr) &&
          !exp.category?.toLowerCase().includes(searchStr) &&
          !exp.notes?.toLowerCase().includes(searchStr)) {
        return false;
      }

      if (expenseCategoryFilter !== 'all') {
        if (exp.category !== expenseCategoryFilter) return false;
      }

      if (paymentMethodFilter !== 'all') {
        const method = (exp.paymentMethod || 'Cash').toLowerCase();
        if (method !== paymentMethodFilter.toLowerCase()) return false;
      }

      if (activeDateTimeRange) {
        const date = new Date(exp.expenseDate || exp.createdAt);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt));
  }, [expenses, hostelFilter, searchQuery, expenseCategoryFilter, paymentMethodFilter, activeDateTimeRange]);

  // Filter Laundry Orders
  const filteredLaundryOrders = useMemo(() => {
    return laundryOrders.filter(order => {
      if (hostelFilter !== 'all' && order.hostel?._id !== hostelFilter && order.hostel !== hostelFilter) {
        return false;
      }
      
      const searchStr = searchQuery.toLowerCase();
      if (searchStr && 
          !order.orderNumber?.toLowerCase().includes(searchStr) && 
          !order.vendorName?.toLowerCase().includes(searchStr) &&
          !order.vendorPhone?.toLowerCase().includes(searchStr)) {
        return false;
      }

      if (activeDateTimeRange) {
        const date = new Date(order.sentDate || order.createdAt);
        if (date < activeDateTimeRange.start || date > activeDateTimeRange.end) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.sentDate || b.createdAt) - new Date(a.sentDate || a.createdAt));
  }, [laundryOrders, hostelFilter, searchQuery, activeDateTimeRange]);

  // Comprehensive Financial & Operational Stats
  const stats = useMemo(() => {
    let grossBooking = 0;
    let totalCommission = 0;
    
    // Distinct bookings and headcount associated with filtered stays AND filtered payments in this period
    const stayIdSet = new Set();
    let totalOccupantsHeadcount = 0;
    
    filteredStays.forEach(stay => {
      grossBooking += (stay.totalAmount || 0);
      totalCommission += (stay.commissionAmount || 0);
      const sId = String(stay._id || stay.id);
      if (!stayIdSet.has(sId)) {
        stayIdSet.add(sId);
        const occupants = Number(stay.occupants) || 1;
        const coGuestsCount = Array.isArray(stay.coGuests) ? stay.coGuests.length : 0;
        totalOccupantsHeadcount += Math.max(occupants, coGuestsCount + 1);
      }
    });

    filteredPayments.forEach(p => {
      if (p.stay) {
        const sId = String(typeof p.stay === 'object' ? (p.stay._id || p.stay.id) : p.stay);
        if (sId && !stayIdSet.has(sId)) {
          stayIdSet.add(sId);
          if (typeof p.stay === 'object') {
            const occupants = Number(p.stay.occupants) || 1;
            const coGuestsCount = Array.isArray(p.stay.coGuests) ? p.stay.coGuests.length : 0;
            totalOccupantsHeadcount += Math.max(occupants, coGuestsCount + 1);
          } else {
            totalOccupantsHeadcount += 1;
          }
        }
      }
    });

    const bookingsCount = stayIdSet.size || filteredStays.length;

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

    // Expenses Calculation
    let totalExpenses = 0;
    let cashExpense = 0;
    let upiExpense = 0;
    let cardExpense = 0;

    let syncedLaundryExpensesTotal = 0;
    let syncedLaundryCashExpense = 0;
    let syncedLaundryUpiExpense = 0;

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      totalExpenses += amt;
      const m = (exp.paymentMethod || 'Cash').toLowerCase();
      if (m === 'cash') cashExpense += amt;
      else if (m === 'upi') upiExpense += amt;
      else cardExpense += amt;

      // Track synced laundry expenses so we never double count with LaundryOrders
      if (exp.laundryOrder || exp.category === 'Laundry Expense') {
        syncedLaundryExpensesTotal += amt;
        if (m === 'cash') syncedLaundryCashExpense += amt;
        else if (m === 'upi') syncedLaundryUpiExpense += amt;
      }
    });

    // Bridge any legacy laundry orders that do not yet have an Expense document
    const unsyncedLaundryExpense = Math.max(0, totalLaundryExpense - syncedLaundryExpensesTotal);
    let legacyUnsyncedCash = 0;
    let legacyUnsyncedUpi = 0;
    if (unsyncedLaundryExpense > 0) {
      filteredLaundryOrders.forEach(order => {
        const paid = Number(order.paidAmount) || 0;
        const m = (order.paymentMethod || 'Cash').toLowerCase();
        if (m === 'cash') legacyUnsyncedCash += paid;
        else if (m === 'upi') legacyUnsyncedUpi += paid;
      });
      legacyUnsyncedCash = Math.min(legacyUnsyncedCash, unsyncedLaundryExpense);
      legacyUnsyncedUpi = Math.min(legacyUnsyncedUpi, Math.max(0, unsyncedLaundryExpense - legacyUnsyncedCash));
    }

    const unifiedTotalExpenses = totalExpenses + unsyncedLaundryExpense;
    const unifiedCashExpense = cashExpense + legacyUnsyncedCash;
    const unifiedUpiExpense = upiExpense + legacyUnsyncedUpi;

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

    // CRITICAL: Reconciled Net Cash In Hand (Drawer Handover) = Total Cash Collected - Total Cash Expenses (including cash paid for laundry)
    const netCashInDrawer = cashTotal - unifiedCashExpense;

    // Net Profit = Gross Bookings - Broker Commissions - Total Operational Expenses (including laundry without double deduction)
    const netProfit = grossBooking - totalCommission - unifiedTotalExpenses;
    
    return {
      grossBooking,
      bookingsCount,
      totalGuestsHeadcount: totalOccupantsHeadcount,
      totalCommission,
      totalLaundryExpense,
      totalLaundryBilled,
      pendingLaundryDue,
      totalPiecesSent,
      totalPiecesMissing,
      totalExpenses: unifiedTotalExpenses,
      cashExpense: unifiedCashExpense,
      upiExpense: unifiedUpiExpense,
      cardExpense,
      netCashInDrawer,
      netProfit,
      totalCollected,
      cashTotal,
      upiTotal,
      cardTotal,
      walletTotal,
      khataTotal,
      staffBreakdown
    };
  }, [filteredStays, filteredPayments, filteredExpenses, filteredLaundryOrders]);

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

  // Comprehensive Detailed CSV Export with Summary Dashboard on Top
  const downloadCSV = () => {
    const periodLabel = activeDateTimeRange?.label || (dateFilter === 'all' ? 'All Time' : dateFilter);
    const hostelLabel = hostels.find(h => h._id === hostelFilter)?.name || (hostelFilter === 'all' ? 'All Properties' : 'Hotel Property');
    
    let csvContent = "";

    // 1. EXECUTIVE SUMMARY BLOCK AT THE TOP OF EXCEL/CSV
    const summaryBlock = [
      `"=== HOTEL FINANCIAL & OPERATIONAL AUDIT REPORT ==="`,
      `"Property","${hostelLabel.replace(/"/g, '""')}"`,
      `"Filter / Shift Period","${periodLabel.replace(/"/g, '""')}"`,
      `"Report Generated On","${format(new Date(), 'dd MMM yyyy, hh:mm a')}"`,
      `""`,
      `"--- KEY METRICS & REVENUE SUMMARY ---"`,
      `"Total Bookings Count",${stats.bookingsCount}`,
      `"Total Guests Headcount",${stats.totalGuestsHeadcount}`,
      `"Gross Booking Value (INR)",${stats.grossBooking}`,
      `"Broker Commissions Paid (INR)",${stats.totalCommission}`,
      `"Total Daily Expenses Deducted (INR)",-${stats.totalExpenses}`,
      `"Net Operating Profit (INR)",${stats.netProfit}`,
      `""`,
      `"--- CASH DRAWER RECONCILIATION ---"`,
      `"Gross Cash Inflow (Counter Collections)",${stats.cashTotal}`,
      `"Cash Expenses Outflow (Paid From Drawer)",-${stats.cashExpense}`,
      `"NET PHYSICAL CASH IN HAND (DRAWER HANDOVER)",${stats.netCashInDrawer}`,
      `""`,
      `"--- DIGITAL & OTHER COLLECTIONS ---"`,
      `"UPI Direct (Bank / QR)",${stats.upiTotal}`,
      `"Card / POS Collections",${stats.cardTotal}`,
      `"Wallet / Khata Collections",${stats.walletTotal + stats.khataTotal}`,
      `"TOTAL GROSS COLLECTIONS (ALL MODES)",${stats.totalCollected}`,
      `"NET OPERATING COLLECTIONS (COLLECTIONS - EXPENSES)",${stats.totalCollected - stats.totalExpenses}`,
      `""`,
      `"============================================================"`,
      `""`
    ].join('\n');

    if (activeTab === 'bookings') {
      const headers = ['Booking Number', 'Check-In Date', 'Expected Check-Out', 'Guest Name', 'Headcount', 'Room No', 'Booking Amount (INR)', 'Broker Name', 'Commission Paid (INR)', 'Net Amount (INR)', 'Total Collected (INR)', 'Status'];
      const csvData = filteredStays.map(stay => {
        const net = (stay.totalAmount || 0) - (stay.commissionAmount || 0);
        const occupants = stay.occupants || (Array.isArray(stay.coGuests) ? stay.coGuests.length + 1 : 1);
        const bNum = stay.bookingNumber || 'Direct';
        const checkOut = stay.expectedCheckOutDate ? safeFormat(stay.expectedCheckOutDate, 'dd MMM yyyy') : 'N/A';
        return `"${bNum}","${safeFormat(stay.checkInDate, 'dd MMM yyyy')}","${checkOut}","${(stay.guest?.fullName || 'N/A').replace(/"/g, '""')}",${occupants},"${stay.room?.roomNumber || 'N/A'}",${stay.totalAmount || 0},"${(stay.commissionTo || '').replace(/"/g, '""')}",${stay.commissionAmount || 0},${net},${stay.paidAmount || 0},"${stay.status}"`;
      });
      csvContent = `${summaryBlock}\n"--- BOOKING LEDGER ENTRIES (${filteredStays.length} Stays) ---"\n` + [headers.join(','), ...csvData].join('\n');
    } else if (activeTab === 'transactions' || activeTab === 'expenses') {
      const paymentHeaders = ['Date & Time', 'Booking Number', 'Room No', 'Guest Name', 'Headcount', 'Payment Method', 'Amount (INR)', 'Collected By', 'Note / Remark'];
      const paymentData = filteredPayments.map(p => {
        const bNum = p.stay?.bookingNumber || 'Direct';
        const rNum = p.stay?.room?.roomNumber || 'N/A';
        const occupants = p.stay?.occupants || 1;
        return `"${safeFormat(p.paymentDate, 'dd MMM yyyy hh:mm a')}","${bNum}","${rNum}","${(p.guest?.fullName || 'N/A').replace(/"/g, '""')}",${occupants},"${p.paymentMethod || 'Cash'}",${p.amount || 0},"${(p.createdBy?.name || 'Reception Staff').replace(/"/g, '""')}","${(p.note || '').replace(/"/g, '""')}"`;
      });

      const expenseHeaders = ['Expense Date & Time', 'Expense Title', 'Category', 'Paid Via', 'Amount (INR)', 'Deducted From Drawer?', 'Recorded By', 'Notes'];
      const expenseData = filteredExpenses.map(e => {
        const isCash = (e.paymentMethod || 'Cash').toLowerCase() === 'cash';
        return `"${safeFormat(e.expenseDate || e.createdAt, 'dd MMM yyyy hh:mm a')}","${(e.title || '').replace(/"/g, '""')}","${(e.category || '').replace(/"/g, '""')}","${e.paymentMethod || 'Cash'}",${e.amount || 0},"${isCash ? 'YES (Cash Drawer)' : 'NO (Bank/Online)'}","${(e.createdBy?.name || 'Staff').replace(/"/g, '""')}","${(e.notes || '').replace(/"/g, '""')}"`;
      });

      csvContent = `${summaryBlock}\n"--- CASH FLOW & PAYMENT RECEIPTS (${filteredPayments.length} Transactions) ---"\n` + 
        [paymentHeaders.join(','), ...paymentData].join('\n') + 
        `\n\n"--- DAILY EXPENSES DEDUCTION REGISTER (${filteredExpenses.length} Expenses) ---"\n` + 
        [expenseHeaders.join(','), ...expenseData].join('\n');
    } else if (activeTab === 'laundry') {
      const headers = ['Order Number', 'Date Sent', 'Vendor Name', 'Vendor Phone', 'Pieces Sent', 'Pieces Received', 'Pieces Missing', 'Total Bill', 'Paid (Expense)', 'Due Amount', 'Payment Status', 'Status'];
      const csvData = filteredLaundryOrders.map(o => {
        const due = Math.max(0, (o.totalAmount || 0) - (o.paidAmount || 0));
        return `"${o.orderNumber || ''}","${safeFormat(o.sentDate || o.createdAt, 'dd MMM yyyy')}","${o.vendorName || ''}","${o.vendorPhone || ''}",${o.totalPiecesSent || 0},${o.totalPiecesReceived || 0},${o.totalPiecesMissing || 0},${o.totalAmount || 0},${o.paidAmount || 0},${due},"${o.paymentStatus || ''}","${o.status || ''}"`;
      });
      csvContent = `${summaryBlock}\n"--- LAUNDRY EXPENSE & LINEN LOG ---"\n` + [headers.join(','), ...csvData].join('\n');
    } else if (activeTab === 'khata') {
      const headers = ['Guest Name', 'Mobile Number', 'ID Proof', 'Account Status', 'Due Amount (Receivable)', 'Advance Amount (Held)', 'Net Balance'];
      const csvData = (khataSummary.customers || []).map(c => {
        return `"${c.fullName || ''}","${c.mobileNumber || ''}","${c.idProofType || ''} ${c.idProofNumber || ''}","${c.status || ''}",${c.dueAmount || 0},${c.advanceAmount || 0},${c.ledgerBalance || 0}`;
      });
      csvContent = `${summaryBlock}\n"--- KHATA & CREDIT LEDGER ---"\n` + [headers.join(','), ...csvData].join('\n');
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Finance_Report_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense? It will be restored to your revenue.")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/expenses/${id}`);
      setExpenses(prev => prev.filter(e => e._id !== id));
      toast({ message: 'Expense deleted successfully', type: 'info' });
    } catch (err) {
      toast({ message: 'Failed to delete expense', type: 'error' });
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Financial & Operating Reports</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">Reconciled drawer cash, digital collections, headcount, and daily expenses.</p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowExpenseModal(true)} 
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            title="Add Daily Hotel Expense (Deducted from Cash Revenue)"
          >
            <PlusCircle size={15} className="text-rose-400" /> Add Expense
          </button>
          <button 
            onClick={() => setShowHandoverModal(true)} 
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            title="Generate Printable Shift Handover & Cash Drawer Voucher"
          >
            <Banknote size={15} className="text-gray-500" /> Shift Slip
          </button>
          <button 
            onClick={() => setShowPoliceModal(true)} 
            className="flex-1 sm:flex-none justify-center px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            title="Generate Official Police Verification Report"
          >
            <ShieldCheck size={15} className="text-gray-500" /> Police Report
          </button>
          <button 
            onClick={downloadCSV} 
            className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-bold text-xs rounded-xl shadow-2xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Download size={15} className="text-gray-700" /> Download Report
          </button>
        </div>
      </div>

      {/* 5-Metric Executive Overview (Consistently visible for instant financial reconciliation) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* 1. Bookings & Headcount */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bookings & Guests</span>
              <span className="p-1 sm:p-1.5 bg-gray-100 text-gray-600 rounded-lg"><Users size={13} /></span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {stats.bookingsCount} <span className="text-xs sm:text-sm font-semibold text-gray-500">Bookings</span>
              </h2>
            </div>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-indigo-600 mt-2 truncate">
            {stats.totalGuestsHeadcount} Total Guests Accommodated
          </p>
        </div>

        {/* 2. Total Revenue (Collections) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Revenue</span>
              <span className="px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] sm:text-[10px] font-bold rounded-md border border-blue-200/60">Gross</span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                ₹{stats.totalCollected.toLocaleString('en-IN')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] sm:text-[11px] font-bold flex-wrap">
            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200/60">
              Cash ₹{stats.cashTotal.toLocaleString('en-IN')}
            </span>
            <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200/60">
              UPI ₹{stats.upiTotal.toLocaleString('en-IN')}
            </span>
            <span className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200/60">
              Card ₹{stats.cardTotal.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
              <span className="px-1.5 sm:px-2 py-0.5 bg-rose-50 text-rose-700 text-[9px] sm:text-[10px] font-bold rounded-md border border-rose-200/60">Deducted</span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <h2 className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
                -₹{stats.totalExpenses.toLocaleString('en-IN')}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] sm:text-[11px] font-bold flex-wrap">
            <span className="px-1.5 py-0.5 bg-gray-50 text-gray-700 rounded border border-gray-200/60">
              Cash: <span className="text-rose-600">-₹{stats.cashExpense.toLocaleString('en-IN')}</span>
            </span>
            <span className="px-1.5 py-0.5 bg-gray-50 text-gray-700 rounded border border-gray-200/60">
              Online: <span className="text-rose-600">-₹{stats.upiExpense.toLocaleString('en-IN')}</span>
            </span>
          </div>
        </div>

        {/* 4. Total Net Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Net Profit</span>
              <span className={`px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold rounded-md border ${
                (stats.totalCollected - stats.totalExpenses) >= 0 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' 
                  : 'bg-rose-50 text-rose-700 border-rose-200/60'
              }`}>
                {(stats.totalCollected - stats.totalExpenses) >= 0 ? 'Profit' : 'Loss'}
              </span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${
                (stats.totalCollected - stats.totalExpenses) >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                ₹{(stats.totalCollected - stats.totalExpenses).toLocaleString('en-IN')}
              </h2>
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-2 font-medium truncate">
            Revenue ₹{stats.totalCollected.toLocaleString('en-IN')} - Exp ₹{stats.totalExpenses.toLocaleString('en-IN')}
          </p>
        </div>

        {/* 5. Net Cash in Drawer */}
        <div className="col-span-2 lg:col-span-1 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider">Net Cash in Drawer</span>
              <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] sm:text-[10px] font-bold rounded-md border border-emerald-200/60">Drawer</span>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <h2 className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                ₹{stats.netCashInDrawer.toLocaleString('en-IN')}
              </h2>
            </div>
          </div>
          <p className="text-[11px] sm:text-xs text-gray-500 mt-2 font-medium truncate">
            Cash In ₹{stats.cashTotal.toLocaleString('en-IN')} | Paid -₹{stats.cashExpense.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-wrap gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit border border-gray-200/60">
          <button 
            onClick={() => setActiveTab('transactions')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all text-center ${activeTab === 'transactions' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Cash Flow & Collections ({filteredPayments.length})
          </button>
          <button 
            onClick={() => setActiveTab('expenses')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${activeTab === 'expenses' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <TrendingDown size={14} className="text-rose-500" /> Daily Expenses ({filteredExpenses.length})
          </button>
          <button 
            onClick={() => setActiveTab('bookings')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all text-center ${activeTab === 'bookings' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Booking Ledger ({filteredStays.length})
          </button>
          <button 
            onClick={() => setActiveTab('khata')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${activeTab === 'khata' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <BookOpen size={14} /> Khata & Credit
          </button>
          <button 
            onClick={() => setActiveTab('laundry')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${activeTab === 'laundry' ? 'bg-white shadow-xs text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Shirt size={14} /> Laundry ({filteredLaundryOrders.length})
          </button>
        </div>
        {activeTab === 'laundry' && (
          <Link to="/laundry" className="text-xs font-bold text-gray-700 hover:text-gray-900 flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-2 rounded-xl transition-colors">
            Open Laundry Module <ArrowRight size={14} />
          </Link>
        )}
      </div>

      {/* Secondary Specific Ledger Metrics (Only shown for specialized tabs) */}
      {activeTab === 'khata' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Market Credit Due (उधार)</p>
            <div className="mt-1 text-2xl font-black text-rose-700">₹{khataSummary.totalMarketDue.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-500 mt-1">{khataSummary.dueGuestsCount} Guests owe payment</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Advance Held (जमा)</p>
            <div className="mt-1 text-2xl font-black text-emerald-700">₹{khataSummary.totalAdvanceHeld.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-500 mt-1">{khataSummary.advanceGuestsCount} Guests with advance</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Net Khata Position</p>
            <div className="mt-1 text-2xl font-black text-gray-900">
              <span className={khataSummary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                {khataSummary.netBalance >= 0 ? `+₹${khataSummary.netBalance.toLocaleString('en-IN')}` : `-₹${Math.abs(khataSummary.netBalance).toLocaleString('en-IN')}`}
              </span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Advance held minus market credit</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Khata Accounts</p>
            <div className="mt-1 text-2xl font-black text-gray-900">{khataSummary.totalCreditAccounts} Active</div>
            <p className="text-[10px] text-gray-500 mt-1">Regular guest accounts</p>
          </div>
        </div>
      )}

      {activeTab === 'laundry' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Laundry Billed</p>
            <div className="mt-1 text-2xl font-black text-gray-900">₹{stats.totalLaundryBilled.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-400 mt-1">From all dispatched batches</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Paid Out (Expense)</p>
            <div className="mt-1 text-2xl font-black text-rose-600">₹{stats.totalLaundryExpense.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-400 mt-1">Deducted from hotel revenue</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pending Vendor Bills</p>
            <div className="mt-1 text-2xl font-black text-amber-700">₹{stats.pendingLaundryDue.toLocaleString('en-IN')}</div>
            <p className="text-[10px] text-gray-400 mt-1">Unpaid to dhobi/vendor</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200/90 shadow-2xs">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Linen Sent / Missing</p>
            <div className="mt-1 text-2xl font-black text-gray-900">
              {stats.totalPiecesSent} <span className="text-sm font-bold text-rose-500">({stats.totalPiecesMissing} missing)</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Pieces sent to laundry</p>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Search size={16} /></div>
          <input 
            type="text" 
            placeholder={activeTab === 'expenses' ? "Search Expense Title, Category, Notes..." : activeTab === 'laundry' ? "Search Vendor, Order #..." : activeTab === 'khata' ? "Search Customer Name, Mobile, ID..." : "Search Guest, Room..."} 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" 
          />
        </div>
        
        {activeTab !== 'khata' && (
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date & Time</option>
          </select>
        )}

        {activeTab === 'khata' && (
          <select value={khataTypeFilter} onChange={e => setKhataTypeFilter(e.target.value)} className="w-full md:w-56 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Khata Accounts</option>
            <option value="due">Only Market Due (उधार बाकी)</option>
            <option value="advance">Only Advance Held (जमा राशि)</option>
          </select>
        )}

        {(activeTab === 'transactions' || activeTab === 'expenses') && (
          <select value={paymentMethodFilter} onChange={e => setPaymentMethodFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash (कैश)</option>
            <option value="UPI">UPI (GooglePay/PhonePe)</option>
            <option value="Card">Card / POS</option>
            {activeTab === 'transactions' && (
              <>
                <option value="Wallet">Wallet / Advance</option>
                <option value="Khata">Khata (उधार)</option>
                <option value="Bank">Bank Transfer</option>
              </>
            )}
          </select>
        )}

        {activeTab === 'expenses' && (
          <select value={expenseCategoryFilter} onChange={e => setExpenseCategoryFilter(e.target.value)} className="w-full md:w-48 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-black outline-none appearance-none">
            <option value="all">All Categories</option>
            <option value="Food & Groceries">Food & Groceries</option>
            <option value="Cleaning & Housekeeping">Cleaning & Housekeeping</option>
            <option value="Maintenance & Repairs">Maintenance & Repairs</option>
            <option value="Electricity & Utility">Electricity & Utility</option>
            <option value="Staff Salary / Advance">Staff Salary / Advance</option>
            <option value="Water Supply">Water Supply</option>
            <option value="Internet & Software">Internet & Software</option>
            <option value="Miscellaneous">Miscellaneous</option>
            <option value="Other">Other</option>
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
        <div className="p-4 bg-gray-50 border border-gray-200/90 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
          {/* Quick Shift Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-gray-500 mr-1 flex items-center gap-1">
              <Clock size={13} className="text-gray-600" /> Shift Presets:
            </span>
            <button
              type="button"
              onClick={() => applyShiftPreset('morning')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Morning (08:00 AM – 04:00 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('evening')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Evening (04:00 PM – 11:59 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('night')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Night (11:00 PM – 08:00 AM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('hotel24')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Hotel 24h (12:00 PM – 12:00 PM)
            </button>
            <button
              type="button"
              onClick={() => applyShiftPreset('todayFull')}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Full Day (00:00 – 23:59)
            </button>
            {(customStartTime || customEndTime) && (
              <button
                type="button"
                onClick={() => applyShiftPreset('clear')}
                className="px-2.5 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg text-xs font-semibold transition-colors ml-auto cursor-pointer"
              >
                Clear Times
              </button>
            )}
          </div>

          {/* Date & Time Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Staff-wise Collection Breakdown (Transactions Tab) */}
      {activeTab === 'transactions' && stats.staffBreakdown && stats.staffBreakdown.length > 0 && (
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

      {/* Main Data Tables */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'bookings' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Date & Room</th>
                  <th className="px-6 py-4 font-black text-xs text-gray-500 uppercase tracking-widest">Guest Details</th>
                  <th className="px-6 py-4 font-black text-xs text-indigo-700 uppercase tracking-widest text-center">Head Count</th>
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
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No bookings found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredStays.map(stay => {
                    const net = (stay.totalAmount || 0) - (stay.commissionAmount || 0);
                    const occupants = stay.occupants || (Array.isArray(stay.coGuests) ? stay.coGuests.length + 1 : 1);
                    return (
                      <tr key={stay._id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{safeFormat(stay.checkInDate, 'dd MMM yyyy')}</p>
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
                          <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.guest?.mobileNumber}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black">
                            {occupants} {occupants === 1 ? 'Guest' : 'Guests'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-gray-900">₹{stay.totalAmount}</p>
                          <p className="text-xs font-bold text-gray-500 mt-0.5">Paid: ₹{stay.paidAmount || 0}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-black text-orange-500">₹{stay.commissionAmount || 0}</p>
                          {stay.commissionTo && <p className="text-[10px] text-gray-400 mt-0.5">{stay.commissionTo}</p>}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-green-600">
                          ₹{net}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                            stay.status === 'Active' ? 'bg-green-50 text-green-700 border border-green-200' :
                            stay.status === 'Checked Out' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-50 text-yellow-700 border border-yellow-200'
                          }`}>
                            {stay.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteStay(stay._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Stay"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : activeTab === 'transactions' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Guest & Room</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Booking Info</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Payment Mode</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Collected By</th>
                  <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                      No payment transactions found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr key={p._id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{safeFormat(p.paymentDate, 'dd MMM yyyy')}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{safeFormat(p.paymentDate, 'hh:mm a')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{p.guest?.fullName || 'N/A'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">Room {p.stay?.room?.roomNumber || 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-gray-600 block">{p.stay?.bookingNumber ? `#${p.stay.bookingNumber}` : 'Direct'}</span>
                        <span className="text-[11px] text-gray-400">{p.stay?.occupants || 1} {(p.stay?.occupants || 1) > 1 ? 'Guests' : 'Guest'}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-bold text-emerald-700 font-mono text-base">₹{Number(p.amount).toLocaleString('en-IN')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${
                          p.paymentMethod === 'Cash' ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' :
                          p.paymentMethod === 'UPI' ? 'bg-blue-50 text-blue-800 border-blue-200/80' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800 text-xs">{p.createdBy?.name || 'Receptionist'}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{p.createdBy?.role || 'Staff'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-gray-500 max-w-[150px] truncate">{p.note || '-'}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'expenses' ? (
            /* DAILY EXPENSES TABLE */
            <div className="space-y-0">
              <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Daily Operating Expenses Register</h3>
                  <p className="text-xs text-gray-500">Expenses paid via Cash are deducted from your drawer counter cash in real-time.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] font-semibold text-gray-400 block uppercase">Total Deducted</span>
                    <span className="text-lg font-black text-rose-600 font-mono">-₹{stats.totalExpenses.toLocaleString('en-IN')}</span>
                  </div>
                  <button
                    onClick={() => setShowExpenseModal(true)}
                    className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <PlusCircle size={14} className="text-rose-400" /> Add Expense
                  </button>
                </div>
              </div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/40 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Expense Title</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Paid Via</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-rose-600 uppercase tracking-wider text-right">Amount (Deducted)</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider">Recorded By</th>
                    <th className="px-6 py-3.5 font-bold text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                        No expenses recorded for this period. Click "Add Expense" to record daily grocery, maintenance, or staff payouts.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map(exp => (
                      <tr key={exp._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">{safeFormat(exp.expenseDate || exp.createdAt, 'dd MMM yyyy')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{safeFormat(exp.expenseDate || exp.createdAt, 'hh:mm a')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{exp.title}</p>
                          {exp.notes && <p className="text-xs text-gray-500 max-w-[200px] truncate">{exp.notes}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-semibold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${
                            exp.paymentMethod === 'Cash' ? 'bg-amber-50 text-amber-800 border-amber-200/80' :
                            exp.paymentMethod === 'UPI' ? 'bg-blue-50 text-blue-800 border-blue-200/80' :
                            'bg-gray-100 text-gray-800 border-gray-200'
                          }`}>
                            {exp.paymentMethod} {exp.paymentMethod === 'Cash' && '(Drawer)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="font-bold text-rose-600 text-base font-mono">-₹{Number(exp.amount).toLocaleString('en-IN')}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-xs">{exp.createdBy?.name || 'Staff'}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{exp.createdBy?.role || 'Staff'}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteExpense(exp._id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                          <p className="text-xs text-gray-500 mt-0.5">{safeFormat(order.sentDate || order.createdAt, 'dd MMM yyyy')}</p>
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
        expenses={filteredExpenses}
        staffBreakdown={stats.staffBreakdown || []}
        hostelName={hostels.find(h => h._id === hostelFilter)?.name || (hostelFilter === 'all' ? 'All Properties' : 'Hotel Property')}
      />

      {/* Daily Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        hostels={hostels}
        defaultHostel={hostelFilter}
        onExpenseAdded={(newExp) => {
          setExpenses(prev => [newExp, ...prev]);
        }}
      />
    </div>
  );
};

export default Reports;
