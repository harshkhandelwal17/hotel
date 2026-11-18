import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Users, Plus, Trash2, Building, ShieldCheck, Phone } from 'lucide-react';

const ManageStaff = () => {
  const [staff, setStaff] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    assignedHostel: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [staffRes, hostelsRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/users'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
      ]);
      setStaff(staffRes.data.data);
      setHostels(hostelsRes.data.data);
      if (hostelsRes.data.data.length > 0) {
        setFormData(prev => ({ ...prev, assignedHostel: hostelsRes.data.data[0]._id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await axios.post((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/users', formData);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', assignedHostel: hostels[0]?._id || '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/users/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting user');
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Staff & Receptionist Accounts</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Manage front desk logins, operational roles, and assigned hotel properties</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-all active:scale-95"
        >
          <Plus size={15} /> Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-x-auto">
        <table className="w-full min-w-[500px] divide-y divide-slate-200/80">
          <thead className="bg-slate-50/75">
            <tr>
              <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Staff Details</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Property</th>
              <th className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {staff.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3.5">
                      <div className="text-sm font-bold text-slate-900">{user.name}</div>
                      <div className="text-xs text-slate-500">{user.email}</div>
                      {(() => {
                        const phone = user.phone || (user.assignedHostel?.contactNumber && user.assignedHostel.contactNumber !== 'N/A' ? user.assignedHostel.contactNumber : '');
                        return phone ? (
                          <div className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                            <Phone size={11} className="text-emerald-600" />
                            <span>{phone}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic mt-0.5">No phone added</div>
                        );
                      })()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 items-center gap-1">
                    <ShieldCheck size={12} /> Receptionist
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60 items-center gap-1">
                    <Building size={12} /> {user.assignedHostel?.name || 'Unassigned'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDelete(user._id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg border border-transparent hover:border-rose-200/60 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                  <Users size={44} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-base font-bold text-slate-900">No staff accounts found</p>
                  <p className="text-xs text-slate-500 mt-1">Click the button above to add a front desk receptionist.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-y-auto" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md my-0 sm:my-auto flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200/80" onClick={e => e.stopPropagation()}>
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/75 shrink-0">
              <h2 className="text-base font-bold text-slate-900">Add New Receptionist</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                {error && <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200/60 font-medium">{error}</div>}
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Full Name</label>
                  <input type="text" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium transition-all" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Kumar" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Email / Username</label>
                  <input type="email" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium transition-all" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="rahul@hotelpro.com" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Phone / Mobile Number</label>
                  <input type="tel" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium transition-all" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 9876543210" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Password</label>
                  <input type="password" required minLength="6" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium transition-all" 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Min 6 characters" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Assign Property</label>
                  <select required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white outline-none font-medium transition-all" 
                    value={formData.assignedHostel} onChange={e => setFormData({...formData, assignedHostel: e.target.value})}>
                    {hostels.map(h => (
                      <option key={h._id} value={h._id}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2.5 rounded-b-none sm:rounded-b-2xl shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="w-full sm:flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-xs active:scale-95">
                  {saving ? 'Creating...' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManageStaff;
