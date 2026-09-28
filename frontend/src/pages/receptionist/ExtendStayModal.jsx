import React, { useState } from 'react';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { X } from 'lucide-react';

const ExtendStayModal = ({ stay, onClose, onSuccess }) => {
  const [newCheckOutDate, setNewCheckOutDate] = useState(
    format(addDays(new Date(stay.expectedCheckOutDate), 1), "yyyy-MM-dd'T'HH:mm")
  );
  const [extensionPayment, setExtensionPayment] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/stays/${stay._id}/extend`, {
        newCheckOutDate: new Date(newCheckOutDate).toISOString(),
        extensionPayment: Number(extensionPayment)
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extend stay');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Extend Stay</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleExtend}>
          <div className="p-6 space-y-4">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
            
            <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800">
              <p><strong>Current Checkout:</strong> {format(currentOut, 'dd MMM yyyy, hh:mm a')}</p>
              <p><strong>Room Rate:</strong> ₹{stay.pricePerNight} / night</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Checkout Date</label>
              <input
                type="datetime-local"
                required
                min={format(currentOut, "yyyy-MM-dd'T'HH:mm")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={newCheckOutDate}
                onChange={(e) => setNewCheckOutDate(e.target.value)}
              />
            </div>
            
            {additionalNights > 0 && (
              <div className="py-2 border-t border-b border-gray-100 my-2 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600">Additional Nights:</span>
                  <span className="font-medium text-gray-900">{additionalNights}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Additional Cost:</span>
                  <span className="font-medium text-gray-900">₹{additionalCost}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Collect Payment (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={extensionPayment}
                onChange={(e) => setExtensionPayment(e.target.value)}
              />
            </div>
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || additionalNights <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Confirm Extension'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExtendStayModal;
