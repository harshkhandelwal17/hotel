import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { CreditCard, Plus, Search, ArrowUpRight } from 'lucide-react';
import DynamicUpiQr from '../../components/DynamicUpiQr';
import PaymentMethodSelector, { validateSplitPayment, buildSplitPayments } from '../../components/common/PaymentMethodSelector';
import { apiCache } from '../../utils/apiCache';

const PaymentsList = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const fetchData = async (forceSpinner = false) => {
    const cacheKey = `stays_pending_${globalProperty}`;
    const cached = apiCache.get(cacheKey);
    if (cached && !forceSpinner) {
      setStays(cached);
      setLoading(false); // Instant render in 0ms!
    } else if (!cached) {
      setLoading(true);
    }
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + `/api/stays?status=Active${propQuery}`);
      const allStays = res.data.data || [];
      const staysWithBalance = allStays.filter(s => s.totalAmount - s.paidAmount > 0);
      apiCache.set(cacheKey, staysWithBalance);
      setStays(staysWithBalance);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchData();
    const handleUpdate = () => fetchData(false);
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
      fetchData(true);
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment failed');
    } finally { setPayLoading(false); }
  };

  const filteredStays = stays.filter(stay =>
    !search ||
    stay.guest?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    stay.guest?.mobileNumber?.includes(search) ||
    stay.room?.roomNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = stays.reduce((sum, s) => sum + Math.max(0, s.totalAmount - s.paidAmount), 0);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Pending Payments</h1>
            <span className="px-2.5 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-black">
              ₹{totalPending.toLocaleString('en-IN')} Due
            </span>
          </div>
          <p className="text-gray-400 text-xs font-semibold mt-0.5">Collect balance dues and generate digital UPI QR</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guest, room or phone..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-2xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredStays.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 text-green-500 mb-3">
            <CreditCard size={28} />
          </div>
          <h3 className="text-base font-bold text-gray-900">All payments cleared!</h3>
          <p className="text-sm text-gray-500 mt-1">No outstanding balances.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50 overflow-hidden">
          {filteredStays.map(stay => {
            const balance = stay.totalAmount - stay.paidAmount;
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
                      className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors shadow-sm active:scale-95 shrink-0"
                    >
                      <Plus size={14} /> Collect
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
