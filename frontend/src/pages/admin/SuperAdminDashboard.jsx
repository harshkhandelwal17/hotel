import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Users, Building, BedDouble, IndianRupee, LogIn, Activity, AlertCircle, Sparkles, MessageSquare } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const { user, login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  // Plan management state (must be at top level before any early return)
  const [selectedPlanHostel, setSelectedPlanHostel] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan: 'starter',
    planStatus: 'active',
    planStartDate: '',
    planEndDate: '',
    planPrice: 0,
    billingCycle: 'monthly',
    maxRooms: 20,
    planNotes: ''
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // 🏨 Add New Property Modal State (Super Admin Only)
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [newPropertyForm, setNewPropertyForm] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
    owner: '',
    plan: 'demo',
    planStatus: 'trial',
    planStartDate: new Date().toISOString().split('T')[0],
    planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    planPrice: 0,
    billingCycle: 'trial',
    maxRooms: 20
  });
  const [addingProperty, setAddingProperty] = useState(false);

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const [statsRes, usersRes, hostelsRes] = await Promise.all([
        axios.get(`${API}/api/superadmin/stats`),
        axios.get(`${API}/api/superadmin/users`),
        axios.get(`${API}/api/superadmin/hostels`)
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setHostels(hostelsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load superadmin data');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUserId, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to log in as this user? You will need to log out to return to Super Admin.')) return;
    
    try {
      setImpersonating(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/superadmin/impersonate`, { userId: targetUserId });
      
      const { token, user: targetUser } = res.data;
      
      // Update local storage and context
      localStorage.setItem('superAdminToken', localStorage.getItem('token'));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));
      
      // Force reload to reset all states and contexts with new user
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.message || 'Impersonation failed');
      setImpersonating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold">{error}</div>;
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (userId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/users/${userId}/toggle-status`);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.data.isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter new password for this user:", "123456");
    if (!newPassword) return; // User cancelled
    
    if (!window.confirm(`Are you sure you want to change the password to "${newPassword}"?\n\n⚡ All active sessions across all devices for this user will be immediately logged out.`)) return;
    
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/superadmin/users/${userId}/reset-password`, { password: newPassword });
      alert(`✅ Password reset successfully to: ${newPassword}\n\nAll active devices have been logged out.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleToggleAiOcr = async (hostelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-ai-ocr`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, aiOcrEnabled: res.data.data.aiOcrEnabled } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle AI OCR status');
    }
  };

  const handleToggleWhatsAppSync = async (hostelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-whatsapp-sync`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, whatsappSyncEnabled: res.data.data.whatsappSyncEnabled } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle WhatsApp Sync status');
    }
  };

  const openPlanModal = (h) => {
    setSelectedPlanHostel(h);
    const startIso = h.planStartDate ? new Date(h.planStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endIso = h.planEndDate ? new Date(h.planEndDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPlanForm({
      plan: h.plan || 'demo',
      planStatus: h.planStatus || 'trial',
      planStartDate: startIso,
      planEndDate: endIso,
      planPrice: h.planPrice || 0,
      billingCycle: h.billingCycle || 'monthly',
      maxRooms: h.maxRooms || 20,
      planNotes: h.planNotes || ''
    });
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanHostel) return;
    try {
      setSavingPlan(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${selectedPlanHostel._id}/plan`, planForm);
      setHostels(hostels.map(h => h._id === selectedPlanHostel._id ? res.data.data : h));
      alert(`✅ Subscription plan updated successfully for ${selectedPlanHostel.name}`);
      setSelectedPlanHostel(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newPropertyForm.name.trim()) return alert('Property name is required');
    if (!newPropertyForm.owner) return alert('Please select a hotel owner / admin for this property');

    try {
      setAddingProperty(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/hostels`, newPropertyForm);
      alert(`✅ New property "${res.data.data.name}" registered successfully!`);
      setIsAddPropertyOpen(false);
      setNewPropertyForm({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        owner: '',
        plan: 'demo',
        planStatus: 'trial',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planPrice: 0,
        billingCycle: 'trial',
        maxRooms: 20
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create property');
    } finally {
      setAddingProperty(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-red-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><ShieldAlert size={40} className="text-white" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Super Admin Headquarters</h1>
            <p className="text-red-100 mt-1 font-medium">System-wide surveillance and access controls.</p>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Properties', value: stats?.totalHostels, icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Rooms', value: stats?.totalRooms, icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Stays', value: stats?.totalStays, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Today Bookings', value: stats?.todayStays || 0, icon: Activity, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'System Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color} mb-3`}><s.icon size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900">{s.value}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit mt-8">
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
          System Users
        </button>
        <button onClick={() => setActiveTab('hostels')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'hostels' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
          Properties / Hostels
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mt-4">
        {activeTab === 'users' ? (
        <>
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">System Users (Imposter Mode)</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage users, reset passwords, or login as them.</p>
          </div>
          <div className="relative w-full sm:w-64">
             <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Role & Access</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u._id} className={`hover:bg-gray-50 transition-colors ${u.isActive === false ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                      u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                    {u.assignedHostel && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1.5 flex items-center gap-1">
                        <Building size={10} /> {u.assignedHostel.name}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.isActive !== false ? (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-gray-200 text-gray-600">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u._id !== user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggleStatus(u._id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm ${u.isActive !== false ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {u.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleResetPassword(u._id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all active:scale-95 shadow-sm">
                          Reset Pass
                        </button>
                        <button 
                          onClick={(e) => handleImpersonate(u._id, e)}
                          disabled={impersonating || u.isActive === false}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                        >
                          <LogIn size={12} /> Log In As
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2">You (Active)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        ) : (
        <>
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Registered Properties</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Total {hostels.length} unique hotels/hostels in the system.</p>
          </div>
          <button
            onClick={() => setIsAddPropertyOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <span>+ Add New Property</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Subscription Plan</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Validity</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">AI & WhatsApp</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {hostels.map(h => {
                const isTrial = h.planStatus === 'trial' || h.plan === 'demo';
                const isExpired = h.planStatus === 'expired' || (h.planEndDate && new Date(h.planEndDate) < new Date());
                const daysLeft = h.planEndDate ? Math.max(0, Math.ceil((new Date(h.planEndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;

                return (
                  <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                          <Building size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{h.name}</p>
                          <p className="text-[10px] font-bold text-gray-400">📞 {h.contactNumber || 'No Phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{h.owner?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{h.owner?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider w-max ${
                          h.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700' :
                          h.plan === 'professional' ? 'bg-purple-100 text-purple-700' :
                          h.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {h.plan || 'Demo'} Plan ({h.billingCycle || 'trial'})
                        </span>
                        <span className="text-[11px] font-bold text-gray-500">
                          ₹{h.planPrice || 0} · Max {h.maxRooms || 20} Rooms
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs font-black ${isExpired ? 'text-red-600' : isTrial ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {isExpired ? '⚠️ Expired' : isTrial ? 'Trial / Demo' : '● Active'}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
                          {h.planEndDate ? new Date(h.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No End Date'}
                        </span>
                        {daysLeft !== null && !isExpired && (
                          <span className="text-[10px] font-bold text-emerald-600">{daysLeft} days remaining</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleAiOcr(h._id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${
                            h.aiOcrEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                          title="Toggle AI OCR Scanner"
                        >
                          <Sparkles size={11} className={h.aiOcrEnabled ? 'text-emerald-500 fill-emerald-500' : 'text-gray-400'} />
                          {h.aiOcrEnabled ? 'OCR On' : 'OCR Off'}
                        </button>
                        <button
                          onClick={() => handleToggleWhatsAppSync(h._id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${
                            h.whatsappSyncEnabled
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-400 border border-gray-200'
                          }`}
                          title="Toggle WhatsApp Sync"
                        >
                          <MessageSquare size={11} className={h.whatsappSyncEnabled ? 'text-emerald-500 fill-emerald-500' : 'text-gray-400'} />
                          {h.whatsappSyncEnabled ? 'WA On' : 'WA Off'}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openPlanModal(h)}
                        className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95"
                      >
                        Manage Plan
                      </button>
                    </td>
                  </tr>
                );
              })}
              {hostels.length === 0 && (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500 font-bold">No properties found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {/* 🎟️ EDIT SUBSCRIPTION PLAN MODAL */}
      {selectedPlanHostel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPlanHostel(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gray-950 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Subscription & Billing
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">{selectedPlanHostel.name}</h3>
                <p className="text-xs text-gray-400">Owner: {selectedPlanHostel.owner?.name || 'Unknown'} ({selectedPlanHostel.owner?.email})</p>
              </div>
              <button onClick={() => setSelectedPlanHostel(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Plan Type</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.plan}
                    onChange={e => setPlanForm({ ...planForm, plan: e.target.value })}
                  >
                    <option value="demo">Demo / Free Trial</option>
                    <option value="starter">Starter Plan</option>
                    <option value="professional">Professional Plan</option>
                    <option value="enterprise">Enterprise Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.planStatus}
                    onChange={e => setPlanForm({ ...planForm, planStatus: e.target.value })}
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active (Paid)</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.planStartDate}
                    onChange={e => setPlanForm({ ...planForm, planStartDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">End Date (Expiry)</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.planEndDate}
                    onChange={e => setPlanForm({ ...planForm, planEndDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.planPrice}
                    onChange={e => setPlanForm({ ...planForm, planPrice: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                  <select
                    className="w-full px-2.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.billingCycle}
                    onChange={e => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                  >
                    <option value="trial">Trial</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Max Rooms</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={planForm.maxRooms}
                    onChange={e => setPlanForm({ ...planForm, maxRooms: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Internal Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid ₹3000 via UPI on 12th Oct"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                  value={planForm.planNotes}
                  onChange={e => setPlanForm({ ...planForm, planNotes: e.target.value })}
                />
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedPlanHostel(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {savingPlan ? 'Saving...' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🏨 ADD NEW PROPERTY MODAL (SUPER ADMIN ONLY) */}
      {isAddPropertyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAddPropertyOpen(false)}>
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gray-950 text-white flex justify-between items-start sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/20 px-2.5 py-0.5 rounded-full">
                  Super Admin Provisioning
                </span>
                <h3 className="text-lg font-black text-white mt-1.5">Register New Hotel / Property</h3>
                <p className="text-xs text-gray-400">Assign to hotel owner and allocate their initial subscription plan.</p>
              </div>
              <button onClick={() => setIsAddPropertyOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Hotel / Property Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Heritage Palace"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.name}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Assign Property Owner (Admin) <span className="text-red-500">*</span></label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.owner}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, owner: e.target.value })}
                >
                  <option value="">Select an Admin / Owner...</option>
                  {users.filter(u => u.role === 'admin' || u.role === 'superadmin').map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) — [{u.role.toUpperCase()}]
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">This user will be the primary owner and will manage this hotel.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newPropertyForm.contactNumber}
                    onChange={e => setNewPropertyForm({ ...newPropertyForm, contactNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Official Email</label>
                  <input
                    type="email"
                    placeholder="hotel@gmail.com"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newPropertyForm.email}
                    onChange={e => setNewPropertyForm({ ...newPropertyForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Full Address</label>
                <input
                  type="text"
                  placeholder="Plot 42, Civil Lines, Jaipur, Rajasthan"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.address}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, address: e.target.value })}
                />
              </div>

              {/* INITIAL SUBSCRIPTION PLAN ALLOCATION */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  🎟️ Initial Subscription Plan Settings
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Plan</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.plan}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, plan: e.target.value })}
                    >
                      <option value="demo">Demo / Free Trial</option>
                      <option value="starter">Starter Plan</option>
                      <option value="professional">Professional Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">Status</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.planStatus}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, planStatus: e.target.value })}
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active (Paid)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Price (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.planPrice}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, planPrice: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Billing</label>
                    <select
                      className="w-full px-2 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.billingCycle}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, billingCycle: e.target.value })}
                    >
                      <option value="trial">Trial</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Max Rooms</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.maxRooms}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, maxRooms: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.planStartDate}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, planStartDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      className="w-full px-2.5 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none"
                      value={newPropertyForm.planEndDate}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, planEndDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddPropertyOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingProperty}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {addingProperty ? 'Registering...' : 'Register & Allocate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
