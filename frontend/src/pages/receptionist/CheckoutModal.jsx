import React, { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { X, User, Home, Calendar, CreditCard, AlertCircle, CheckCircle2, Plus, Printer, ChevronRight } from 'lucide-react';
import { printInvoice } from '../../utils/invoice';

const CheckoutModal = ({ stay, onClose, onSuccess }) => {
  const [chargesList, setChargesList] = useState([]);
  const [checkoutPayment, setCheckoutPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [completedStay, setCompletedStay] = useState(null);
  const [payments, setPayments] = useState([]);

  const baseBalance = stay.totalAmount - stay.paidAmount;
  const totalNewCharges = chargesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const finalBalance = Math.max(0, baseBalance + totalNewCharges);

  const handleAddCharge = () => setChargesList([...chargesList, { reason: '', amount: '' }]);
  const handleUpdateCharge = (idx, field, value) => {
    const updated = [...chargesList];
    updated[idx][field] = value;
    setChargesList(updated);
  };
  const handleRemoveCharge = (idx) => setChargesList(chargesList.filter((_, i) => i !== idx));

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stay._id}/checkout`, {
        chargesList,
        checkoutPayment: Number(checkoutPayment),
        paymentMethod,
      });
      setCompletedStay(res.data.data);
      setPayments(res.data.payments || []);
      setCheckoutComplete(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkoutComplete) {
    const finalAmount = completedStay ? completedStay.totalAmount : stay.totalAmount;
    
    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onSuccess}>
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 text-center animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Checked Out!</h2>
          <p className="text-gray-500 text-sm mb-6">Guest has been successfully checked out.</p>
          
          <div className="space-y-3">
            <button
              onClick={() => {
                printInvoice({ ...stay, ...(completedStay || {}), guest: stay.guest, room: stay.room, hostel: stay.hostel }, payments);
                onSuccess();
              }}
              className="w-full py-3 bg-black text-white font-bold rounded-xl shadow-md hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Print Final Invoice
            </button>
            <button
              onClick={onSuccess}
              className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-start flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checkout Guest</h2>
            <p className="text-sm text-gray-500 mt-0.5">Finalize billing and release room</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-medium text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
            
            {/* Guest Identity Card */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Primary Guest</p>
                  <p className="font-black text-xl text-gray-900 leading-none">{stay.guest?.fullName}</p>
                  <p className="text-sm font-semibold text-gray-500 mt-1">{stay.guest?.mobileNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Room</p>
                  <p className="font-black text-2xl text-gray-900 leading-none">{stay.room?.roomNumber}</p>
                </div>
              </div>
              
              {stay.coGuests && stay.coGuests.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Along with {stay.coGuests.length} Co-Guest(s)</p>
                   <div className="flex flex-wrap gap-2">
                     {stay.coGuests.map((cg, i) => (
                       <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 shadow-sm">{cg.fullName}</span>
                     ))}
                   </div>
                </div>
              )}
            </div>

            {/* Stay Timings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Checked In</p>
                <p className="font-bold text-blue-900 text-xs">{format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Expected Out</p>
                <p className="font-bold text-gray-900 text-xs">{format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 shadow-sm border-2">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Actual Out (Now)</p>
                <p className="font-black text-orange-900 text-sm">{format(new Date(), 'dd MMM, hh:mm a')}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-2"><CreditCard size={14}/> Settlement Summary</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-semibold">Agreed Total Rent</span>
                <span className="font-black text-gray-900">₹{stay.totalAmount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-semibold">Advance Paid</span>
                <span className="font-black text-green-600">- ₹{stay.paidAmount}</span>
              </div>
              
              {/* Additional Charges / Adjustments */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Additional Charges (₹)</label>
                  <button type="button" onClick={handleAddCharge} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-100 transition-colors">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                
                <div className="space-y-2">
                  {chargesList.map((charge, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input type="number" min="0" placeholder="0" className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-black text-gray-900 text-sm"
                          value={charge.amount} onChange={e => handleUpdateCharge(idx, 'amount', e.target.value)} />
                      </div>
                      <input type="text" placeholder="Reason (e.g. Water, Late checkout)" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                        value={charge.reason} onChange={e => handleUpdateCharge(idx, 'reason', e.target.value)} />
                      <button type="button" onClick={() => handleRemoveCharge(idx)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  {chargesList.length === 0 && (
                    <div className="text-xs text-gray-400 font-medium italic py-2 text-center border-2 border-dashed border-gray-100 rounded-lg">No extra charges added.</div>
                  )}
                </div>
              </div>

              {/* Final Math */}
              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-200 flex flex-col sm:flex-row justify-between sm:items-end gap-2">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Final Balance Due</p>
                  {finalBalance > 0 ? (
                    <p className="text-xs font-semibold text-red-500">Collect this amount from guest</p>
                  ) : (
                    <p className="text-xs font-semibold text-green-500">Fully Settled</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{finalBalance}</p>
                </div>
              </div>
            </div>

            {finalBalance > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <label className="block text-xs font-black text-gray-800 uppercase tracking-widest">Collect Payment</label>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="w-full sm:flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input type="number" min="0" max={finalBalance} required
                      className="w-full pl-7 pr-3 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-black text-xl text-gray-900 shadow-sm"
                      value={checkoutPayment} onChange={e => setCheckoutPayment(e.target.value)} />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" onClick={() => setCheckoutPayment(finalBalance)} className="w-full sm:w-auto py-3 sm:py-0 px-6 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-md active:scale-95">Full ₹{finalBalance}</button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {['Cash', 'UPI', 'Card'].map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-3 text-sm font-bold rounded-lg border transition-all ${paymentMethod === m ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col-reverse sm:flex-row justify-end gap-3 rounded-b-3xl flex-shrink-0">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-5 py-3 sm:py-2.5 text-sm font-bold text-gray-600 bg-white sm:bg-transparent border sm:border-0 border-gray-200 rounded-xl hover:text-gray-900 hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || (finalBalance > 0 && Number(checkoutPayment) < finalBalance)} 
              className="w-full sm:w-auto justify-center px-8 py-3.5 sm:py-2.5 bg-red-600 text-white text-sm font-black uppercase tracking-wide rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95">
              {loading ? 'Processing...' : 'Confirm Checkout'} <ChevronRight size={16}/>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
