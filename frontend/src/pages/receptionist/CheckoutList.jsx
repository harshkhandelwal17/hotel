import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { format, isPast, isToday } from 'date-fns';
import CheckoutModal from './CheckoutModal';
import StayManageModal from './StayManageModal';
import MergedCorporateInvoiceModal from '../../components/MergedCorporateInvoiceModal';
import { Users, Clock, Download, AlertTriangle, Search, ChevronRight, ChevronDown, Phone, MessageSquare, Building2, Check, CheckCircle2, Printer, Share2, X } from 'lucide-react';
import { printInvoice, printMergedInvoice, getMergedInvoiceWhatsAppUrl } from '../../utils/invoice';
import { apiCache } from '../../utils/apiCache';
import { useLanguage } from '../../context/LanguageContext';
import { getStayWhatsAppUrl } from '../../utils/whatsapp';

const CheckoutList = () => {
  const { t, isHindi } = useLanguage();
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStay, setSelectedStay] = useState(null);
  const [managedStay, setManagedStay] = useState(null);
  const [selectedStayIdsForMerge, setSelectedStayIdsForMerge] = useState([]);
  const [showMergedModal, setShowMergedModal] = useState(false);
  const [groupModalStay, setGroupModalStay] = useState(null);
  const [checkoutSuccessToast, setCheckoutSuccessToast] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'overdue', 'today', 'history'
  const [historyStays, setHistoryStays] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const initialStayParamRef = useRef(searchParams.get('stay'));

  const handlePrintGroupBill = async (stay) => {
    if (!stay?.groupId) {
      printInvoice(stay, stay.payments || []);
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/group/${stay.groupId}`);
      const groupStays = res.data?.data?.stays || [];
      const groupPayments = res.data?.data?.payments || [];
      if (groupStays.length > 0) {
        printMergedInvoice(groupStays, groupPayments);
      } else {
        printInvoice(stay, stay.payments || []);
      }
    } catch (e) {
      console.warn('Direct print merged error, falling back to modal:', e);
      setGroupModalStay(stay);
    }
  };

  const handleShareGroupWhatsApp = async (stay) => {
    if (!stay?.groupId) {
      const url = getStayWhatsAppUrl(stay, 'bill');
      if (url) window.open(url, '_blank');
      return;
    }
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/group/${stay.groupId}`);
      const groupStays = res.data?.data?.stays || [];
      const groupPayments = res.data?.data?.payments || [];
      const url = getMergedInvoiceWhatsAppUrl(groupStays, { payments: groupPayments });
      if (url) {
        window.open(url, '_blank');
      } else {
        const singleUrl = getStayWhatsAppUrl(stay, 'bill');
        if (singleUrl) window.open(singleUrl, '_blank');
      }
    } catch (e) {
      const singleUrl = getStayWhatsAppUrl(stay, 'bill');
      if (singleUrl) window.open(singleUrl, '_blank');
    }
  };

  useEffect(() => {
    // Clean deep link param from browser address bar immediately so it never re-triggers
    if (searchParams.get('stay')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => { fetchStays(); }, [globalProperty]);
  useEffect(() => {
    const handleUpdate = () => fetchStays(false);
    window.addEventListener('propertyChanged', handleUpdate);
    window.addEventListener('hotelDataInvalidated', handleUpdate);
    return () => {
      window.removeEventListener('propertyChanged', handleUpdate);
      window.removeEventListener('hotelDataInvalidated', handleUpdate);
    };
  }, [globalProperty]);

  async function fetchStays(forceSpinner = false) {
    const cacheKey = `stays_active_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setStays(cached);
      setLoading(false); // Instant render in 0ms!

      if (initialStayParamRef.current) {
        const found = cached.find(s => s._id === initialStayParamRef.current);
        if (found) {
          setManagedStay(found);
          initialStayParamRef.current = null;
        }
      }
    } else if (!cached) {
      setLoading(true);
    }

    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays?status=Active${propQuery}`);
      const newStays = res.data.data || [];
      apiCache.set(cacheKey, newStays);
      setStays(newStays);

      // Deep link from Dashboard / Rooms: /checkouts?stay=<id> (consume once)
      if (initialStayParamRef.current) {
        const found = newStays.find(s => s._id === initialStayParamRef.current);
        if (found) {
          setManagedStay(found);
          initialStayParamRef.current = null;
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  async function fetchHistoryStays(forceSpinner = false) {
    const cacheKey = `stays_history_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setHistoryStays(cached);
      setLoadingHistory(false);
    } else {
      setLoadingHistory(true);
    }
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays?status=Checked Out${propQuery}`);
      const checkedOut = res.data.data || [];
      apiCache.set(cacheKey, checkedOut);
      setHistoryStays(checkedOut);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  }

  useEffect(() => {
    if (filter === 'history') {
      fetchHistoryStays();
    }
  }, [filter, globalProperty]);


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

  const toggleMergeSelection = (id) => {
    setSelectedStayIdsForMerge(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // State to track expanded multi-room group cards in checkout history
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Group checkout history so multi-room corporate/family groups collapse into 1 single master card
  const groupedHistory = useMemo(() => {
    const groupMap = new Map();
    const result = [];

    historyStays.forEach(stay => {
      if (stay.groupId) {
        if (!groupMap.has(stay.groupId)) {
          const groupEntry = {
            _id: `group-${stay.groupId}`,
            groupId: stay.groupId,
            isGroup: true,
            groupName: stay.groupName || 'Corporate Folio',
            primaryGuest: stay.guest,
            companyName: stay.companyName || stay.guest?.companyName || '',
            gstin: stay.gstin || stay.guest?.gstin || '',
            stays: [],
            roomNumbers: [],
            totalAmount: 0,
            paidAmount: 0,
            actualCheckOutDate: stay.actualCheckOutDate || stay.expectedCheckOutDate,
            primaryStay: stay
          };
          groupMap.set(stay.groupId, groupEntry);
          result.push(groupEntry);
        }
        const g = groupMap.get(stay.groupId);
        g.stays.push(stay);
        const rn = stay.room?.roomNumber;
        if (rn && !g.roomNumbers.includes(rn)) {
          g.roomNumbers.push(rn);
        }
        g.totalAmount += Number(stay.totalAmount) || 0;
        g.paidAmount += Number(stay.paidAmount) || 0;
        if (stay.isGroupLeader || (stay.guest?.mobileNumber && !g.primaryGuest?.mobileNumber)) {
          g.primaryGuest = stay.guest;
          g.primaryStay = stay;
        }
        if (stay.companyName && !g.companyName) g.companyName = stay.companyName;
        if (stay.actualCheckOutDate && new Date(stay.actualCheckOutDate) > new Date(g.actualCheckOutDate)) {
          g.actualCheckOutDate = stay.actualCheckOutDate;
        }
      } else {
        result.push({
          ...stay,
          isGroup: false
        });
      }
    });

    return result;
  }, [historyStays]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groupedHistory;

    return groupedHistory.filter(item => {
      if (item.isGroup) {
        const matchesGuest = item.primaryGuest?.fullName?.toLowerCase().includes(term);
        const matchesPhone = item.primaryGuest?.mobileNumber?.includes(term);
        const matchesGroup = item.groupName?.toLowerCase().includes(term);
        const matchesCompany = item.companyName?.toLowerCase().includes(term);
        const matchesRoom = item.roomNumbers.some(rn => rn.toLowerCase().includes(term));
        const matchesSubStay = item.stays.some(s => 
          s.guest?.fullName?.toLowerCase().includes(term) ||
          s.guest?.mobileNumber?.includes(term) ||
          s.room?.roomNumber?.toLowerCase().includes(term)
        );
        return matchesGuest || matchesPhone || matchesGroup || matchesCompany || matchesRoom || matchesSubStay;
      }
      return (
        item.guest?.fullName?.toLowerCase().includes(term) ||
        item.guest?.mobileNumber?.includes(term) ||
        item.room?.roomNumber?.toLowerCase().includes(term) ||
        item.groupName?.toLowerCase().includes(term)
      );
    });
  }, [groupedHistory, search]);

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
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{t('checkout.title', 'In-House Guests')}</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">{t('checkout.subtitle', 'Tap a guest to add charges, take payment, change room, extend stay or check out.')}</p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowMergedModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Merge 2 or more rooms into a single consolidated corporate GST invoice"
            >
              <Building2 size={14} className="text-emerald-400" />
              <span>Corporate / Merged Bill</span>
              {selectedStayIdsForMerge.length > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 rounded-full text-[10px] font-black">
                  {selectedStayIdsForMerge.length}
                </span>
              )}
            </button>
            <button onClick={downloadCSV} className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer">
              <Download size={14} /> {t('common.export', 'Export')} CSV
            </button>
          </div>
        </div>

        {/* Compact Modern Search Bar */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search size={15} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder={isHindi ? "कमरा नंबर या अतिथि के नाम से खोजें..." : "Search by Room No. (e.g. 101) or Guest Name..."}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {[
          { key: 'all', label: `${t('common.all', 'All Active')} (${stays.length})` },
          { key: 'overdue', label: `${t('common.overdue', 'Overdue')} (${overdueCt})`, warn: overdueCt > 0 },
          { key: 'today', label: `${t('common.dueToday', 'Checkout Today')} (${todayCt})`, warn: todayCt > 0 },
          { key: 'history', label: `📜 ${isHindi ? 'चेकआउट इतिहास' : 'Checked Out History'} (${groupedHistory.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === tab.key
                ? 'bg-slate-900 text-white shadow-xs'
                : tab.warn
                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.warn && filter !== tab.key && <AlertTriangle size={13} className="inline mr-1" />}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {filter === 'history' ? (
          loadingHistory ? (
            <div className="p-12 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-50 text-gray-400 mb-3">
                <Users size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900">No checkout history found</h3>
              <p className="text-sm text-gray-500 mt-1">Past completed stays will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredHistory.map(item => {
                const outDate = item.actualCheckOutDate || item.expectedCheckOutDate;
                const formattedOut = outDate ? format(new Date(outDate), 'dd MMM yyyy, hh:mm a') : 'Completed';

                if (item.isGroup) {
                  const isExpanded = expandedGroupIds.has(item.groupId);
                  const roomListStr = item.roomNumbers.join(', ');
                  return (
                    <div key={item._id} className="transition-colors">
                      {/* MASTER CONSOLIDATED GROUP ROW */}
                      <div
                        className="p-5 hover:bg-purple-50/40 transition-colors cursor-pointer bg-white"
                        onClick={() => setGroupModalStay(item.primaryStay)}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-200 shadow-2xs">
                              <Building2 size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-black text-gray-900">
                                  {item.primaryGuest?.fullName || item.companyName || 'Corporate Group'}
                                </h4>
                                {item.companyName && item.primaryGuest?.fullName && (
                                  <span className="text-xs font-semibold text-slate-500">
                                    ({item.companyName})
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                                  🏢 {item.groupName || 'Corporate Folio'} &bull; {item.stays.length} Rooms
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                                  ✓ Checked Out
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1 font-medium flex-wrap">
                                {item.primaryGuest?.mobileNumber && (
                                  <>
                                    <span>📞 {item.primaryGuest.mobileNumber}</span>
                                    <span>&bull;</span>
                                  </>
                                )}
                                <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  Rooms: {roomListStr} ({item.stays.length} Rooms Merged)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0 gap-3">
                            <div className="text-left sm:text-right">
                              <div className="flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                                <Clock size={12} className="mr-1" />
                                Checked Out At
                              </div>
                              <div className="text-sm font-bold text-gray-900">
                                {formattedOut}
                              </div>
                            </div>

                            <div className="hidden sm:block text-right ml-2">
                              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</div>
                              <div className="text-sm font-bold text-emerald-700 font-mono">
                                ₹{item.totalAmount.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">• Paid</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              {/* Open Consolidated Corporate Bill Modal */}
                              <button
                                type="button"
                                onClick={() => setGroupModalStay(item.primaryStay)}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Open Consolidated Corporate Bill Modal"
                              >
                                <Building2 size={13} />
                                <span>Master Group Bill</span>
                              </button>

                              {/* Master WhatsApp Bill */}
                              {item.primaryGuest?.mobileNumber && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const url = getMergedInvoiceWhatsAppUrl(item.stays);
                                    if (url) window.open(url, '_blank');
                                  }}
                                  className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                                  title="WhatsApp Consolidated Corporate Bill to Booker"
                                >
                                  <MessageSquare size={15} />
                                </button>
                              )}

                              {/* Expand / Collapse Sub-rooms toggle */}
                              <button
                                type="button"
                                onClick={() => toggleGroupExpand(item.groupId)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border ${
                                  isExpanded
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={isExpanded ? "Hide individual room breakdown" : "Expand to view individual room breakdown"}
                              >
                                <span>{isExpanded ? 'Hide' : `Rooms (${item.stays.length})`}</span>
                                <ChevronRight size={13} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* INDIVIDUAL ROOM ACCORDION BREAKDOWN */}
                      {isExpanded && (
                        <div className="bg-slate-50 border-t border-b border-slate-200 px-5 sm:px-8 py-3.5 space-y-2">
                          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Individual Room Folios ({item.stays.length} Rooms):</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {item.stays.map(subStay => (
                              <div
                                key={subStay._id}
                                onClick={() => setManagedStay(subStay)}
                                className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span className="text-indigo-600 font-black">Room {subStay.room?.roomNumber}</span>
                                    <span className="text-slate-300">&bull;</span>
                                    <span className="truncate max-w-[120px]">{subStay.guest?.fullName || 'Occupant'}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                    Rent: <b className="font-mono text-slate-800">₹{subStay.totalAmount?.toLocaleString('en-IN')}</b>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => printInvoice(subStay, subStay.payments || [])}
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                                    title={`Print Single Room ${subStay.room?.roomNumber} Bill`}
                                  >
                                    <Printer size={13} />
                                  </button>
                                  <ChevronRight size={14} className="text-slate-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // Normal Single Stay Row (Not part of a multi-room group)
                const stay = item;
                return (
                  <div
                    key={stay._id}
                    className="p-5 hover:bg-gray-50/60 transition-colors cursor-pointer bg-white"
                    onClick={() => setManagedStay(stay)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3.5">
                        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
                          ✓
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-gray-900">{stay.guest?.fullName || 'Guest'}</h4>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-700 border-slate-200">
                              Checked Out
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1 font-medium">
                            <span>📞 {stay.guest?.mobileNumber}</span>
                            <span>&bull;</span>
                            <span className="text-indigo-600 font-bold">Room {stay.room?.roomNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0 gap-4">
                        <div className="text-left sm:text-right">
                          <div className="flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            <Clock size={12} className="mr-1" />
                            Checked Out At
                          </div>
                          <div className="text-sm font-bold text-gray-900">
                            {formattedOut}
                          </div>
                        </div>

                        <div className="hidden sm:block text-right ml-2">
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bill</div>
                          <div className="text-sm font-bold text-emerald-700 font-mono">
                            ₹{stay.totalAmount?.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">• Paid</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => printInvoice(stay, stay.payments || [])}
                            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                            title="Print Invoice"
                          >
                            <Printer size={15} />
                          </button>
                          {stay.guest?.mobileNumber && (
                            <a
                              href={getStayWhatsAppUrl(stay, 'bill')}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl border border-emerald-200 transition-colors"
                              title="WhatsApp Bill"
                            >
                              <MessageSquare size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : filteredStays.length === 0 ? (
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
              const isSelectedForMerge = selectedStayIdsForMerge.includes(stay._id);
              return (
                <div
                  key={stay._id}
                  className={`p-5 transition-colors cursor-pointer ${
                    isSelectedForMerge ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-emerald-600' : 'hover:bg-gray-50/60'
                  }`}
                  onClick={() => setManagedStay(stay)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5">
                      {/* Checkbox for Multi-Room Merge */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMergeSelection(stay._id);
                        }}
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isSelectedForMerge
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'border-slate-300 hover:border-slate-500 bg-white'
                        }`}
                        title={isSelectedForMerge ? "Deselect from corporate bill" : "Select room for merged corporate bill"}
                      >
                        {isSelectedForMerge && <Check size={12} className="stroke-[3]" />}
                      </button>

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
                          {stay.groupId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200 truncate max-w-[200px]" title={stay.groupName}>
                              <Building2 size={10} className="text-purple-700 shrink-0" />
                              <span className="truncate">{stay.groupName || 'Group'}</span>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500 mt-1">
                          <span className="text-gray-700 font-bold">{stay.guest?.mobileNumber}</span>
                          {stay.guest?.mobileNumber && (
                            <a
                              href={`tel:${stay.guest.mobileNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                              title={`Direct Call: ${stay.guest.fullName}`}
                            >
                              <Phone size={11} className="stroke-[2.5]" />
                              <span>Call</span>
                            </a>
                          )}
                          {stay.guest?.mobileNumber && (
                            <a
                              href={getStayWhatsAppUrl(stay, 'bill') || `https://wa.me/${stay.guest.mobileNumber.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-md text-[11px] font-bold shadow-xs active:scale-95 transition-all"
                              title="Send Bill / Summary on WhatsApp"
                            >
                              <MessageSquare size={11} className="stroke-[2.5]" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                          <span>&bull;</span>
                          <span className="text-indigo-600 font-bold">Room {stay.room?.roomNumber}</span>
                        </div>
                        
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
          onSuccess={(completedStay, stayPayments) => {
            // Close modal immediately so it never lingers or reappears
            setSelectedStay(null);
            setManagedStay(null);
            fetchStays(true);
            setCheckoutSuccessToast({
              stay: completedStay,
              payments: stayPayments || []
            });
            setTimeout(() => setCheckoutSuccessToast(null), 15000);
          }}
        />
      )}

      {/* Floating Success Toast when a checkout finishes - One-click Print Bill & WhatsApp without blocking the UI */}
      {checkoutSuccessToast && (
        <div className="fixed bottom-6 right-4 sm:right-6 z-[9999] bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-slate-700 max-w-sm sm:max-w-md w-[92%] sm:w-auto animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">
                  Room {checkoutSuccessToast.stay?.room?.roomNumber} Checked Out!
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {checkoutSuccessToast.stay?.guest?.fullName} &bull; ₹{checkoutSuccessToast.stay?.totalAmount} settled
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setCheckoutSuccessToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
            {checkoutSuccessToast.stay?.groupId ? (
              <button
                type="button"
                onClick={() => handlePrintGroupBill(checkoutSuccessToast.stay)}
                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Building2 size={13} /> Master Group Bill
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => printInvoice(checkoutSuccessToast.stay, checkoutSuccessToast.payments)}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <Printer size={13} /> {checkoutSuccessToast.stay?.groupId ? 'Room Bill' : 'Print Bill'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (checkoutSuccessToast.stay?.groupId) {
                  handleShareGroupWhatsApp(checkoutSuccessToast.stay);
                } else {
                  const url = getStayWhatsAppUrl(checkoutSuccessToast.stay, 'bill');
                  if (url) window.open(url, '_blank');
                }
              }}
              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 text-center cursor-pointer shadow-xs"
            >
              <Share2 size={13} /> WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Banner when rooms are checked for merge */}
      {selectedStayIdsForMerge.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-200 max-w-sm sm:max-w-md w-[92%] sm:w-auto justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold">
              <b>{selectedStayIdsForMerge.length}</b> {selectedStayIdsForMerge.length === 1 ? 'Room' : 'Rooms'} Selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedStayIdsForMerge([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 font-bold underline cursor-pointer"
            >
              Clear
            </button>
            <button
              onClick={() => setShowMergedModal(true)}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Building2 size={13} /> Merged Bill
            </button>
          </div>
        </div>
      )}

      {showMergedModal && (
        <MergedCorporateInvoiceModal
          initialStays={selectedStayIdsForMerge.length > 0 
            ? stays.filter(s => selectedStayIdsForMerge.includes(s._id))
            : (stays.length > 0 ? [stays[0]] : [])}
          allStays={stays}
          onClose={() => setShowMergedModal(false)}
          onStayUpdated={() => fetchStays(false)}
        />
      )}

      {groupModalStay && (
        <MergedCorporateInvoiceModal
          initialStays={[groupModalStay]}
          allStays={[groupModalStay]}
          onClose={() => setGroupModalStay(null)}
          onStayUpdated={() => {
            fetchStays(false);
            if (filter === 'history') fetchHistoryStays(false);
          }}
        />
      )}
    </div>
  );
};

export default CheckoutList;
