import React, { useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { X, User, Home, Calendar, CreditCard, AlertCircle, CheckCircle2, Plus } from 'lucide-react';

const CheckoutModal = ({ stay, onClose, onSuccess }) => {
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesNote, setAdditionalChargesNote] = useState('');
  const [checkoutPayment, setCheckoutPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [completedStay, setCompletedStay] = useState(null);

  const baseBalance = stay.totalAmount - stay.paidAmount;
  const finalBalance = Math.max(0, baseBalance + Number(additionalCharges));

  const handleCheckout = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stay._id}/checkout`, {
        additionalCharges: Number(additionalCharges),
        checkoutPayment: Number(checkoutPayment),
        paymentMethod,
      });
      setCompletedStay(res.data.data);
      setCheckoutComplete(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Checkout Guest</h2>
            <p className="text-sm text-gray-500 mt-0.5">Finalize billing and release room</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleCheckout}>
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Guest & Stay Summary Card */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <User size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Guest</p>
                    <p className="font-bold text-gray-900">{stay.guest?.fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Home size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Room</p>
                    <p className="font-bold text-gray-900">{stay.room?.roomNumber}  {stay.occupants > 1 ? `(${stay.occupants} guests)` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Check-in</p>
                    <p className="font-bold text-gray-900">{format(new Date(stay.checkInDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Expected Checkout</p>
                    <p className="font-bold text-gray-900">{format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="border-t border-gray-200 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Room Charges</span>
                  <span className="font-semibold">₹{stay.totalAmount}</span>
                </div>
                {stay.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount Applied</span>
                    <span className="font-semibold text-green-600">-₹{stay.discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Already Paid</span>
                  <span className="font-semibold text-green-600">₹{stay.paidAmount}</span>
                </div>
              </div>
            </div>

            {/* Additional Charges */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Additional Charges (if any)</label>
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-32">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      className="w-full pl-7 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-bold text-gray-900"
                      value={additionalCharges}
                      onChange={e => setAdditionalCharges(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm"
                  value={additionalChargesNote}
                  onChange={e => setAdditionalChargesNote(e.target.value)}
                  placeholder="Reason (e.g. Laundry, Damage, Extra day)"
                />
              </div>
            </div>

            {/* Final Balance */}
            <div className={`rounded-xl p-4 flex justify-between items-center border ${finalBalance > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div>
                <p className={`text-sm font-bold ${finalBalance > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  {finalBalance > 0 ? 'Balance Due at Checkout' : 'Account Settled ✓'}
                </p>
                {finalBalance <= 0 && <p className="text-xs text-green-700 mt-0.5">No payment needed</p>}
              </div>
              <span className={`text-2xl font-black ${finalBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                ₹{finalBalance}
              </span>
            </div>

            {/* Payment Collection */}
            {finalBalance > 0 && (
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-700">Collect Payment (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={finalBalance}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none text-xl font-black transition-all"
                  value={checkoutPayment}
                  onChange={e => setCheckoutPayment(e.target.value)}
                  placeholder="Enter amount..."
                />
                <div className="flex gap-2">
                  {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${paymentMethod === m ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                {Number(checkoutPayment) < finalBalance && Number(checkoutPayment) > 0 && (
                  <p className="text-xs text-orange-600 font-medium bg-orange-50 p-2 rounded-lg">
                    ⚠️ Partial payment. Remaining ₹{finalBalance - Number(checkoutPayment)} will stay as outstanding.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-between items-center">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-200 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md hover:shadow-red-600/30 disabled:opacity-50 text-sm transition-all flex items-center gap-2"
            >
              {loading ? 'Processing...' : <><CheckCircle2 size={16} /> Complete Checkout</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutModal;
