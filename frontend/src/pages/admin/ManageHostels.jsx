import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, Plus, X, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';

const ManageProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    name: '', address: '', contactNumber: '', email: ''
  });

  useEffect(() => { fetchProperties(); }, []);

  const fetchProperties = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels');
      setProperties(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels', formData);
      setIsModalOpen(false);
      setFormData({ name: '', address: '', contactNumber: '', email: '' });
      fetchProperties();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error creating property');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Properties</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your hotel properties</p>
        </div>
        <button onClick={() => { setFormError(''); setIsModalOpen(true); }}
          className="bg-black text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-md font-bold text-sm">
          <Plus size={16} /> Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {properties.map(property => (
          <div key={property._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 px-6 py-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-white text-lg">{property.name}</h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${property.isActive ? 'bg-green-400/20 text-green-300 border border-green-500/30' : 'bg-red-400/20 text-red-300'}`}>
                  {property.isActive ? '● Active' : '● Inactive'}
                </span>
              </div>
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
            </div>
          </div>
        ))}

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
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
                <p className="text-xs text-gray-500 mt-0.5">Register a new hotel property</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
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
                <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-200 bg-white text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-black text-white font-bold rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
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
