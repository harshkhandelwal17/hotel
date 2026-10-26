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
  Building,
  MessageSquare,
  Settings2,
  Sparkles,
  BookOpen,
  Layers,
  Boxes,
  CheckCheck,
  Send
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
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [ratesForm, setRatesForm] = useState({});

  // Active Main Tab: 'batches' | 'khata' | 'rotation'
  const [mainTab, setMainTab] = useState('batches');

  // Vendor Ledgers (Khata) & Linen Stock in Rotation state
  const [vendorLedgers, setVendorLedgers] = useState([]);
  const [linenRotation, setLinenRotation] = useState(null);

  // Lump-Sum Payment Modal State (Vendor Khata)
  const [isLumpSumModalOpen, setIsLumpSumModalOpen] = useState(false);
  const [lumpSumForm, setLumpSumForm] = useState({
    vendorName: '',
    vendorPhone: '',
    amount: '',
    paymentMethod: 'Cash',
    notes: '',
    balanceDue: 0
  });

  // Total Hotel Linen Inventory Modal State
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryForm, setInventoryForm] = useState({});

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
      if (res.data.vendorLedgers) setVendorLedgers(res.data.vendorLedgers);
      if (res.data.linenRotation) setLinenRotation(res.data.linenRotation);
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

  // Delayed / Overdue Batches Count
  const overdueBatchesCount = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return filteredOrders.filter(o => o.status === 'Sent' && o.expectedReturnDate && new Date(o.expectedReturnDate) < todayStart).length;
  }, [filteredOrders]);

  // Clean Linen Recovery / Loss Rate (%)
  const recoveryRate = useMemo(() => {
    if (stats.totalPiecesProcessed === 0) return '100';
    const totalMissing = filteredOrders.reduce((s, o) => s + (o.totalPiecesMissing || 0), 0);
    const rate = ((stats.totalPiecesProcessed - totalMissing) / stats.totalPiecesProcessed) * 100;
    return Math.max(0, rate).toFixed(1);
  }, [stats.totalPiecesProcessed, filteredOrders]);

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

  // 📲 WhatsApp Share Slip to Vendor
  const shareViaWhatsApp = (order) => {
    const rawPhone = (order.vendorPhone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      return flash('No phone number saved for this vendor', true);
    }
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const hotelName = order.hostel?.name || activeHostel?.name || 'Hotel';
    const dateStr = format(new Date(order.sentDate), 'dd MMM yyyy');

    const itemsSummary = (order.items || [])
      .filter(it => (Number(it.sentCount) || 0) > 0)
      .map(it => `• ${it.itemName}: *${it.sentCount} pcs* @ ₹${it.ratePerPiece}/pc = ₹${it.totalCost}`)
      .join('\n');

    const due = Math.max(0, (order.totalAmount || 0) - (order.paidAmount || 0));

    const msg = `🧺 *${hotelName.toUpperCase()} - LAUNDRY DISPATCH SLIP*
📄 *Challan No:* ${order.orderNumber}
📅 *Date:* ${dateStr}
👤 *Vendor / Dhobi:* ${order.vendorName}

📦 *Linen Given:*
${itemsSummary}
--------------------------------
🔢 *Total Pieces:* ${order.totalPiecesSent} pcs
💰 *Bill Amount:* ₹${order.totalAmount}
💵 *Paid / Advance:* ₹${order.paidAmount || 0}
⚠️ *Balance Due:* ₹${due}
${order.expectedReturnDate ? `⏰ *Expected Delivery:* ${format(new Date(order.expectedReturnDate), 'dd MMM yyyy')}\n` : ''}
_Please deliver clean & ironed as agreed. Thank you!_`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Open Standard Rates Setup Modal
  const openRatesModal = () => {
    const initialRates = {};
    PRESET_LINEN_ITEMS.forEach(it => {
      initialRates[it.itemName] = (defaultRates && defaultRates[it.itemName] !== undefined)
        ? defaultRates[it.itemName]
        : it.defaultRate;
    });
    setRatesForm(initialRates);
    setIsRatesModalOpen(true);
  };

  // Submit Standard Rates
  const handleSaveRates = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const targetHostel = user?.role === 'receptionist'
        ? (user?.assignedHostel?._id || user?.assignedHostel)
        : (selectedHostel !== 'all' ? selectedHostel : hostels[0]?._id);

      await axios.put(`${API}/api/laundry/settings`, {
        hostel: targetHostel,
        defaultRates: ratesForm
      });
      setDefaultRates(ratesForm);
      flash('✅ Standard rates saved permanently for this hotel!');
      setIsRatesModalOpen(false);
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to save rates', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Open Lump-Sum Payment Modal for Dhobi Khata
  const openLumpSumModal = (ledger) => {
    setLumpSumForm({
      vendorName: ledger.vendorName,
      vendorPhone: ledger.vendorPhone || '',
      amount: ledger.totalDue > 0 ? ledger.totalDue : '',
      paymentMethod: 'Cash',
      notes: `Lump-sum settlement for ${ledger.unpaidBatchesCount || 0} batches`,
      balanceDue: ledger.totalDue || 0
    });
    setIsLumpSumModalOpen(true);
  };

  // Submit Lump-Sum Payment (FIFO across unpaid batches)
  const handleSettleLumpSum = async (e) => {
    e.preventDefault();
    if (!Number(lumpSumForm.amount) || Number(lumpSumForm.amount) <= 0) {
      return flash('Please enter a valid payment amount', true);
    }
    try {
      setSubmitting(true);
      const targetHostel = user?.role === 'receptionist'
        ? (user?.assignedHostel?._id || user?.assignedHostel)
        : (selectedHostel !== 'all' ? selectedHostel : hostels[0]?._id);

      const res = await axios.post(`${API}/api/laundry/vendor-payment`, {
        hostel: targetHostel,
        vendorName: lumpSumForm.vendorName,
        amount: Number(lumpSumForm.amount),
        paymentMethod: lumpSumForm.paymentMethod,
        notes: lumpSumForm.notes
      });

      flash(`✅ ${res.data.message}`);
      setIsLumpSumModalOpen(false);
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to record vendor payment', true);
    } finally {
      setSubmitting(false);
    }
  };

  // 📲 Send Dhobi Khata Statement on WhatsApp
  const shareVendorStatementWhatsApp = (ledger) => {
    const rawPhone = (ledger.vendorPhone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      return flash('No phone number saved for this vendor. Please edit vendor phone first.', true);
    }
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const hotelName = activeHostel?.name || currentPropertyDoc?.name || 'Hotel';
    const todayStr = format(new Date(), 'dd MMM yyyy');

    const msg = `🧺 *${hotelName.toUpperCase()} - DHOBI KHATA STATEMENT*
👤 *Vendor / Dhobi:* ${ledger.vendorName}
📅 *Date:* ${todayStr}
--------------------------------
🔢 *Total Batches Washed:* ${ledger.totalBatches}
👕 *Total Clothes Processed:* ${ledger.totalPieces} pcs
💰 *Total Billed:* ₹${ledger.totalBilled.toLocaleString('en-IN')}
💵 *Total Paid Received:* ₹${ledger.totalPaid.toLocaleString('en-IN')}
${ledger.totalDue > 0 ? `⚠️ *Outstanding Balance Due:* *₹${ledger.totalDue.toLocaleString('en-IN')}*` : `✅ *All Bills Cleared (Nil Balance)*`}
--------------------------------
${ledger.lastPaymentDate ? `🕒 *Last Payment:* ${format(new Date(ledger.lastPaymentDate), 'dd MMM yyyy')}\n` : ''}
_Account reconciled with ${hotelName} Reception. Thank you!_`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Open Inventory Modal
  const openInventoryModal = () => {
    const current = {};
    (linenRotation?.items || []).forEach(it => {
      current[it.itemName] = it.totalStock;
    });
    setInventoryForm(current);
    setIsInventoryModalOpen(true);
  };

  // Submit Updated Linen Inventory
  const handleSaveInventory = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const targetHostel = user?.role === 'receptionist'
        ? (user?.assignedHostel?._id || user?.assignedHostel)
        : (selectedHostel !== 'all' ? selectedHostel : hostels[0]?._id);

      await axios.put(`${API}/api/laundry/settings`, {
        hostel: targetHostel,
        linenInventory: inventoryForm
      });
      flash('✅ Total hotel linen inventory updated successfully!');
      setIsInventoryModalOpen(false);
      fetchOrders();
    } catch (err) {
      flash(err.response?.data?.message || 'Failed to update linen inventory', true);
    } finally {
      setSubmitting(false);
    }
  };

  // 🚨 Expedite Low Stock Linen with Dhobi on WhatsApp
  const shareExpediteWhatsApp = (item) => {
    const rawPhone = (defaultVendor?.vendorPhone || (recentVendors[0]?.vendorPhone) || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      return flash('Please set a phone number for the vendor first', true);
    }
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const hotelName = activeHostel?.name || currentPropertyDoc?.name || 'Hotel';
    const vendorName = defaultVendor?.vendorName || recentVendors[0]?.vendorName || 'Dhobi';

    const msg = `🚨 *URGENT - ${hotelName.toUpperCase()} LINEN SHORTAGE ALERT*
👤 *Vendor:* ${vendorName}

Hotel me *${item.itemName}* ka clean stock critically low hai:
• Store me bache hue: *${item.cleanInStore} pcs*
• Dhobi ke paas dhulne gaye: *${item.withDhobi} pcs*

⚠️ Kripya is item ke clean kapde aaj shaam tak hotel bhej dein taaki rooms me shortage na ho. Dhanyawad!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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
            onClick={openRatesModal}
            className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5"
            title="Configure standard rates per linen item"
          >
            <Settings2 size={15} />
            <span className="hidden sm:inline">Rates Setup</span>
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

      {/* 3 Main Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-xs">
        <button
          type="button"
          onClick={() => setMainTab('batches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            mainTab === 'batches'
              ? 'bg-black text-white shadow-md'
              : 'text-gray-600 hover:text-black hover:bg-white/60'
          }`}
        >
          <Shirt size={15} />
          <span>🧺 Laundry Batches</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${mainTab === 'batches' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
            {filteredOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('khata')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            mainTab === 'khata'
              ? 'bg-black text-white shadow-md'
              : 'text-gray-600 hover:text-black hover:bg-white/60'
          }`}
        >
          <BookOpen size={15} />
          <span>📒 Dhobi Khata (Ledger)</span>
          {stats.pendingBills > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold animate-pulse">
              ₹{stats.pendingBills.toLocaleString('en-IN')} Due
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMainTab('rotation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
            mainTab === 'rotation'
              ? 'bg-black text-white shadow-md'
              : 'text-gray-600 hover:text-black hover:bg-white/60'
          }`}
        >
          <Layers size={15} />
          <span>📊 Linen in Rotation</span>
          {linenRotation?.totals?.lowStockAlertCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold animate-pulse">
              ⚠️ {linenRotation.totals.lowStockAlertCount} Low
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
              {linenRotation?.totals?.totalCleanPieces || 0} Clean Ready
            </span>
          )}
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Clothes at Laundry */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-orange-600 uppercase tracking-wider">
            <span>With Vendor (Pending)</span>
            <span className="p-2 bg-orange-50 rounded-xl"><Shirt size={16} /></span>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl sm:text-3xl font-black text-gray-900">
              {stats.clothesAtLaundry} <span className="text-xs font-bold text-gray-400">pcs</span>
            </p>
            {overdueBatchesCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md animate-pulse border border-red-200">
                ⚠️ {overdueBatchesCount} Overdue
              </span>
            )}
          </div>
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
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl sm:text-3xl font-black text-gray-900">
              {stats.totalBatches} <span className="text-xs font-bold text-gray-400">batches</span>
            </p>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md border border-emerald-200">
              🛡️ {recoveryRate}% Return
            </span>
          </div>
          <p className="text-[11px] font-semibold text-gray-500">Total {stats.totalPiecesProcessed} pieces washed</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: LAUNDRY BATCHES & CHALLANS
         ───────────────────────────────────────────────────────────── */}
      {mainTab === 'batches' && (
        <div className="space-y-4">
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
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            isSent 
                              ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isSent ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                            {isSent ? 'With Dhobi' : 'Received'}
                          </span>

                          {isSent && order.expectedReturnDate && new Date(order.expectedReturnDate) < startOfDay(new Date()) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-red-100 text-red-700 border border-red-200 animate-pulse">
                              <AlertCircle size={10} /> Overdue
                            </span>
                          )}
                        </div>
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
                            onClick={() => shareViaWhatsApp(order)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Send Challan Slip on WhatsApp"
                          >
                            <MessageSquare size={15} />
                          </button>

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
      </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: DHOBI KHATA / VENDOR LEDGER (लंप-सम पेमेंट)
         ───────────────────────────────────────────────────────────── */}
      {mainTab === 'khata' && (
        <div className="space-y-6">
          {/* Khata Summary Banner */}
          <div className="bg-gradient-to-r from-gray-900 to-black text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BookOpen size={18} className="text-amber-400" />
                <h3 className="text-lg font-black tracking-tight">Dhobi Khata & Vendor Ledger</h3>
              </div>
              <p className="text-xs text-gray-400 font-semibold max-w-lg">
                Track pending balances per vendor. Settle monthly or weekly accounts with 1-click lump-sum payments, and send reconciled statements on WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Total Khata Balance Due</p>
                <p className="text-xl font-black text-red-400">₹{stats.pendingBills.toLocaleString('en-IN')}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] uppercase font-bold text-gray-400">Total Paid (Lifetime)</p>
                <p className="text-xl font-black text-emerald-400">
                  ₹{(orders.reduce((s, o) => s + (Number(o.paidAmount) || 0), 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>

          {/* Vendor Cards Grid */}
          {vendorLedgers.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center space-y-2">
              <BookOpen size={36} className="mx-auto text-gray-300" />
              <p className="font-black text-gray-700">No vendor ledger records found</p>
              <p className="text-xs text-gray-400">Send clothes to a laundry vendor to automatically initiate their khata ledger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendorLedgers.map((ledger, idx) => {
                const isAllCleared = ledger.totalDue <= 0;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-3xl border border-gray-100 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Vendor Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                        <div>
                          <h4 className="text-base font-black text-gray-900">{ledger.vendorName}</h4>
                          {ledger.vendorPhone ? (
                            <a
                              href={`tel:${ledger.vendorPhone}`}
                              className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 mt-0.5"
                            >
                              <Phone size={11} /> {ledger.vendorPhone}
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">No phone number</span>
                          )}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isAllCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700 animate-pulse'
                        }`}>
                          {isAllCleared ? 'All Cleared' : `₹${ledger.totalDue.toLocaleString('en-IN')} Due`}
                        </span>
                      </div>

                      {/* Vendor Stats Grid */}
                      <div className="grid grid-cols-2 gap-2.5 pt-3 text-xs">
                        <div className="p-2.5 bg-gray-50 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Batches (Pcs)</p>
                          <p className="text-sm font-black text-gray-900 mt-0.5">{ledger.totalBatches} ({ledger.totalPieces} pcs)</p>
                        </div>
                        <div className="p-2.5 bg-gray-50 rounded-xl">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Billed</p>
                          <p className="text-sm font-black text-gray-900 mt-0.5">₹{ledger.totalBilled.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2.5 bg-emerald-50/60 rounded-xl">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase">Paid So Far</p>
                          <p className="text-sm font-black text-emerald-800 mt-0.5">₹{ledger.totalPaid.toLocaleString('en-IN')}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${ledger.totalDue > 0 ? 'bg-red-50/80 border border-red-200' : 'bg-gray-50'}`}>
                          <p className={`text-[10px] font-bold uppercase ${ledger.totalDue > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                            Balance Due
                          </p>
                          <p className={`text-sm font-black mt-0.5 ${ledger.totalDue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ₹{ledger.totalDue.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {ledger.unpaidBatchesCount > 0 && (
                        <p className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg mt-3 flex items-center gap-1.5">
                          <Clock size={12} />
                          <span>{ledger.unpaidBatchesCount} batches have pending balance</span>
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
                      {ledger.totalDue > 0 && (
                        <button
                          type="button"
                          onClick={() => openLumpSumModal(ledger)}
                          className="w-full py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CreditCard size={14} />
                          <span>Settle / Pay Lump-sum (₹{ledger.totalDue.toLocaleString('en-IN')})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => shareVendorStatementWhatsApp(ledger)}
                        className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare size={14} className="text-emerald-600" />
                        <span>Send WhatsApp Statement</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: LINEN STOCK IN ROTATION (सर्कुलेशन व स्टॉक)
         ───────────────────────────────────────────────────────────── */}
      {mainTab === 'rotation' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers size={18} className="text-indigo-600" />
                <h3 className="text-lg font-black tracking-tight text-gray-900">Linen Stock in Circulation</h3>
              </div>
              <p className="text-xs text-gray-500 font-semibold">
                Live distribution of hotel linen: Clean in Almirah (Ready), In Active Rooms (In Use), and Sent to Dhobi (Washing).
              </p>
            </div>

            <button
              type="button"
              onClick={openInventoryModal}
              className="px-4 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 shrink-0"
            >
              <Boxes size={15} />
              <span>Update Total Stock</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">🧼 Clean in Store (Ready)</p>
              <p className="text-2xl font-black text-emerald-900 mt-1">
                {linenRotation?.totals?.totalCleanPieces || 0} <span className="text-xs font-bold text-emerald-700">pcs</span>
              </p>
              <p className="text-[11px] font-medium text-emerald-700 mt-0.5">Ready for fresh check-in</p>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">🛏️ In Rooms (In Use)</p>
              <p className="text-2xl font-black text-blue-900 mt-1">
                {linenRotation?.totals?.totalInRoomsPieces || 0} <span className="text-xs font-bold text-blue-700">pcs</span>
              </p>
              <p className="text-[11px] font-medium text-blue-700 mt-0.5">Across {linenRotation?.activeRoomsInUse || 0} occupied rooms</p>
            </div>

            <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl">
              <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">🧺 With Dhobi (Washing)</p>
              <p className="text-2xl font-black text-orange-900 mt-1">
                {linenRotation?.totals?.totalWithDhobiPieces || 0} <span className="text-xs font-bold text-orange-700">pcs</span>
              </p>
              <p className="text-[11px] font-medium text-orange-700 mt-0.5">Currently at laundry</p>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">📦 Total Owned Stock</p>
              <p className="text-2xl font-black text-gray-900 mt-1">
                {linenRotation?.totals?.totalLinenPieces || 0} <span className="text-xs font-bold text-gray-400">pcs</span>
              </p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">Hotel inventory asset</p>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(linenRotation?.items || []).map((item, idx) => (
              <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{item.itemName}</h4>
                    <p className="text-[11px] text-gray-400 font-bold">Total Property Stock: {item.totalStock} pcs</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    item.isLow
                      ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {item.isLow ? `⚠️ Low Clean Stock (${item.cleanInStore} left)` : `🟢 Safe (${item.cleanInStore} ready)`}
                  </span>
                </div>

                {/* Segmented Stock Bar */}
                <div className="space-y-1">
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${item.totalStock > 0 ? (item.cleanInStore / item.totalStock) * 100 : 0}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Clean in store: ${item.cleanInStore}`}
                    />
                    <div
                      style={{ width: `${item.totalStock > 0 ? (item.inRooms / item.totalStock) * 100 : 0}%` }}
                      className="bg-blue-500 transition-all"
                      title={`In rooms: ${item.inRooms}`}
                    />
                    <div
                      style={{ width: `${item.totalStock > 0 ? (item.withDhobi / item.totalStock) * 100 : 0}%` }}
                      className="bg-orange-500 transition-all"
                      title={`With Dhobi: ${item.withDhobi}`}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-gray-500 pt-1">
                    <span className="text-emerald-700">🧼 Clean: {item.cleanInStore}</span>
                    <span className="text-blue-700">🛏️ Rooms: {item.inRooms}</span>
                    <span className="text-orange-700">🧺 Dhobi: {item.withDhobi}</span>
                  </div>
                </div>

                {/* Low Stock Warning & WhatsApp Quick Expedite */}
                {item.isLow && (
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-red-600">
                      Only {item.cleanInStore} pcs clean in store!
                    </p>
                    <button
                      type="button"
                      onClick={() => shareExpediteWhatsApp(item)}
                      className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-xs"
                      title="Alert Dhobi on WhatsApp to expedite this item"
                    >
                      <Send size={11} />
                      <span>WhatsApp Dhobi</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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

              {/* Missing / Damaged Items Alert & Deduction Helper */}
              {(() => {
                const totalMissing = receiveForm.items.reduce((s, it) => s + (Number(it.damagedOrMissingCount) || 0), 0);
                if (totalMissing <= 0) return null;
                const estimatedDeduction = receiveForm.items.reduce((s, it) => {
                  const missing = Number(it.damagedOrMissingCount) || 0;
                  const rate = Number(it.ratePerPiece) || 0;
                  return s + (missing * rate);
                }, 0);

                return (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-red-700">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={15} />
                        {totalMissing} pieces missing / damaged!
                      </span>
                      <span>Est. Loss: ₹{estimatedDeduction}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const currentBill = Number(receiveForm.totalAmount) || 0;
                          const newBill = Math.max(0, currentBill - estimatedDeduction);
                          setReceiveForm(prev => ({ ...prev, totalAmount: newBill }));
                          flash(`Deducted ₹${estimatedDeduction} from bill. New bill: ₹${newBill}`);
                        }}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black rounded-lg transition-all active:scale-95 shadow-xs"
                      >
                        ✂️ Deduct ₹{estimatedDeduction} from Bill
                      </button>

                      {selectedOrder.vendorPhone && (
                        <button
                          type="button"
                          onClick={() => {
                            const rawPhone = (selectedOrder.vendorPhone || '').replace(/[^0-9]/g, '');
                            const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
                            const missingList = receiveForm.items
                              .filter(it => (Number(it.damagedOrMissingCount) || 0) > 0)
                              .map(it => `• ${it.itemName}: *${it.damagedOrMissingCount} missing*`)
                              .join('\n');
                            const msg = `⚠️ *${selectedOrder.hostel?.name || 'Hotel'} - MISSING LINEN ALERT*\n\n📄 Challan: *${selectedOrder.orderNumber}*\n👤 Dhobi / Vendor: *${selectedOrder.vendorName}*\n\nClean laundry check karte waqt ye items missing / damaged mile hain:\n${missingList}\n\nKripya turant check karke bache hue kapde bhej dein. Dhanyawad!`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg transition-all active:scale-95 flex items-center gap-1 shadow-xs"
                        >
                          <MessageSquare size={13} />
                          <span>Alert Dhobi on WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

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

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: STANDARD RATES SETUP (स्टैंडर्ड रेट्स सेटिंग)
         ───────────────────────────────────────────────────────────── */}
      {isRatesModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setIsRatesModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-xl">
                  <Settings2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Standard Linen Rates</h3>
                  <p className="text-[11px] font-bold text-gray-400">Fixed rate per piece for quick 1-click dispatch</p>
                </div>
              </div>
              <button onClick={() => setIsRatesModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRates} className="p-5 space-y-4 text-xs font-semibold overflow-y-auto">
              <p className="text-gray-500 text-xs">
                Set standard washing/ironing rates per item. Whenever you send clothes, these rates will auto-fill automatically.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {PRESET_LINEN_ITEMS.map(it => (
                  <div key={it.itemName} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-xs">{it.itemName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={ratesForm[it.itemName] ?? it.defaultRate}
                        onChange={e => setRatesForm({ ...ratesForm, [it.itemName]: Number(e.target.value) || 0 })}
                        className="w-16 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-black text-xs text-gray-900 outline-none focus:ring-1 focus:ring-black"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving Rates...' : 'Save Standard Rates ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: SETTLE DHOBI KHATA / LUMP-SUM PAYMENT
         ───────────────────────────────────────────────────────────── */}
      {isLumpSumModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3" onClick={() => setIsLumpSumModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-xl">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Settle Dhobi Khata</h3>
                  <p className="text-[11px] font-bold text-gray-400">{lumpSumForm.vendorName}</p>
                </div>
              </div>
              <button onClick={() => setIsLumpSumModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSettleLumpSum} className="p-5 space-y-4 text-xs font-semibold">
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex justify-between items-center">
                <span className="text-red-700 font-bold">Total Khata Balance Due:</span>
                <span className="text-red-600 font-black text-lg">₹{lumpSumForm.balanceDue.toLocaleString('en-IN')}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Paying Amount (₹)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={lumpSumForm.amount}
                    onChange={e => setLumpSumForm({ ...lumpSumForm, amount: e.target.value })}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-900 text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                  {lumpSumForm.balanceDue > 0 && (
                    <button
                      type="button"
                      onClick={() => setLumpSumForm({ ...lumpSumForm, amount: lumpSumForm.balanceDue })}
                      className="px-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-black text-gray-700"
                    >
                      Full Due
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Payment Method</label>
                <div className="flex gap-2">
                  {['Cash', 'UPI', 'Bank Transfer'].map(m => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setLumpSumForm({ ...lumpSumForm, paymentMethod: m })}
                      className={`flex-1 py-2 text-xs font-black rounded-xl border transition-all ${
                        lumpSumForm.paymentMethod === m
                          ? 'bg-black text-white border-black shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {lumpSumForm.paymentMethod === 'UPI' && Number(lumpSumForm.amount) > 0 && currentPropertyDoc && (
                <div className="pt-1">
                  <DynamicUpiQr
                    amount={Number(lumpSumForm.amount)}
                    guestName={`Laundry - ${lumpSumForm.vendorName}`}
                    roomNumber="KHATA-SETTLEMENT"
                    hostel={currentPropertyDoc}
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Remarks / Reference (optional)</label>
                <input
                  placeholder="e.g. Cleared via GPay / Cheque #1042"
                  value={lumpSumForm.notes}
                  onChange={e => setLumpSumForm({ ...lumpSumForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Settling...' : 'Confirm Lump-Sum Settlement ✓'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 6: UPDATE TOTAL HOTEL LINEN INVENTORY
         ───────────────────────────────────────────────────────────── */}
      {isInventoryModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setIsInventoryModalOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-auto overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-xl">
                  <Boxes size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Total Linen Inventory</h3>
                  <p className="text-[11px] font-bold text-gray-400">Total count of linen pieces owned by this property</p>
                </div>
              </div>
              <button onClick={() => setIsInventoryModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInventory} className="p-5 space-y-4 text-xs font-semibold overflow-y-auto">
              <p className="text-gray-500 text-xs">
                Set total inventory count for each linen type. The system uses these totals to calculate live clean stock availability in the store.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {(linenRotation?.items || []).map(it => (
                  <div key={it.itemName} className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-xs">{it.itemName}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={inventoryForm[it.itemName] ?? it.totalStock}
                        onChange={e => setInventoryForm({ ...inventoryForm, [it.itemName]: Number(e.target.value) || 0 })}
                        className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-center font-black text-xs text-gray-900 outline-none focus:ring-1 focus:ring-black"
                      />
                      <span className="text-[10px] text-gray-400 font-bold">pcs</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? 'Saving Inventory...' : 'Save Linen Inventory ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Laundry;

