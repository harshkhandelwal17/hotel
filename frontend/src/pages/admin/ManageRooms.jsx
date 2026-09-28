import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bed, Plus, X, Users, Clock, Building } from 'lucide-react';

const emptyForm = {
  roomNumber: '', hostel: '', floor: '', roomType: 'Standard Double', capacity: 2,
  price12h: '', price24h: '',
  extraPerPerson12h: '', extraPerPerson24h: ''
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
      capacity: room.capacity || 2,
      price12h: room.price12h || '',
      price24h: room.price24h || '',
      extraPerPerson12h: room.extraPerPerson12h || '',
      extraPerPerson24h: room.extraPerPerson24h || ''
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

                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Capacity</label>
                    <input type="number" min="1" max="20" required className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-sm font-bold"
                      value={formData.capacity} onChange={e => set('capacity', parseInt(e.target.value))} />
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="bg-blue-50 rounded-xl p-4 space-y-4 border border-blue-100">
                  <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Pricing Configuration</p>
                  
                  {/* Base Price Row */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Base Price (1st person / 1 room)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">12 Hour Rate</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                            placeholder="e.g. 300" value={formData.price12h} onChange={e => set('price12h', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">24 Hour / Night Rate</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                            placeholder="e.g. 600" value={formData.price24h} onChange={e => set('price24h', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Hourly Rates */}
                  <div className="pt-2 border-t border-blue-100">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-gray-600">Custom Hourly Rates (Optional)</p>
                      <button type="button" onClick={() => setFormData({...formData, customRates: [...(formData.customRates || []), { hours: '', price: '' }]})} className="text-xs text-blue-600 font-bold hover:underline">+ Add Custom Rate</button>
                    </div>
                    {formData.customRates && formData.customRates.map((rate, i) => (
                      <div key={i} className="flex gap-3 mb-2 items-center">
                        <div className="flex-1">
                          <input type="number" min="1" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" placeholder="Hours (e.g. 1)" value={rate.hours} onChange={e => {
                            const newRates = [...formData.customRates];
                            newRates[i].hours = e.target.value;
                            setFormData({...formData, customRates: newRates});
                          }} />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold" placeholder="Price" value={rate.price} onChange={e => {
                            const newRates = [...formData.customRates];
                            newRates[i].price = e.target.value;
                            setFormData({...formData, customRates: newRates});
                          }} />
                        </div>
                        <button type="button" onClick={() => {
                          const newRates = formData.customRates.filter((_, idx) => idx !== i);
                          setFormData({...formData, customRates: newRates});
                        }} className="text-red-500 hover:text-red-700">✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Extra Per Person */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Extra Charge per Additional Person</p>
                    <p className="text-xs text-gray-400 mb-2">Leave 0 if price is same regardless of headcount</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Per person (12h)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                            placeholder="0" value={formData.extraPerPerson12h} onChange={e => set('extraPerPerson12h', e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Per person (24h/night)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                          <input type="number" min="0" className="w-full pl-7 pr-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-bold text-sm"
                            placeholder="0" value={formData.extraPerPerson24h} onChange={e => set('extraPerPerson24h', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Preview */}
                  {(formData.price24h || formData.price12h) && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200 text-xs space-y-1">
                      <p className="font-bold text-gray-700 mb-1.5">Price Preview:</p>
                      {[1, 2, 3].map(n => {
                        const extra = Math.max(0, n - 1) * (Number(formData.extraPerPerson24h) || 0);
                        const nightly = (Number(formData.price24h) || 0) + extra;
                        return (
                          <div key={n} className="flex justify-between text-gray-600">
                            <span>{n} person{n > 1 ? 's' : ''}</span>
                            <span className="font-bold">₹{nightly}/night</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-2xl border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-5 py-2.5 border border-gray-200 bg-white text-gray-700 font-semibold rounded-xl hover:bg-gray-50 text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-800 text-sm transition-colors disabled:opacity-50">
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
