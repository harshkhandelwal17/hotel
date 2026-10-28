import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { X } from 'lucide-react';

const ExtendStayModal = ({ stay, onClose, onSuccess }) => {
  const [newCheckOutDate, setNewCheckOutDate] = useState(
    format(addDays(new Date(stay.expectedCheckOutDate), 1), 'yyyy-MM-dd')
  );
  const [extensionPayment, setExtensionPayment] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const currentOut = new Date(stay.expectedCheckOutDate);
  const newOut = new Date(newCheckOutDate);
  
  // Calculate additional nights safely
  let additionalNights = 0;
  if (!isNaN(newOut.getTime()) && !isNaN(currentOut.getTime())) {
    additionalNights = Math.ceil((newOut.getTime() - currentOut.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  const additionalCost = additionalNights > 0 ? additionalNights * stay.pricePerNight : 0;

  const handleExtend = async (e) => {
    e.preventDefault();
    if (additionalNights <= 0) {
      setError('New checkout date must be after current checkout date');
      return;
    }

    setLoading(true);
    setError('');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
    try {
      await axios.post(`${apiUrl}/api/stays/${stay._id}/extend`, {
        newCheckOutDate,
        extensionPayment: Number(extensionPayment)
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extend stay');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md my-0 sm:my-auto flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-black text-gray-900">Extend Stay</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleExtend} className="flex flex-col flex-1 min-h-0">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
            
            <div className="bg-blue-50/80 p-3.5 rounded-xl text-sm text-blue-900 border border-blue-100">
              <p className="flex justify-between">
                <span className="text-blue-700 font-semibold">Current Checkout:</span>
                <span className="font-bold">{format(currentOut, 'dd MMM yyyy')}</span>
              </p>
              <p className="flex justify-between mt-1">
                <span className="text-blue-700 font-semibold">Room Rate:</span>
                <span className="font-bold">₹{stay.pricePerNight} / night</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">New Checkout Date</label>
              <input
                type="date"
                required
                min={format(addDays(currentOut, 1), 'yyyy-MM-dd')}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                value={newCheckOutDate}
                onChange={(e) => setNewCheckOutDate(e.target.value)}
              />
            </div>
            
            {additionalNights > 0 && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Additional Nights:</span>
                  <span className="font-black text-gray-900">{additionalNights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Additional Cost:</span>
                  <span className="font-black text-gray-900">₹{additionalCost}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Collect Payment (₹) <span className="text-gray-400 font-normal lowercase">(optional)</span></label>
              <input
                type="number"
                min="0"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                value={extensionPayment}
                onChange={(e) => setExtensionPayment(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="px-4 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5 rounded-b-none sm:rounded-b-2xl shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || additionalNights <= 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm shadow-md active:scale-95"
            >
              {loading ? 'Processing...' : 'Confirm Extension'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ExtendStayModal;
