import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bed, Plus, X, Users, Clock, Building } from 'lucide-react';

const emptyForm = {
  roomNumber: '', hostel: '', floor: '', roomType: 'Standard Double', 
};

const ManageRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [roomsRes, hostelsRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/rooms'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
      ]);
      setRooms(roomsRes.data.data);
      setHostels(hostelsRes.data.data);
      if (hostelsRes.data.data.length > 0) {
        setFormData(prev => ({ ...prev, hostel: hostelsRes.data.data[0]._id }));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openModal = () => {
    setFormError('');
    setFormData(prev => ({ ...emptyForm, hostel: prev.hostel }));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ ...emptyForm, hostel: hostels[0]?._id || '' });
  };

  const handleEdit = (room) => {
    setEditingId(room._id);
    setFormData({
      roomNumber: room.roomNumber || '',
      hostel: room.hostel?._id || room.hostel || '',
      floor: room.floor || '',
      roomType: room.roomType || 'Standard Double',
      
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/rooms/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete room');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/rooms/${editingId}`, formData);
      } else {
        await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/rooms', formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Manage Rooms</h1>
          <p className="text-sm text-gray-500 mt-1">{rooms.length} rooms configured across all properties</p>
        </div>
        <button onClick={openModal}
          className="bg-black text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md font-bold text-sm">
          <Plus size={16} /> Add Room
        </button>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {rooms.map(room => (
          <div key={room._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-gray-900 text-lg">{room.roomNumber}</h3>
                <p className="text-xs font-semibold text-indigo-600 mt-0.5">{room.roomType || 'Standard'}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${room.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {room.status}
              </span>
            </div>
            <div className="flex bg-gray-100 border-b border-gray-200">
              <button onClick={() => handleEdit(room)} className="flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold text-gray-600 hover:text-black hover:bg-gray-200 transition-colors border-r border-gray-200">Edit</button>
              <button onClick={() => handleDelete(room._id)} className="flex-1 py-1.5 text-[11px] uppercase tracking-wider font-bold text-red-500 hover:text-red-700 hover:bg-red-100 transition-colors">Delete</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={14} className="text-gray-400" />
                <span className="font-medium">Capacity: {room.capacity} persons</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-gray-500"><Clock size={12} />12h Base</span>
                  <span className="font-bold text-gray-900">₹{room.price12h || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1 text-gray-500"><Clock size={12} />24h Base</span>
                  <span className="font-bold text-gray-900">₹{room.price24h || 0}</span>
                </div>
                {room.extraPerPerson24h > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">+Per Person/night</span>
                    <span className="font-bold text-blue-700">+₹{room.extraPerPerson24h}</span>
                  </div>
                )}
                {room.extraPerPerson12h > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">+Per Person/12h</span>
                    <span className="font-bold text-blue-700">+₹{room.extraPerPerson12h}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {rooms.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <Bed size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold text-gray-600">No rooms yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your first room to get started</p>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Room</h2>
                <p className="text-xs text-gray-500 mt-0.5">Configure pricing per person for accurate billing</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{formError}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Property</label>
                  <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                    value={formData.hostel} onChange={e => set('hostel', e.target.value)}>
                    {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Room Type</label>
                  <select required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                    value={formData.roomType} onChange={e => set('roomType', e.target.value)}>
                    {['Standard Single', 'Standard Double', 'Twin', 'Triple', 'Deluxe', 'Suite', 'Family Room'].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Room No.</label>
                    <input type="text" required className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                      placeholder="A-101" value={formData.roomNumber} onChange={e => set('roomNumber', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Floor</label>
                    <input type="text" required className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                      placeholder="1st" value={formData.floor} onChange={e => set('floor', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="p-5 bg-gray-50 border-t border-gray-100 flex gap-3 rounded-b-2xl">
                <button type="button" onClick={closeModal} className="flex-1 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-black rounded-xl font-bold text-white hover:bg-gray-800 transition-colors disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageRooms;
