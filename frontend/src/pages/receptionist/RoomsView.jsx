import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Users, Home, Clock, CheckCircle, Wrench } from 'lucide-react';

const RoomsView = () => {
  const [rooms, setRooms] = useState([]);
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [roomsRes, staysRes] = await Promise.all([
        axios.get('http://127.0.0.1:5001/api/rooms'),
        axios.get('http://127.0.0.1:5001/api/stays?status=Active'),
      ]);
      setRooms(roomsRes.data.data);
      setActiveStays(staysRes.data.data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const getRoomStatus = (room) => {
    const stay = activeStays.find(s => s.room?._id === room._id);
    if (room.status === 'Maintenance') return { label: 'Maintenance', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Wrench, stay: null };
    if (stay) return { label: 'Occupied', color: 'bg-red-100 text-red-800 border-red-200', icon: Users, stay };
    return { label: 'Available', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, stay: null };
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  const availableCount = rooms.filter(r => !activeStays.find(s => s.room?._id === r._id) && r.status === 'Active').length;
  const occupiedCount = rooms.filter(r => !!activeStays.find(s => s.room?._id === r._id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Rooms Overview</h1>
        <p className="text-gray-500 text-sm mt-1">
          <span className="text-green-600 font-bold">{availableCount} Available</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-red-600 font-bold">{occupiedCount} Occupied</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="font-medium">{rooms.length} Total</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {rooms.map((room) => {
          const status = getRoomStatus(room);
          const StatusIcon = status.icon;
          return (
            <div
              key={room._id}
              className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all hover:shadow-md ${
                status.label === 'Available' ? 'border-green-100 hover:border-green-200' :
                status.label === 'Occupied' ? 'border-red-100 hover:border-red-200' :
                'border-yellow-100'
              }`}
            >
              {/* Room Header */}
              <div className={`p-4 ${status.label === 'Occupied' ? 'bg-red-50' : status.label === 'Available' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-gray-900 text-xl tracking-tight">{room.roomNumber}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Floor {room.floor} &bull; Cap. {room.capacity}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${status.color}`}>
                    <StatusIcon size={11} /> {status.label}
                  </span>
                </div>
              </div>

              {/* Room Body */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">12h Rate</span>
                  <span className="font-bold text-gray-900">₹{room.price12h || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">24h Rate</span>
                  <span className="font-bold text-gray-900">₹{room.price24h || 0}</span>
                </div>

                {status.stay && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-800">{status.stay.guest?.fullName}</span>
                    </div>
                    {status.stay.occupants > 1 && (
                      <p className="text-xs text-gray-500 pl-4.5">{status.stay.occupants} occupants</p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-500">
                        Out: {new Date(status.stay.expectedCheckOutDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    {(status.stay.totalAmount - status.stay.paidAmount) > 0 && (
                      <p className="text-xs font-bold text-red-600">
                        ₹{status.stay.totalAmount - status.stay.paidAmount} pending
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
          <Home size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-900">No rooms configured</h3>
          <p className="text-sm text-gray-500 mt-1">Ask your admin to add rooms first.</p>
        </div>
      )}
    </div>
  );
};

export default RoomsView;
