import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { CreditCard, Plus, Search, ArrowUpRight, History, Wallet, Banknote, QrCode, CheckCircle2, Clock, Printer, FileText, ChevronRight } from 'lucide-react';
import DynamicUpiQr from '../../components/DynamicUpiQr';
import PaymentMethodSelector, { validateSplitPayment, buildSplitPayments } from '../../components/common/PaymentMethodSelector';
import { apiCache } from '../../utils/apiCache';
import { printInvoice } from '../../utils/invoice';

const PaymentsList = () => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [stays, setStays] = useState([]);
  const [paymentsHistory, setPaymentsHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('All'); // 'All' | 'Cash' | 'UPI' | 'Card' | 'Mixed'
  const [selectedStay, setSelectedStay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [splitBreakdown, setSplitBreakdown] = useState({ cash: '', upi: '', card: '' });
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  useEffect(() => {
    if (selectedStay) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedStay]);

  const fetchPendingData = async (forceSpinner = false) => {
    const cacheKey = `stays_pending_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setStays(cached);
      setLoading(false);
    } else if (!cached) {
      setLoading(true);
    }
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/stays?status=Active${propQuery}`);
      const allStays = res.data.data || [];
      const staysWithBalance = allStays.filter(s => (Number(s.totalAmount) || 0) - (Number(s.paidAmount) || 0) > 0);
      apiCache.set(cacheKey, staysWithBalance);
      setStays(staysWithBalance);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchHistoryData = async (forceSpinner = false) => {
    const cacheKey = `payments_history_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setPaymentsHistory(cached);
      setLoadingHistory(false);
    } else {
      setLoadingHistory(true);
    }
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/payments${propQuery}`);
      const allPayments = res.data.data || [];
      apiCache.set(cacheKey, allPayments);
      setPaymentsHistory(allPayments);
    } catch (err) { console.error(err); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingData();
    } else {
      fetchHistoryData();
    }
  }, [globalProperty, activeTab]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchPendingData(false);
      fetchHistoryData(false);
    };
    window.addEventListener('hotelDataInvalidated', handleUpdate);
    window.addEventListener('propertyChanged', handleUpdate);
    return () => {
      window.removeEventListener('hotelDataInvalidated', handleUpdate);
      window.removeEventListener('propertyChanged', handleUpdate);
    };
  }, [globalProperty]);

  const handlePayment = async (e) => {
    e.preventDefault();
    const amt = Number(payAmount) || 0;
    if (amt <= 0) return;

    if (payMethod === 'Mixed' && amt > 0) {
      const valRes = validateSplitPayment(payMethod, amt, splitBreakdown);
      if (!valRes.isValid) {
        setPayError(valRes.error);
        return;
      }
    }

    setPayLoading(true);
    setPayError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/payments`, {
        stayId: selectedStay._id,
        amount: amt,
        paymentMethod: payMethod,
        splitPayments: buildSplitPayments(payMethod, amt, splitBreakdown, 'Payment'),
      });
      setSelectedStay(null);
      setPayAmount('');
      setSplitBreakdown({ cash: '', upi: '', card: '' });
      apiCache.invalidate();
      fetchPendingData(true);
      fetchHistoryData(true);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed');
    } finally { setPayLoading(false); }
  };

  // Filter pending stays
  const filteredStays = stays.filter(stay =>
    !search ||
    stay.guest?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    stay.guest?.mobileNumber?.includes(search) ||
    stay.room?.roomNumber?.toLowerCase().includes(search.toLowerCase())
  );

  // Filter payment transactions history
  const filteredHistory = paymentsHistory.filter(p => {
    const s = search.toLowerCase();
    const guestName = p.guest?.fullName?.toLowerCase() || '';
    const guestPhone = p.guest?.mobileNumber || '';
    const roomNum = p.stay?.room?.roomNumber?.toLowerCase() || '';
    const notes = p.notes?.toLowerCase() || '';
    const collector = p.createdBy?.name?.toLowerCase() || '';

    const matchesSearch = !search ||
      guestName.includes(s) ||
      guestPhone.includes(s) ||
      roomNum.includes(s) ||
      notes.includes(s) ||
      collector.includes(s);

    if (!matchesSearch) return false;

    if (methodFilter !== 'All') {
      const pm = (p.paymentMethod || '').toLowerCase();
      if (methodFilter.toLowerCase() !== pm) return false;
    }

    return true;
  });

  const totalPending = stays.reduce((sum, s) => sum + Math.max(0, (Number(s.totalAmount) || 0) - (Number(s.paidAmount) || 0)), 0);

  // History Totals
  const totalHistoryAmount = filteredHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCashAmount = filteredHistory.filter(p => (p.paymentMethod || '').toLowerCase() === 'cash').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalUpiAmount = filteredHistory.filter(p => (p.paymentMethod || '').toLowerCase() === 'upi').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalCardAmount = filteredHistory.filter(p => ['card', 'bank transfer', 'mixed'].includes((p.paymentMethod || '').toLowerCase())).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pb-1 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Payments & Ledger</h1>
            {activeTab === 'pending' ? (
              <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                ₹{totalPending.toLocaleString('en-IN')} Due
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                ₹{totalHistoryAmount.toLocaleString('en-IN')} Collected
              </span>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('pending'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 Pending Dues ({stays.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('history'); setSearch(''); }}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📜 Payment History ({paymentsHistory.length})
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'pending' ? 'Search guest, room or phone...' : 'Search guest, phone, room, remarks, staff...'}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 shadow-2xs transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Payment History Method Pills */}
        {activeTab === 'history' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {['All', 'Cash', 'UPI', 'Card', 'Mixed'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  methodFilter === m
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PENDING DUES / COLLECTIONS                              */}
      {/* ============================================================== */}
      {activeTab === 'pending' && (
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
          </div>
        ) : filteredStays.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-3 border border-emerald-200">
              <CreditCard size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-900">All payments cleared!</h3>
            <p className="text-xs text-slate-500 mt-1">No outstanding balances across active in-house stays.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {filteredStays.map(stay => {
              const balance = Math.max(0, (Number(stay.totalAmount) || 0) - (Number(stay.paidAmount) || 0));
              return (
                <div key={stay._id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-700 font-bold shrink-0">
                        {stay.guest?.fullName?.charAt(0) || 'G'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{stay.guest?.fullName}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Room <span className="font-black text-indigo-600">{stay.room?.roomNumber}</span> &bull; {stay.guest?.mobileNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Balance Due</p>
                        <p className="text-base sm:text-lg font-black text-red-600">₹{balance}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Paid: ₹{stay.paidAmount} / ₹{stay.totalAmount}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedStay(stay); setPayAmount(balance); }}
                        className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm active:scale-95 shrink-0 cursor-pointer"
                      >
                        <Plus size={14} /> Collect
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ============================================================== */}
      {/* TAB 2: PAYMENT HISTORY / DAY BOOK TRANSACTIONS                */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Collected</span>
              <span className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 block">₹{totalHistoryAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-slate-500">{filteredHistory.length} Transactions</span>
            </div>
            <div className="bg-emerald-50/60 p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">Cash Payments</span>
              <span className="text-lg sm:text-xl font-black text-emerald-900 mt-0.5 block">₹{totalCashAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-emerald-600">Direct In Hand</span>
            </div>
            <div className="bg-purple-50/60 p-3.5 sm:p-4 rounded-2xl border border-purple-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">UPI / QR Payments</span>
              <span className="text-lg sm:text-xl font-black text-purple-900 mt-0.5 block">₹{totalUpiAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-purple-600">Bank Settled</span>
            </div>
            <div className="bg-blue-50/60 p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">Card / Others</span>
              <span className="text-lg sm:text-xl font-black text-blue-900 mt-0.5 block">₹{totalCardAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] font-semibold text-blue-600">POS & Mixed</span>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-2xs">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-50 text-slate-400 mb-3 border border-slate-200">
                <History size={26} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No payment records found</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search or switching property filter.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
              {filteredHistory.map((p, idx) => {
                const method = (p.paymentMethod || 'Cash').toUpperCase();
                const pDate = p.paymentDate ? new Date(p.paymentDate) : null;
                const formattedDate = pDate && !isNaN(pDate.getTime()) ? format(pDate, 'dd MMM yyyy, hh:mm a') : 'Recent';

                return (
                  <div key={p._id || idx} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Method Icon / Badge */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 border ${
                          method === 'CASH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          method === 'UPI' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          method === 'CARD' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-800 border-slate-200'
                        }`}>
                          {method === 'CASH' ? <Banknote size={18} /> :
                           method === 'UPI' ? <QrCode size={18} /> :
                           <CreditCard size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">{p.guest?.fullName || 'Guest'}</span>
                            {p.stay?.room?.roomNumber && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                                Room {p.stay.room.roomNumber}
                              </span>
                            )}
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              method === 'CASH' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              method === 'UPI' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                              method === 'CARD' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {p.paymentMethod || 'Cash'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-medium">
                            <span>📅 {formattedDate}</span>
                            {p.guest?.mobileNumber && (
                              <>
                                <span>&bull;</span>
                                <span>📞 {p.guest.mobileNumber}</span>
                              </>
                            )}
                            {p.createdBy?.name && (
                              <>
                                <span>&bull;</span>
                                <span>👤 Received by {p.createdBy.name}</span>
                              </>
                            )}
                          </div>

                          {p.notes && (
                            <p className="text-xs text-slate-600 mt-1 italic font-normal bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block">
                              📝 {p.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <div className="text-left sm:text-right">
                          <span className="text-base sm:text-lg font-black text-emerald-700 tracking-tight">
                            +₹{Number(p.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Recorded ✓
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Pay Modal */}
      {selectedStay && createPortal(
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto" onClick={() => setSelectedStay(null)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm my-0 sm:my-auto flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-gray-900 text-lg">Collect Payment</h3>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">{selectedStay.guest?.fullName} &bull; Room {selectedStay.room?.roomNumber}</p>
            </div>
            <form onSubmit={handlePayment} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 flex flex-col">
                {payError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100 font-medium">{payError}</div>}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedStay.totalAmount - selectedStay.paidAmount}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xl font-black text-gray-900"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    required
                  />
                </div>
                <PaymentMethodSelector
                  paymentMethod={payMethod}
                  onChangeMethod={setPayMethod}
                  totalAmount={Number(payAmount) || 0}
                  splitBreakdown={splitBreakdown}
                  onChangeSplit={setSplitBreakdown}
                  allowWallet={Number(selectedStay.guest?.ledgerBalance) > 0}
                  walletBalance={Number(selectedStay.guest?.ledgerBalance) || 0}
                  allowKhata={true}
                  theme="light"
                  qrDetails={{
                    roomNumber: selectedStay.room?.roomNumber,
                    guestName: selectedStay.guest?.fullName,
                    hostel: selectedStay.hostel
                  }}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 shrink-0">
                <button type="button" onClick={() => setSelectedStay(null)} className="w-full sm:flex-1 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={payLoading} className="w-full sm:flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 shadow-md disabled:opacity-50 active:scale-95 transition-all">
                  {payLoading ? 'Saving...' : 'Confirm ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PaymentsList;
