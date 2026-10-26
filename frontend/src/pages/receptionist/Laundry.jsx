import React, { useState, useEffect, useMemo, useContext } from 'react';
import axios from 'axios';
import { useOutletContext } from 'react-router-dom';
import { format, isToday, isThisWeek, isThisMonth, isYesterday, parseISO, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { 
  Shirt, 
  Plus, 
  Search, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Printer, 
  Trash2, 
  Edit3, 
  Phone, 
  IndianRupee, 
  RefreshCw, 
  PackageCheck, 
  ShieldAlert, 
  X,
  CreditCard,
  Building
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import DynamicUpiQr from '../../components/DynamicUpiQr';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const PRESET_LINEN_ITEMS = [
  { itemName: 'Bedsheet (Double)', defaultRate: 8 },
  { itemName: 'Bedsheet (Single)', defaultRate: 6 },
  { itemName: 'Pillow Cover', defaultRate: 3 },
  { itemName: 'Bath Towel', defaultRate: 5 },
  { itemName: 'Hand Towel', defaultRate: 3 },
  { itemName: 'Blanket / Duvet', defaultRate: 30 },
  { itemName: 'Staff Uniform', defaultRate: 15 },
  { itemName: 'Curtains', defaultRate: 20 },
];

const Laundry = () => {
  const { user } = useContext(AuthContext);
  const outletCtx = useOutletContext() || {};
  const { globalProperty = 'all', activeHostel } = outletCtx;

  const [orders, setOrders] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(
    user?.role === 'receptionist' 
      ? (user?.assignedHostel?._id || user?.assignedHostel) 
      : (globalProperty !== 'all' ? globalProperty : 'all')
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Modals
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Dispatch Form State
  const [dispatchForm, setDispatchForm] = useState({
    hostel: '',
    vendorName: '',
    vendorPhone: '',
    sentDate: format(new Date(), 'yyyy-MM-dd'),
    expectedReturnDate: '',
    items: PRESET_LINEN_ITEMS.map(it => ({
      itemName: it.itemName,
      sentCount: '',
      ratePerPiece: it.defaultRate,
      totalCost: 0
    })),
    totalAmount: '',
    paidAmount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Receive Form State
  const [receiveForm, setReceiveForm] = useState({
    receivedDate: format(new Date(), 'yyyy-MM-dd'),
    items: [],
    totalAmount: '',
    paidAmount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Pay Form State
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'Cash',
    notes: ''
  });

  // Saved Vendor & Preset Rates Recall
  const [recentVendors, setRecentVendors] = useState([]);
  const [defaultVendor, setDefaultVendor] = useState(null);
  const [defaultRates, setDefaultRates] = useState({});

  const flash = (msg, isErr = false) => {
    if (isErr) {
      setError(msg);
      setSuccess('');
    } else {
      setSuccess(msg);
      setError('');
    }
    setTimeout(() => { setError(''); setSuccess(''); }, 3500);
  };

  // Fetch Hostels (if admin)
  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      axios.get(`${API}/api/hostels`)
        .then(res => setHostels(res.data.data))
        .catch(console.error);
    }
  }, [user]);

  // Sync selectedHostel with globalProperty
  useEffect(() => {
    if (user?.role === 'admin') {
      setSelectedHostel(globalProperty);
    }
  }, [globalProperty, user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = `?status=${statusFilter}&paymentStatus=${paymentFilter}`;
      if (selectedHostel && selectedHostel !== 'all') {
        query += `&hostel=${selectedHostel}`;
      }
      const res = await axios.get(`${API}/api/laundry${query}`);
      setOrders(res.data.data || []);
      if (res.data.recentVendors) setRecentVendors(res.data.recentVendors);
      if (res.data.defaultVendor) setDefaultVendor(res.data.defaultVendor);
      if (res.data.defaultRates) setDefaultRates(res.data.defaultRates);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load laundry records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedHostel, statusFilter, paymentFilter]);

  // Check if laundry is enabled for active property
  const currentPropertyDoc = useMemo(() => {
    if (user?.role === 'receptionist') {
      return user.assignedHostel;
    }
    if (selectedHostel && selectedHostel !== 'all') {
      return hostels.find(h => h._id === selectedHostel) || activeHostel;
    }
    return activeHostel || hostels[0];
  }, [user, selectedHostel, hostels, activeHostel]);

  const isLaundryEnabled = useMemo(() => {
    if (user?.role === 'superadmin') return true;
    if (user?.role === 'receptionist') return Boolean(user.assignedHostel?.laundryEnabled);
    if (selectedHostel !== 'all' && currentPropertyDoc) {
      return Boolean(currentPropertyDoc.laundryEnabled);
    }
    // If admin viewing 'all', check if at least one property has it enabled
    return hostels.some(h => h.laundryEnabled);
  }, [user, selectedHostel, currentPropertyDoc, hostels]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchVendor = o.vendorName?.toLowerCase().includes(q);
        const matchPhone = o.vendorPhone?.includes(q);
        const matchOrder = o.orderNumber?.toLowerCase().includes(q);
        if (!matchVendor && !matchPhone && !matchOrder) return false;
      }

      // 2. Date Filter
      if (dateFilter !== 'all') {
        const d = new Date(o.sentDate);
        if (dateFilter === 'today' && !isToday(d)) return false;
        if (dateFilter === 'yesterday' && !isYesterday(d)) return false;
        if (dateFilter === 'week' && !isThisWeek(d)) return false;
        if (dateFilter === 'month' && !isThisMonth(d)) return false;
        if (dateFilter === 'custom' && customStart && customEnd) {
          const start = startOfDay(parseISO(customStart));
          const end = endOfDay(parseISO(customEnd));
          if (!isWithinInterval(d, { start, end })) return false;
        }
      }

      return true;
    });
  }, [orders, searchQuery, dateFilter, customStart, customEnd]);

  // Financial & Inventory KPI Calculations
  const stats = useMemo(() => {
    let clothesAtLaundry = 0;
    let monthlyExpense = 0;
    let pendingBills = 0;
    let totalPiecesProcessed = 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    filteredOrders.forEach(o => {
      if (o.status === 'Sent') {
        clothesAtLaundry += (o.totalPiecesSent || 0) - (o.totalPiecesReceived || 0);
      }
      totalPiecesProcessed += (o.totalPiecesSent || 0);

      const paid = Number(o.paidAmount) || 0;
      const dateToCheck = o.paymentDate || o.sentDate;
      if (dateToCheck && new Date(dateToCheck) >= startOfMonth) {
        monthlyExpense += paid;
      }

      const balance = Math.max(0, (Number(o.totalAmount) || 0) - paid);
      pendingBills += balance;
    });

    return {
      clothesAtLaundry: Math.max(0, clothesAtLaundry),
      monthlyExpense,
      pendingBills,
      totalBatches: filteredOrders.length,
      totalPiecesProcessed
    };
  }, [filteredOrders]);

  // Open Dispatch Modal
  const openDispatchModal = () => {
    const defaultHostelId = user?.role === 'receptionist'
      ? (user?.assignedHostel?._id || user?.assignedHostel)
      : (selectedHostel !== 'all' ? selectedHostel : hostels[0]?._id || '');

    // Auto-fill regular vendor from default or recent history
    const autoVendorName = defaultVendor?.vendorName || (recentVendors.length > 0 ? recentVendors[0].vendorName : '');
    const autoVendorPhone = defaultVendor?.vendorPhone || (recentVendors.length > 0 ? recentVendors[0].vendorPhone || '' : '');

    setDispatchForm({
      hostel: defaultHostelId,
      vendorName: autoVendorName,
      vendorPhone: autoVendorPhone,
      sentDate: format(new Date(), 'yyyy-MM-dd'),
      expectedReturnDate: '',
      items: PRESET_LINEN_ITEMS.map(it => {
        // Auto-fill remembered pricing for this hotel
        const savedRate = (defaultRates && defaultRates[it.itemName] !== undefined)
          ? defaultRates[it.itemName]
          : it.defaultRate;
        return {
          itemName: it.itemName,
          sentCount: '',
          ratePerPiece: savedRate,
          totalCost: 0
        };
      }),
      totalAmount: '',
      paidAmount: '',
      paymentMethod: 'Cash',
      notes: ''
    });
    setIsDispatchModalOpen(true);
  };

  // Handle Item Count Change in Dispatch
  const handleItemCountChange = (idx, countStr) => {
    const arr = [...dispatchForm.items];
    const count = countStr === '' ? '' : Math.max(0, parseInt(countStr) || 0);
    const rate = Number(arr[idx].ratePerPiece) || 0;
    arr[idx] = {
      ...arr[idx],
      sentCount: count,
      totalCost: (Number(count) || 0) * rate
    };
    
    const calculatedTotal = arr.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
    setDispatchForm(prev => ({
      ...prev,
      items: arr,
      totalAmount: calculatedTotal > 0 ? calculatedTotal : prev.totalAmount
    }));
  };

  // Handle Item Rate Change
  const handleItemRateChange = (idx, rateStr) => {
    const arr = [...dispatchForm.items];
    const rate = rateStr === '' ? '' : Math.max(0, parseFloat(rateStr) || 0);
    const count = Number(arr[idx].sentCount) || 0;
    arr[idx] = {
      ...arr[idx],
      ratePerPiece: rate,
      totalCost: count * (Number(rate) || 0)
    };
    const calculatedTotal = arr.reduce((s, it) => s + (Number(it.totalCost) || 0), 0);
    setDispatchForm(prev => ({
      ...prev,
      items: arr,
      totalAmount: calculatedTotal > 0 ? calculatedTotal : prev.totalAmount
    }));
  };

  // Add Custom Item in Dispatch
  const addCustomItem = () => {
    setDispatchForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        { itemName: '', sentCount: '', ratePerPiece: 10, totalCost: 0 }
      ]
    }));
  };

  // Submit Dispatch Form
  const handleSubmitDispatch = async (e) => {
    e.preventDefault();
    if (!dispatchForm.vendorName.trim()) return flash('Please enter vendor name', true);
    
    const activeItems = dispatchForm.items.filter(it => (Number(it.sentCount) || 0) > 0);
    if (activeItems.length === 0) {
      return flash('Please enter piece count for at least one item', true);
    }

    try {
      setSubmitting(true);
      await axios.post(`${API}/api/laundry`, {
        ...dispatchForm,
        items: activeItems
      });
      flash('✅ Laundry dispatched to vendor successfully!');
      setIsDispatchModalOpen(false);
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to dispatch laundry', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal
  const openReceiveModal = (order) => {
    setSelectedOrder(order);
    setReceiveForm({
      receivedDate: format(new Date(), 'yyyy-MM-dd'),
      items: (order.items || []).map(it => ({
        itemName: it.itemName,
        sentCount: it.sentCount || 0,
        receivedCount: it.receivedCount > 0 ? it.receivedCount : it.sentCount, // Default all received
        damagedOrMissingCount: it.damagedOrMissingCount || 0,
        ratePerPiece: it.ratePerPiece || 0,
        totalCost: it.totalCost || ((it.sentCount || 0) * (it.ratePerPiece || 0))
      })),
      totalAmount: order.totalAmount ?? 0,
      paidAmount: order.paidAmount ?? 0,
      paymentMethod: order.paymentMethod || 'Cash',
      notes: order.notes || ''
    });
    setIsReceiveModalOpen(true);
  };

  // Submit Receive Form
  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.put(`${API}/api/laundry/${selectedOrder._id}/receive`, receiveForm);
      flash('✅ Laundry marked as received & verified!');
      setIsReceiveModalOpen(false);
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to receive laundry', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Pay Modal
  const openPayModal = (order) => {
    setSelectedOrder(order);
    const balance = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
    setPayForm({
      amount: balance,
      paymentMethod: 'Cash',
      notes: ''
    });
    setIsPayModalOpen(true);
  };

  // Submit Pay Form
  const handleSubmitPay = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) {
      return flash('Please enter a valid amount', true);
    }
    try {
      setSubmitting(true);
      await axios.post(`${API}/api/laundry/${selectedOrder._id}/pay`, payForm);
      flash(`✅ Payment of ₹${payForm.amount} recorded!`);
      setIsPayModalOpen(false);
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to record payment', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this laundry batch?')) return;
    try {
      await axios.delete(`${API}/api/laundry/${orderId}`);
      flash('Laundry record deleted.');
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to delete record', true);
    }
  };

  // Print Gate Pass / Challan
  const printChallan = (order) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert('Please allow popups to print laundry challan');

    const hostelName = order.hostel?.name || 'Hotel Property';
    const hostelAddress = order.hostel?.address || '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laundry Challan - ${order.orderNumber}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #111; }
          .header { text-align: center; border-bottom: 2px dashed #ccc; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
          .header p { margin: 3px 0; font-size: 12px; color: #666; }
          .meta-grid { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 20px; }
          .meta-col { line-height: 1.6; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background-color: #f7f7f7; font-weight: bold; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-row { font-weight: bold; background-color: #fafafa; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; font-size: 12px; }
          .sig-box { border-top: 1px solid #333; width: 180px; text-align: center; padding-top: 5px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${hostelName}</h1>
          <p>${hostelAddress}</p>
          <h2 style="margin: 10px 0 0; font-size: 15px; letter-spacing: 1px;">HOTEL LAUNDRY CHALLAN / DISPATCH SLIP</h2>
        </div>

        <div class="meta-grid">
          <div class="meta-col">
            <strong>Challan No:</strong> ${order.orderNumber}<br/>
            <strong>Vendor / Dhobi:</strong> ${order.vendorName} ${order.vendorPhone ? `(${order.vendorPhone})` : ''}<br/>
            <strong>Dispatched Date:</strong> ${format(new Date(order.sentDate), 'dd MMM yyyy, hh:mm a')}
          </div>
          <div class="meta-col" style="text-align: right;">
            <strong>Expected Return:</strong> ${order.expectedReturnDate ? format(new Date(order.expectedReturnDate), 'dd MMM yyyy') : 'As agreed'}<br/>
            <strong>Status:</strong> ${order.status}<br/>
            <strong>Dispatched By:</strong> ${order.dispatchedBy?.name || 'Reception Staff'}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Item Description</th>
              <th class="text-center" style="width: 100px;">Sent (Pcs)</th>
              <th class="text-center" style="width: 100px;">Received (Pcs)</th>
              <th class="text-center" style="width: 90px;">Missing/Dmg</th>
              <th class="text-right" style="width: 100px;">Rate (₹)</th>
              <th class="text-right" style="width: 120px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${(order.items || []).map((it, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${it.itemName}</strong></td>
                <td class="text-center">${it.sentCount || 0}</td>
                <td class="text-center">${order.status === 'Received' ? (it.receivedCount || 0) : '-'}</td>
                <td class="text-center">${it.damagedOrMissingCount || 0}</td>
                <td class="text-right">₹${it.ratePerPiece || 0}</td>
                <td class="text-right">₹${it.totalCost || 0}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right">Total Pieces & Bill:</td>
              <td class="text-center">${order.totalPiecesSent || 0}</td>
              <td class="text-center">${order.status === 'Received' ? (order.totalPiecesReceived || 0) : '-'}</td>
              <td class="text-center">${order.totalPiecesMissing || 0}</td>
              <td class="text-right">Total:</td>
              <td class="text-right">₹${order.totalAmount || 0}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right"><strong>Amount Paid (${order.paymentMethod || 'Cash'}):</strong></td>
              <td class="text-right" style="color: green; font-weight: bold;">₹${order.paidAmount || 0}</td>
            </tr>
            <tr>
              <td colspan="6" class="text-right"><strong>Balance Due:</strong></td>
              <td class="text-right" style="color: ${order.totalAmount - order.paidAmount > 0 ? 'red' : 'green'}; font-weight: bold;">
                ₹${Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0))}
              </td>
            </tr>
          </tbody>
        </table>

        ${order.notes ? `<p style="font-size: 12px; font-style: italic;"><strong>Notes:</strong> ${order.notes}</p>` : ''}

        <div class="signatures">
          <div class="sig-box">Dispatched By (Hotel Staff)</div>
          <div class="sig-box">Vendor / Dhobi Signature</div>
          <div class="sig-box">Verified & Received By</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // If feature is disabled by Super Admin
  if (!isLaundryEnabled) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Shirt size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Laundry Module Disabled</h2>
        <p className="text-sm font-semibold text-gray-500 max-w-md mx-auto leading-relaxed">
          The Hotel Laundry & Linen Management feature has not been enabled for{' '}
          <strong className="text-gray-900">{currentPropertyDoc?.name || 'this property'}</strong>.
        </p>
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 max-w-md mx-auto flex items-center gap-2.5">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>Super Admin decides feature permissions for each property. Please ask your Super Admin to turn on "Laundry" from their control panel.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 size={18} /> {success}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-100">
              <Shirt size={20} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Laundry & Linen Management</h1>
              <p className="text-xs font-bold text-gray-400">Track hotel bedsheets, towels, dhobi batches & monthly expenses</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {user?.role === 'admin' && hostels.length > 1 && (
            <select
              value={selectedHostel}
              onChange={e => setSelectedHostel(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">🏢 All Properties</option>
              {hostels.map(h => (
                <option key={h._id} value={h._id}>{h.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={fetchOrders}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            onClick={openDispatchModal}
            className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> + Send to Laundry
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Clothes at Laundry */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-orange-600 uppercase tracking-wider">
            <span>With Vendor (Pending)</span>
            <span className="p-2 bg-orange-50 rounded-xl"><Shirt size={16} /></span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">
            {stats.clothesAtLaundry} <span className="text-xs font-bold text-gray-400">pcs</span>
          </p>
          <p className="text-[11px] font-semibold text-gray-500">Clothes currently at laundry/dhobi</p>
        </div>

        {/* 2. Monthly Expense */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-purple-600 uppercase tracking-wider">
            <span>This Month Expense</span>
            <span className="p-2 bg-purple-50 rounded-xl"><IndianRupee size={16} /></span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-700">
            ₹{stats.monthlyExpense.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-semibold text-gray-500">Auto-deducted from Hotel Net Profit</p>
        </div>

        {/* 3. Pending Vendor Bills */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-red-600 uppercase tracking-wider">
            <span>Pending Bills (Due)</span>
            <span className="p-2 bg-red-50 rounded-xl"><CreditCard size={16} /></span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600">
            ₹{stats.pendingBills.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-semibold text-gray-500">Unpaid balance to laundry vendors</p>
        </div>

        {/* 4. Total Batches */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <span>Total Batches</span>
            <span className="p-2 bg-emerald-50 rounded-xl"><PackageCheck size={16} /></span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900">
            {stats.totalBatches} <span className="text-xs font-bold text-gray-400">batches</span>
          </p>
          <p className="text-[11px] font-semibold text-gray-500">Total {stats.totalPiecesProcessed} pieces washed</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search vendor name, phone, or challan number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1 rounded-xl">
            {[
              { id: 'all', label: 'All Batches' },
              { id: 'Sent', label: 'With Vendor' },
              { id: 'Received', label: 'Received' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-black shadow-xs'
                    : 'text-gray-500 hover:text-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
          >
            <option value="all">All Payment Status</option>
            <option value="Unpaid">Unpaid Bills</option>
            <option value="Partial">Partially Paid</option>
            <option value="Paid">Fully Paid</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100 text-xs">
            <span className="font-bold text-gray-500">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold"
            />
            <span className="font-bold text-gray-500">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg font-bold"
            />
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="text-xs font-bold text-gray-400 mt-2">Loading laundry batches...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto">
              <Shirt size={28} />
            </div>
            <h3 className="text-base font-black text-gray-900">No Laundry Batches Found</h3>
            <p className="text-xs font-semibold text-gray-400 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                ? 'Try adjusting your search or filters to see older batches.'
                : 'Click "+ Send to Laundry" above to record the first lot of clothes given to dhobi.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Challan / Date</th>
                  <th className="px-4 py-3">Vendor / Dhobi</th>
                  <th className="px-4 py-3">Items Sent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bill & Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-semibold text-gray-700">
                {filteredOrders.map(order => {
                  const balance = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));
                  const isSent = order.status === 'Sent';

                  return (
                    <tr key={order._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Challan & Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            {order.orderNumber}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          Sent: {format(new Date(order.sentDate), 'dd MMM yyyy')}
                        </p>
                        {order.expectedReturnDate && isSent && (
                          <p className="text-[10px] text-orange-600 font-bold">
                            Due: {format(new Date(order.expectedReturnDate), 'dd MMM')}
                          </p>
                        )}
                        {order.receivedDate && !isSent && (
                          <p className="text-[10px] text-emerald-600 font-bold">
                            Recv: {format(new Date(order.receivedDate), 'dd MMM')}
                          </p>
                        )}
                      </td>

                      {/* Vendor */}
                      <td className="px-4 py-3.5">
                        <p className="font-black text-gray-900 text-sm">{order.vendorName}</p>
                        {order.vendorPhone && (
                          <a
                            href={`tel:${order.vendorPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-bold mt-0.5"
                          >
                            <Phone size={10} /> {order.vendorPhone}
                          </a>
                        )}
                        {order.hostel?.name && (
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                            🏢 {order.hostel.name}
                          </p>
                        )}
                      </td>

                      {/* Items */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-black text-gray-900 text-sm">
                            {order.totalPiecesSent} pcs
                          </span>
                          {order.totalPiecesMissing > 0 && (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                              {order.totalPiecesMissing} missing
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate" title={(order.items || []).map(it => `${it.itemName}: ${it.sentCount}`).join(', ')}>
                          {(order.items || []).slice(0, 3).map(it => `${it.itemName} (${it.sentCount})`).join(', ')}
                          {(order.items || []).length > 3 ? ` +${order.items.length - 3} more` : ''}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          isSent 
                            ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {isSent ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                          {isSent ? 'With Dhobi' : 'Received'}
                        </span>
                      </td>

                      {/* Bill & Paid */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">₹{order.totalAmount}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              order.paymentStatus === 'Paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.paymentStatus === 'Partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>Paid: <strong className="text-emerald-700 font-bold">₹{order.paidAmount}</strong></span>
                            {balance > 0 && (
                              <span className="text-red-600 font-bold">Due: ₹{balance}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSent && (
                            <button
                              type="button"
                              onClick={() => openReceiveModal(order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1"
                              title="Check received clothes count & bill"
                            >
                              <PackageCheck size={13} />
                              <span>Receive</span>
                            </button>
                          )}

                          {balance > 0 && (
                            <button
                              type="button"
                              onClick={() => openPayModal(order)}
                              className="px-2.5 py-1.5 bg-black hover:bg-gray-800 text-white font-black text-[11px] uppercase tracking-wider rounded-lg shadow-xs transition-all active:scale-95 flex items-center gap-1"
                              title="Pay vendor bill"
                            >
                              <IndianRupee size={12} />
                              <span>Pay</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => printChallan(order)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Print laundry challan slip"
                          >
                            <Printer size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(order._id)}
                            className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SEND CLOTHES TO LAUNDRY (DISPATCH)
         ───────────────────────────────────────────────────────────── */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setIsDispatchModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-xl">
                  <Shirt size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Send Clothes to Laundry (कपड़े भेजें)</h3>
                  <p className="text-[11px] font-bold text-gray-400">Record linen dispatched to vendor or dhobi</p>
                </div>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitDispatch} className="p-5 overflow-y-auto space-y-4 text-xs font-semibold">
              {/* Property & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(user?.role === 'admin' || user?.role === 'superadmin') && hostels.length > 1 && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hotel Property *</label>
                    <select
                      required
                      value={dispatchForm.hostel}
                      onChange={e => setDispatchForm({ ...dispatchForm, hostel: e.target.value })}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                    >
                      {hostels.map(h => (
                        <option key={h._id} value={h._id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dispatch Date *</label>
                  <input
                    type="date"
                    required
                    value={dispatchForm.sentDate}
                    onChange={e => setDispatchForm({ ...dispatchForm, sentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expected Return Date</label>
                  <input
                    type="date"
                    value={dispatchForm.expectedReturnDate}
                    onChange={e => setDispatchForm({ ...dispatchForm, expectedReturnDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* Quick Vendor Selection (1-Click Fill) */}
              {recentVendors.length > 0 && (
                <div className="bg-indigo-50/70 p-2.5 rounded-2xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                      ⚡ Regular Dhobi / Vendors (1-Click Fill)
                    </span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Click to select</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentVendors.map((v, i) => {
                      const isSelected = dispatchForm.vendorName?.trim().toLowerCase() === v.vendorName?.trim().toLowerCase();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setDispatchForm(prev => ({
                            ...prev,
                            vendorName: v.vendorName,
                            vendorPhone: v.vendorPhone || prev.vendorPhone
                          }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white hover:bg-indigo-50 text-gray-800 border-indigo-200 shadow-2xs'
                          }`}
                        >
                          <span>👤 {v.vendorName}</span>
                          {v.vendorPhone && <span className="opacity-75 text-[10px]">({v.vendorPhone})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vendor Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendor / Dhobi Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Dhobi / Bright Drycleaners"
                    value={dispatchForm.vendorName}
                    onChange={e => setDispatchForm({ ...dispatchForm, vendorName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Vendor Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={dispatchForm.vendorPhone}
                    onChange={e => setDispatchForm({ ...dispatchForm, vendorPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* Items Counter Grid */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-700">Linen Pieces Count (पीस संख्या)</h4>
                    <p className="text-[9px] text-gray-400 font-semibold">Standard hotel rates loaded automatically. Enter piece counts below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus size={11} /> Add Other Item
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {dispatchForm.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-200 shadow-2xs">
                      <div className="flex-1 min-w-0">
                        {PRESET_LINEN_ITEMS.some(p => p.itemName === it.itemName) ? (
                          <p className="font-bold text-gray-800 truncate">{it.itemName}</p>
                        ) : (
                          <input
                            placeholder="Item name"
                            value={it.itemName}
                            onChange={e => {
                              const arr = [...dispatchForm.items];
                              arr[idx].itemName = e.target.value;
                              setDispatchForm({ ...dispatchForm, items: arr });
                            }}
                            className="w-full px-1.5 py-0.5 border border-gray-200 rounded text-xs font-bold"
                          />
                        )}
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                          <span>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Rate"
                            value={it.ratePerPiece}
                            onChange={e => handleItemRateChange(idx, e.target.value)}
                            className="w-10 px-1 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-gray-600"
                          />
                          <span>/pc</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          placeholder="0 pcs"
                          value={it.sentCount}
                          onChange={e => handleItemCountChange(idx, e.target.value)}
                          className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-center font-black text-gray-900 focus:ring-1 focus:ring-black outline-none"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleItemCountChange(idx, (Number(it.sentCount) || 0) + 5)}
                            className="px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[9px] font-black transition-colors"
                            title="Add 5"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemCountChange(idx, (Number(it.sentCount) || 0) + 10)}
                            className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-black transition-colors"
                            title="Add 10"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-xs font-black">
                  <span>Total Pieces: {dispatchForm.items.reduce((s, it) => s + (Number(it.sentCount) || 0), 0)} pcs</span>
                  <span className="text-indigo-600">Calculated Bill: ₹{dispatchForm.items.reduce((s, it) => s + (Number(it.totalCost) || 0), 0)}</span>
                </div>
              </div>

              {/* Billing & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Agreed Total Bill (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={dispatchForm.totalAmount}
                    onChange={e => setDispatchForm({ ...dispatchForm, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Advance / Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (if paying right now)"
                    value={dispatchForm.paidAmount}
                    onChange={e => setDispatchForm({ ...dispatchForm, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>

              {Number(dispatchForm.paidAmount) > 0 && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                  <div className="flex gap-2">
                    {['Cash', 'UPI', 'Bank Transfer'].map(m => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setDispatchForm({ ...dispatchForm, paymentMethod: m })}
                        className={`flex-1 py-2 text-xs font-black rounded-xl border transition-all ${
                          dispatchForm.paymentMethod === m
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Notes / Remarks</label>
                <input
                  placeholder="e.g. Wash & iron urgently for weekend occupancy"
                  value={dispatchForm.notes}
                  onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Dispatching...' : 'Dispatch Laundry & Save ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: RECEIVE LAUNDRY (कपड़े वापस लेना)
         ───────────────────────────────────────────────────────────── */}
      {isReceiveModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setIsReceiveModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-auto overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-gray-900">Receive Clean Laundry ({selectedOrder.orderNumber})</h3>
                <p className="text-[11px] font-bold text-gray-400">Verify clean pieces count & missing items from {selectedOrder.vendorName}</p>
              </div>
              <button onClick={() => setIsReceiveModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReceive} className="p-5 overflow-y-auto space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Received Date</label>
                <input
                  type="date"
                  value={receiveForm.receivedDate}
                  onChange={e => setReceiveForm({ ...receiveForm, receivedDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                />
              </div>

              {/* Items Verification Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 font-black text-[10px] uppercase text-gray-500 grid grid-cols-12 gap-1 text-center">
                  <span className="col-span-5 text-left">Item</span>
                  <span className="col-span-2">Sent</span>
                  <span className="col-span-3">Received</span>
                  <span className="col-span-2">Missing</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {receiveForm.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 grid grid-cols-12 gap-1 items-center text-center">
                      <span className="col-span-5 text-left font-bold text-gray-900 truncate">{it.itemName}</span>
                      <span className="col-span-2 font-mono font-bold text-gray-500">{it.sentCount}</span>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min="0"
                          max={it.sentCount}
                          value={it.receivedCount}
                          onChange={e => {
                            const val = e.target.value;
                            const arr = [...receiveForm.items];
                            const rec = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                            const missing = val === '' ? 0 : Math.max(0, it.sentCount - (Number(rec) || 0));
                            arr[idx] = { ...arr[idx], receivedCount: rec, damagedOrMissingCount: missing };
                            setReceiveForm({ ...receiveForm, items: arr });
                          }}
                          className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-center font-bold text-gray-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="0"
                          value={it.damagedOrMissingCount}
                          onChange={e => {
                            const val = e.target.value;
                            const arr = [...receiveForm.items];
                            arr[idx].damagedOrMissingCount = val === '' ? '' : Math.max(0, parseInt(val) || 0);
                            setReceiveForm({ ...receiveForm, items: arr });
                          }}
                          className="w-full px-1.5 py-1 bg-red-50 border border-red-200 text-red-700 rounded text-center font-bold text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill & Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Final Bill Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={receiveForm.totalAmount}
                    onChange={e => setReceiveForm({ ...receiveForm, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={receiveForm.paidAmount}
                    onChange={e => setReceiveForm({ ...receiveForm, paidAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Received & Complete ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: RECORD PAYMENT
         ───────────────────────────────────────────────────────────── */}
      {isPayModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={() => setIsPayModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-base font-black text-gray-900">Pay Laundry Vendor</h3>
                <p className="text-[11px] font-bold text-gray-400">{selectedOrder.vendorName} • {selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitPay} className="p-5 space-y-4 text-xs font-semibold">
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between items-center font-bold">
                <span className="text-gray-500">Balance Due:</span>
                <span className="text-red-600 font-black text-base">
                  ₹{Math.max(0, (selectedOrder.totalAmount || 0) - (selectedOrder.paidAmount || 0))}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Amount Paying (₹)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payForm.amount}
                  onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-900 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {['Cash', 'UPI', 'Bank Transfer'].map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setPayForm({ ...payForm, paymentMethod: m })}
                      className={`flex-1 py-2 text-xs font-black rounded-xl border transition-all ${
                        payForm.paymentMethod === m
                          ? 'bg-black text-white border-black shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payForm.paymentMethod === 'UPI' && Number(payForm.amount) > 0 && selectedOrder.hostel && (
                <div className="pt-1">
                  <DynamicUpiQr
                    amount={Number(payForm.amount)}
                    guestName={`Laundry - ${selectedOrder.vendorName}`}
                    roomNumber={selectedOrder.orderNumber}
                    hostel={selectedOrder.hostel}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Note (optional)</label>
                <input
                  placeholder="e.g. Paid via PhonePe"
                  value={payForm.notes}
                  onChange={e => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Payment ✓'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Laundry;

