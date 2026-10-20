import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Building, Plus, X, MapPin, Phone, Mail, CheckCircle, ShieldCheck, Sparkles, Calendar, HelpCircle, QrCode } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const ManageProperties = () => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === 'superadmin';
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '', address: '', contactNumber: '', email: '', upiId: '', upiPayeeName: ''
  });

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels');
      setProperties(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', address: '', contactNumber: '', email: '', upiId: '', upiPayeeName: '' });
  };

  const handleEdit = (prop) => {
    setEditingId(prop._id);
    setFormData({ 
      name: prop.name || '', 
      address: prop.address || '', 
      contactNumber: prop.contactNumber || '', 
      email: prop.email || '',
      upiId: prop.upiId || '',
      upiPayeeName: prop.upiPayeeName || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action is irreversible.')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/hostels/${id}`);
      fetchProperties();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/hostels/${editingId}`, formData);
      } else {
        await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels', formData);
      }
      closeModal();
      fetchProperties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Property Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'Manage registered hotel properties' : 'View your registered hotel details & active subscription plan'}
          </p>
        </div>
        {isSuperAdmin ? (
          <button onClick={() => { setFormError(''); setIsModalOpen(true); }}
            className="w-full sm:w-auto justify-center bg-black text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md font-bold text-sm active:scale-95">
            <Plus size={16} /> Add Property
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
            <ShieldCheck size={16} className="text-emerald-600" />
            <span>Managed & Verified Property</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {properties.map(property => {
          const isTrial = property.planStatus === 'trial' || property.plan === 'demo';
          const isExpired = property.planStatus === 'expired' || (property.planEndDate && new Date(property.planEndDate) < new Date());
          const daysLeft = property.planEndDate ? Math.max(0, Math.ceil((new Date(property.planEndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

          return (
            <div key={property._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 text-white">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-black text-white text-lg">{property.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">License ID: {property._id.slice(-6).toUpperCase()}</p>
                    </div>
                    <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-full ${
                      isExpired 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30' 
                        : isTrial 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-green-400/20 text-green-300 border border-green-500/30'
                    }`}>
                      {isExpired ? 'Expired' : isTrial ? 'Trial / Demo' : '● Active'}
                    </span>
                  </div>
                </div>

                {/* SUBSCRIPTION PLAN STRIP */}
                <div className="bg-slate-50 border-b border-gray-100 p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">Active Plan:</span>
                    <span className="font-black text-gray-900 uppercase tracking-wide bg-white px-2 py-0.5 rounded border border-gray-200">
                      {property.plan || 'Demo Plan'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Validity:</span>
                    <span className={`font-bold ${isExpired ? 'text-red-600' : 'text-gray-700'}`}>
                      {property.planEndDate ? new Date(property.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Lifetime'}
                      {daysLeft !== null && !isExpired && (
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-extrabold">({daysLeft} days left)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-500 text-[10px] uppercase tracking-wider">Room Capacity:</span>
                    <span className="font-bold text-gray-700">Up to {property.maxRooms || 20} Rooms</span>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="flex bg-gray-50 border-b border-gray-100">
                  <button onClick={() => handleEdit(property)} className="flex-1 py-2 text-xs font-bold text-gray-700 hover:text-black hover:bg-gray-100 transition-colors">
                    Edit Contact Info
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => handleDelete(property._id)} className="flex-1 py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors border-l border-gray-100">
                      Delete Property
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-2.5">
                  {property.address && (
                    <div className="flex items-start gap-2.5 text-sm">
                      <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{property.address}</span>
                    </div>
                  )}
                  {property.contactNumber && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{property.contactNumber}</span>
                    </div>
                  )}
                  {property.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">{property.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-sm pt-1 border-t border-gray-100">
                    <QrCode size={14} className="text-purple-600 flex-shrink-0" />
                    {property.upiId ? (
                      <span className="text-xs font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 truncate">
                        UPI: {property.upiId}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium italic">
                        UPI QR not set (Click Edit to configure)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!isSuperAdmin && (
                <div className="p-4 bg-amber-50/50 border-t border-amber-100/80 rounded-b-2xl">
                  <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                    <HelpCircle size={13} className="text-amber-600 flex-shrink-0" />
                    To add another branch/property or upgrade your plan, contact Central Support.
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {properties.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
            <Building size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold text-gray-600">No properties yet</p>
            <p className="text-sm text-gray-400 mt-1">Add your hotel property to get started</p>
          </div>
        )}
      </div>

      {/* Add Property Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
          onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Property Details' : 'Add New Property'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{editingId ? 'Update hotel contact and address details' : 'Register a new hotel property'}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                {formError && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">{formError}</div>}

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Hotel / Property Name <span className="text-red-500">*</span></label>
                  <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                    placeholder="Grand Palace Hotel" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Address</label>
                  <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                    placeholder="123 MG Road, Delhi" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Contact Number</label>
                    <input type="tel" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                      placeholder="9876543210" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Email</label>
                    <input type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                      placeholder="info@hotel.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>

                {/* ⚡ DYNAMIC UPI PAYMENT QR SETTINGS */}
                <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <QrCode size={14} className="text-purple-600" /> Dynamic UPI Payment QR
                    </span>
                    <span className="text-[10px] font-black bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full">
                      Exact Amount Lock
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Hotel UPI ID (VPA)
                    </label>
                    <input type="text" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-bold text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="e.g. hotelroyal@okaxis or 9876543210@paytm" value={formData.upiId} onChange={e => setFormData({...formData, upiId: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">
                      Payee Business Name <span className="text-gray-400 font-normal lowercase">(shown on guest's GPay/PhonePe screen)</span>
                    </label>
                    <input type="text" className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none font-medium text-sm text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="e.g. Hotel Royal Taj" value={formData.upiPayeeName} onChange={e => setFormData({...formData, upiPayeeName: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:px-6 py-4 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 border-t border-gray-100 rounded-b-2xl shrink-0">
                <button type="button" onClick={closeModal} className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 bg-white text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="w-full sm:w-auto px-5 py-2.5 bg-black text-white font-bold rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md active:scale-95">
                  {saving ? 'Saving...' : <><CheckCircle size={15} /> Save Property</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProperties;
