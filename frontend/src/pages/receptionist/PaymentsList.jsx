import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { CreditCard, Plus, Search, ArrowUpRight } from 'lucide-react';

const PaymentsList = () => {
  const [stays, setStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStay, setSelectedStay] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays?status=Active');
      const staysWithBalance = res.data.data.filter(s => s.totalAmount - s.paidAmount > 0);
      setStays(staysWithBalance);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) return;
    setPayLoading(true);
    setPayError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/payments`, {
        stayId: selectedStay._id,
        amount: Number(payAmount),
        paymentMethod: payMethod,
      });
      setSelectedStay(null);
      setPayAmount('');
      fetchData();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pending Payments</h1>
          <p className="text-gray-500 text-sm mt-1">Total Outstanding: <span className="font-black text-red-600">₹{totalPending}</span></p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guest..."
            className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black w-64"
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
              <div key={stay._id} className="p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-700 font-bold">
                      {stay.guest?.fullName?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{stay.guest?.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Room {stay.room?.roomNumber} &bull; {stay.guest?.mobileNumber} &bull; Out: {format(new Date(stay.expectedCheckOutDate), 'dd MMM')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Balance Due</p>
                      <p className="text-lg font-black text-red-600">₹{balance}</p>
                      <p className="text-xs text-gray-400">Paid: ₹{stay.paidAmount} / ₹{stay.totalAmount}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedStay(stay); setPayAmount(balance); }}
                      className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
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
      {selectedStay && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedStay(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Collect Payment</h3>
              <p className="text-sm text-gray-500 mt-0.5">{selectedStay.guest?.fullName} &bull; Room {selectedStay.room?.roomNumber}</p>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              {payError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{payError}</div>}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={selectedStay.totalAmount - selectedStay.paidAmount}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-xl font-black"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button key={m} type="button" onClick={() => setPayMethod(m)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${payMethod === m ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedStay(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={payLoading} className="flex-1 py-2.5 bg-green-600 text-white font-bold rounded-xl text-sm hover:bg-green-700 shadow-md disabled:opacity-50">
                  {payLoading ? 'Saving...' : 'Confirm ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;
