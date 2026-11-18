import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  X, CheckCircle2, AlertCircle, Building2, CreditCard,
  Printer, Share2, RefreshCw, DollarSign, Calendar
} from 'lucide-react';
import PaymentMethodSelector, { validateSplitPayment, buildSplitPayments } from '../common/PaymentMethodSelector';
import MergedCorporateInvoiceModal from '../MergedCorporateInvoiceModal';
import { apiCache } from '../../utils/apiCache';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

export default function GroupCheckoutModal({
  isOpen,
  groupId,
  onClose,
  onSuccess
}) {
  if (!isOpen || !groupId) return null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [groupData, setGroupData] = useState(null);
  const [checkoutPayment, setCheckoutPayment] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitBreakdown, setSplitBreakdown] = useState({ cash: '', upi: '', card: '' });
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Fetch group stays and current billing status
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    axios.get(`${API}/api/stays/group/${groupId}`)
      .then(res => {
        if (!active) return;
        const data = res.data?.data;
        setGroupData(data);
        if (data?.summary?.balanceDue !== undefined) {
          setCheckoutPayment(String(data.summary.balanceDue));
        }
      })
      .catch(err => {
        if (!active) return;
        setError(err.response?.data?.message || 'Group details load karne me error aaya.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [groupId]);

  const activeStays = groupData?.stays?.filter(s =>
    ['Upcoming', 'Active', 'Checkout Due', 'Overdue'].includes(s.status)
  ) || [];

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');

    const numericPayment = Math.max(0, Number(checkoutPayment) || 0);

    if (paymentMethod === 'Split') {
      const splitErr = validateSplitPayment(numericPayment, splitBreakdown);
      if (splitErr) {
        setError(splitErr);
        return;
      }
    }

    setSubmitting(true);

    try {
      const splitPayments = paymentMethod === 'Split' ? buildSplitPayments(splitBreakdown) : undefined;
      const payload = {
        checkoutPayment: numericPayment,
        paymentMethod: paymentMethod === 'Split' ? 'Mixed' : paymentMethod,
        splitPayments,
        notes: notes.trim()
      };

      await axios.post(`${API}/api/stays/group/${groupId}/checkout`, payload);
      apiCache.invalidate('rooms');
      window.dispatchEvent(new Event('hotelDataInvalidated'));
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Group checkout error:', err);
      setError(err.response?.data?.message || err.message || 'Group checkout fail ho gaya.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-purple-800 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl">
              <Building2 className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Simultaneous Group Checkout
              </h2>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                {groupData?.groupName || 'Group'} ke saare rooms ek sath check-out karein
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-purple-600 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading group folio & billing records...</p>
          </div>
        ) : isSuccess ? (
          /* Success Screen */
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Group Checked Out Successfully!
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Saare {activeStays.length} rooms check-out ho chuke hain aur final settlement ho gaya hai.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowInvoiceModal(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={15} /> Print Master Group Invoice
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <form onSubmit={handleCheckout} className="p-4 sm:p-6 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-bold">
                <AlertCircle size={15} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Active Rooms Pill List */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Active Rooms in Group</span>
                <span className="font-black text-purple-700">{activeStays.length} Rooms</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeStays.map(s => (
                  <span
                    key={s._id}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 shadow-2xs"
                  >
                    Room {s.room?.roomNumber}
                  </span>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Tariff</span>
                <p className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                  ₹{groupData?.summary?.totalStayAmount?.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Paid So Far</span>
                <p className="text-sm sm:text-base font-black text-emerald-700 mt-0.5">
                  ₹{groupData?.summary?.totalPaid?.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-700 uppercase">Balance Due</span>
                <p className="text-sm sm:text-base font-black text-rose-700 mt-0.5">
                  ₹{groupData?.summary?.balanceDue?.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Settlement Payment Input */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Settlement Payment Amount (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCheckoutPayment(String(groupData?.summary?.balanceDue || 0))}
                    className="text-[10px] font-black text-rose-700 hover:underline cursor-pointer"
                  >
                    Settle Full Due (₹{groupData?.summary?.balanceDue || 0})
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  value={checkoutPayment}
                  onChange={e => setCheckoutPayment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>

              {Number(checkoutPayment) > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                  <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    splitBreakdown={splitBreakdown}
                    setSplitBreakdown={setSplitBreakdown}
                    totalAmount={Number(checkoutPayment)}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Checkout Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master bill cleared by company coordinator"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || activeStays.length === 0}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Processing Group Checkout...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm Checkout ({activeStays.length} Rooms)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {showInvoiceModal && groupData?.stays && (
        <MergedCorporateInvoiceModal
          initialStays={groupData.stays}
          allStays={groupData.stays}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>,
    document.body
  );
}
