import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, ArrowRightLeft } from 'lucide-react';

const ShiftRoomModal = ({ stay, onClose, onSuccess }) => {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAvailableRooms = async () => {
    try {
      const hostelId = stay.hostel._id || stay.hostel;
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/rooms?status=Active&hostel=${hostelId}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active&hostel=${hostelId}`)
      ]);
      
      const allRooms = roomsRes.data.data;
      const activeStays = staysRes.data.data;
      
      const availableRooms = allRooms.filter(r => {
        if (r._id === (stay.room._id || stay.room)) return false; // Filter out current room
        
        // Check if any other active stay is using this room right now
        const isOccupied = activeStays.some(s => {
          if (s.room._id !== r._id) return false;
          // Check date overlap
          const sOut = new Date(s.expectedCheckOutDate);
          const sIn = new Date(s.checkInDate);
          const currentIn = new Date(stay.checkInDate);
          const currentOut = new Date(stay.expectedCheckOutDate);
          return (currentIn < sOut && currentOut > sIn);
        });
        
        return !isOccupied;
      });
      
      setRooms(availableRooms);
    } catch (err) {
      setError('Failed to fetch rooms');
    }
  };

  useEffect(() => {
    fetchAvailableRooms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShift = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      setError('Please select a new room');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`http://127.0.0.1:5001/api/stays/${stay._id}/shift`, {
        newRoomId: selectedRoom,
        priceAdjustment: Number(priceAdjustment),
        reason
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to shift room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Shift Room</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleShift} className="p-6">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
          
          <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <p className="text-sm text-blue-800">
              <span className="font-bold">Current Room:</span> {stay.room?.roomNumber || 'Unknown'}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <span className="font-bold">Current Total:</span> ₹{stay.totalAmount}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Select New Room <span className="text-red-500">*</span></label>
              <select
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <option value="">-- Select Room --</option>
                {rooms.map(room => (
                  <option key={room._id} value={room._id}>
                    Room {room.roomNumber} - Floor {room.floor} (₹{room.price24h}/day)
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Price Adjustment (₹)</label>
              <input
                type="number"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={priceAdjustment}
                onChange={(e) => setPriceAdjustment(e.target.value)}
                placeholder="e.g. 500 (Upgrade) or -300 (Downgrade)"
              />
              <p className="text-[10px] text-gray-500 mt-1 font-medium">Use positive number to add charge, negative to reduce.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Reason for Shift</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. AC not working, Requested upgrade"
              />
            </div>
          </div>
          
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedRoom}
              className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : <><ArrowRightLeft size={16} /> Confirm Shift</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShiftRoomModal;
