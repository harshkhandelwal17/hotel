import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  Users, 
  Building, 
  BedDouble, 
  IndianRupee, 
  LogIn, 
  Activity, 
  Sparkles, 
  MessageSquare, 
  Plus, 
  Lock, 
  Unlock, 
  KeyRound, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  UserCheck, 
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Layers,
  ArrowRight,
  Pencil
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  // --- 1. ALL HOOKS STRICTLY AT THE TOP ---
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  
  // Tabs: 'owners' (default) | 'hostels' | 'all-users'
  const [activeTab, setActiveTab] = useState('owners');
  const [searchQuery, setSearchQuery] = useState('');

  // 👤 Create New Hotel Owner (Admin) Modal State
  const [isCreateOwnerOpen, setIsCreateOwnerOpen] = useState(false);
  const [newOwnerForm, setNewOwnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'admin'
  });
  const [creatingOwner, setCreatingOwner] = useState(false);

  // 🏨 Add New Property Modal State
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [newPropertyForm, setNewPropertyForm] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
    owner: '',
    plan: 'starter',
    planStatus: 'active',
    planStartDate: new Date().toISOString().split('T')[0],
    planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    planPrice: 2499,
    billingCycle: 'monthly',
    maxRooms: 25
  });
  const [addingProperty, setAddingProperty] = useState(false);

  // 🎟️ Plan Management Modal State
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

  // ✏️ Edit Property Details Modal State
  const [selectedEditHostel, setSelectedEditHostel] = useState(null);
  const [editPropertyForm, setEditPropertyForm] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
    owner: ''
  });
  const [savingEditProperty, setSavingEditProperty] = useState(false);

  // --- 2. DATA FETCHING EFFECT ---
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
      setUsers(usersRes.data.data || []);
      setHostels(hostelsRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load superadmin data');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. HANDLERS ---
  const handleCreateOwner = async (e) => {
    e.preventDefault();
    if (!newOwnerForm.name.trim() || !newOwnerForm.email.trim() || !newOwnerForm.password.trim()) {
      return alert('Please fill in Name, Email, and Password');
    }

    try {
      setCreatingOwner(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/superadmin/users`, newOwnerForm);
      const createdUser = res.data.data;
      
      alert(`✅ Hotel Owner "${createdUser.name}" created successfully!\nEmail: ${createdUser.email}`);
      setIsCreateOwnerOpen(false);
      
      const prevEmail = newOwnerForm.email;
      setNewOwnerForm({
        name: '',
        email: '',
        phone: '',
        password: 'password123',
        role: 'admin'
      });

      // Refresh data
      await fetchData();

      // Offer to immediately assign a property to this new owner
      if (window.confirm(`Would you like to register their first property now for ${createdUser.name}?`)) {
        setNewPropertyForm(prev => ({
          ...prev,
          owner: createdUser._id,
          contactNumber: createdUser.phone || '',
          email: prevEmail
        }));
        setIsAddPropertyOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create hotel owner');
    } finally {
      setCreatingOwner(false);
    }
  };

  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!newPropertyForm.name.trim()) return alert('Property name is required');
    if (!newPropertyForm.owner) return alert('Please select a Hotel Owner (Admin) for this property');

    try {
      setAddingProperty(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/hostels`, newPropertyForm);
      alert(`✅ Property "${res.data.data.name}" registered successfully and linked to owner!`);
      
      setIsAddPropertyOpen(false);
      setNewPropertyForm({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        owner: '',
        plan: 'starter',
        planStatus: 'active',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planPrice: 2499,
        billingCycle: 'monthly',
        maxRooms: 25
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create property');
    } finally {
      setAddingProperty(false);
    }
  };

  const handleToggleHostelStatus = async (hostelId, currentStatus) => {
    const actionText = currentStatus !== false ? 'Lock / Disable' : 'Activate / Enable';
    if (!window.confirm(`Are you sure you want to ${actionText} this property?`)) return;

    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-status`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, isActive: res.data.data.isActive } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle property status');
    }
  };

  const handleDeleteHostel = async (hostelId, name) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to completely delete "${name}"?\nAll associated data will be removed. This cannot be undone.`)) return;
    
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.delete(`${API}/api/hostels/${hostelId}`);
      setHostels(hostels.filter(h => h._id !== hostelId));
      alert(`✅ Property "${name}" deleted successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete property');
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`⚠️ DANGER: Are you sure you want to delete user "${name}"?`)) return;
    
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.delete(`${API}/api/superadmin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      alert(`✅ User "${name}" deleted successfully.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/users/${userId}/toggle-status`);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.data.isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (userId, name) => {
    const newPassword = window.prompt(`Enter new password for ${name}:`, "123456");
    if (!newPassword) return;
    
    if (!window.confirm(`Reset password for "${name}" to "${newPassword}"?\nAll active sessions across devices will be revoked immediately.`)) return;
    
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/superadmin/users/${userId}/reset-password`, { password: newPassword });
      alert(`✅ Password updated successfully for ${name}.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleImpersonate = async (targetUserId, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to log in as this user? You will need to click "Return to Super Admin" or log out to return.')) return;
    
    try {
      setImpersonating(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/superadmin/impersonate`, { userId: targetUserId });
      const { token, user: targetUser } = res.data;
      
      localStorage.setItem('superAdminToken', localStorage.getItem('token'));
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));
      
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.message || 'Impersonation failed');
      setImpersonating(false);
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
      plan: h.plan || 'starter',
      planStatus: h.planStatus || 'active',
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

  const openEditPropertyModal = (h) => {
    setSelectedEditHostel(h);
    setEditPropertyForm({
      name: h.name || '',
      address: h.address || '',
      contactNumber: h.contactNumber || '',
      email: h.email || '',
      owner: h.owner?._id || h.owner || ''
    });
  };

  const handleSaveEditProperty = async (e) => {
    e.preventDefault();
    if (!selectedEditHostel) return;
    try {
      setSavingEditProperty(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/hostels/${selectedEditHostel._id}`, editPropertyForm);
      alert(`✅ Property details updated successfully for "${editPropertyForm.name}"`);
      setSelectedEditHostel(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update property details');
    } finally {
      setSavingEditProperty(false);
    }
  };

  // Helper to open Add Property modal pre-configured for a specific owner
  const openAddPropertyForOwner = (ownerId) => {
    const owner = users.find(u => u._id === ownerId);
    setNewPropertyForm(prev => ({
      ...prev,
      owner: ownerId,
      contactNumber: owner?.phone || '',
      email: owner?.email || ''
    }));
    setIsAddPropertyOpen(true);
  };

  // --- 4. FILTERED DATA CALCULATIONS ---
  const hotelOwners = users.filter(u => u.role === 'admin');
  
  const filteredOwners = hotelOwners.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone && u.phone.includes(searchQuery))
  );

  const filteredHostels = hostels.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.contactNumber && h.contactNumber.includes(searchQuery)) ||
    (h.owner?.name && h.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (h.owner?.email && h.owner.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (h.owner?.phone && h.owner.phone.includes(searchQuery)) ||
    (h.address && h.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAllUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone && u.phone.includes(searchQuery)) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeHostelsCount = hostels.filter(h => h.isActive !== false).length;
  const lockedHostelsCount = hostels.filter(h => h.isActive === false).length;

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-red-600"></div>
        <p className="text-sm font-bold text-gray-500">Loading Super Admin Headquarters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-3xl font-bold flex items-center gap-3">
        <AlertTriangle size={24} />
        <div>
          <p className="text-base font-black">Failed to load headquarters data</p>
          <p className="text-xs font-medium text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* 🚀 TOP HERO BANNER WITH FAST ACTIONS */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden border border-gray-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-red-600/20 border border-red-500/30 rounded-2xl backdrop-blur-sm text-red-400">
              <ShieldAlert size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                  Master Control Portal
                </span>
                <span className="text-[10px] font-bold text-gray-400">SaaS Multi-Tenant</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight mt-1">Super Admin Headquarters</h1>
              <p className="text-gray-400 text-sm mt-1">Manage Hotel Owners, attach multiple properties, and configure subscriptions.</p>
            </div>
          </div>

          {/* Quick Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCreateOwnerOpen(true)}
              className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/30 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>+ Create Hotel Owner</span>
            </button>
            <button
              onClick={() => {
                setNewPropertyForm(prev => ({ ...prev, owner: '' }));
                setIsAddPropertyOpen(true);
              }}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-white/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Building size={16} />
              <span>+ Register Property</span>
            </button>
          </div>
        </div>

        {/* 3-Step Logical Workflow Hint Card */}
        
      </div>

      {/* 📊 SYSTEM METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Hotel Owners', value: hotelOwners.length, icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Properties', value: stats?.totalHostels || hostels.length, icon: Building, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Props', value: activeHostelsCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Locked Props', value: lockedHostelsCount, icon: Lock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Total Rooms', value: stats?.totalRooms || 0, icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className={`p-3 rounded-2xl ${s.bg} ${s.color} mb-2`}><s.icon size={22} /></div>
            <h3 className="text-2xl font-black text-gray-900">{s.value}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 🗂️ MAIN TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-gray-100/70 p-2 rounded-2xl border border-gray-200">
        <div className="flex gap-1.5 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('owners')} 
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'owners' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Briefcase size={15} />
            <span>Hotel Owners (Admins)</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 font-bold ml-1">
              {hotelOwners.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('hostels')} 
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'hostels' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building size={15} />
            <span>Properties & Plans</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-bold ml-1">
              {hostels.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('all-users')} 
            className={`px-5 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all-users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={15} />
            <span>All Staff & Users</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-200 text-gray-700 font-bold ml-1">
              {users.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={
              activeTab === 'owners' ? "Search owners by name, email..." :
              activeTab === 'hostels' ? "Search properties..." : "Search all users..."
            }
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" 
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: 🏢 HOTEL OWNERS (ADMINS) - PRIMARY CLIENT MANAGEMENT */}
      {/* ============================================================== */}
      {activeTab === 'owners' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900">Registered Hotel Owners (Clients)</h2>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 rounded-md">
                  Admin Role
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Each owner can manage multiple properties. Create their account here first, then attach properties below.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOwnerOpen(true)}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Create Hotel Owner</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner / Client</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Attached Properties</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredOwners.map(o => {
                  const ownerProps = hostels.filter(h => (h.owner?._id || h.owner) === o._id);
                  const activeProps = ownerProps.filter(h => h.isActive !== false);
                  const lockedProps = ownerProps.filter(h => h.isActive === false);

                  return (
                    <tr key={o._id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Owner Identity */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                            {o.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{o.name}</p>
                            <p className="text-xs text-gray-500 font-medium">{o.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {o.phone ? (
                            <a 
                              href={`tel:${o.phone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                              title="Click to call"
                            >
                              <Phone size={13} className="text-emerald-600" />
                              <span>{o.phone}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 italic">
                              <Phone size={13} className="text-gray-300" />
                              <span>No phone added</span>
                            </div>
                          )}
                          <div className="text-[10px] font-bold text-gray-400">
                            Joined {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </td>

                      {/* Attached Properties */}
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-gray-900">
                              {ownerProps.length} {ownerProps.length === 1 ? 'Property' : 'Properties'}
                            </span>
                            {ownerProps.length > 0 && (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                {activeProps.length} Active / {lockedProps.length} Locked
                              </span>
                            )}
                          </div>

                          {/* List Property Badges */}
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {ownerProps.map(h => (
                              <span 
                                key={h._id} 
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                  h.isActive !== false 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-amber-50 text-amber-800 border-amber-200 opacity-80'
                                }`}
                              >
                                {h.isActive !== false ? <CheckCircle2 size={10} className="text-emerald-500" /> : <Lock size={10} className="text-amber-500" />}
                                <span>{h.name}</span>
                                <span className="opacity-60 text-[9px]">({h.plan || 'starter'})</span>
                              </span>
                            ))}
                            {ownerProps.length === 0 && (
                              <span className="text-xs text-amber-600 font-semibold italic">
                                No properties attached yet.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {o.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-gray-100 text-gray-600">
                            <Lock size={10} /> Disabled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Attach New Property Button */}
                          <button
                            onClick={() => openAddPropertyForOwner(o._id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95"
                            title="Add property for this owner"
                          >
                            <Plus size={11} className="stroke-[3]" />
                            <span>Add Property</span>
                          </button>

                          {/* Login As (Impersonate) */}
                          <button
                            onClick={(e) => handleImpersonate(o._id, e)}
                            disabled={impersonating || o.isActive === false}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 disabled:opacity-40"
                            title="Log in to this Owner's dashboard"
                          >
                            <LogIn size={11} />
                            <span>Login As</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(o._id, o.name)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all active:scale-95"
                            title="Reset password"
                          >
                            <KeyRound size={13} />
                          </button>

                          {/* Toggle Active / Disabled */}
                          <button
                            onClick={() => handleToggleUserStatus(o._id)}
                            className={`p-1.5 rounded-lg transition-all active:scale-95 ${
                              o.isActive !== false ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                            title={o.isActive !== false ? "Disable account" : "Enable account"}
                          >
                            {o.isActive !== false ? <Lock size={13} /> : <Unlock size={13} />}
                          </button>

                          {/* Delete Owner */}
                          <button
                            onClick={() => handleDeleteUser(o._id, o.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all active:scale-95"
                            title="Delete user"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOwners.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Briefcase size={36} className="text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-700">No Hotel Owners found.</p>
                        <p className="text-xs text-gray-400 mt-1">Click the "+ Create Hotel Owner" button above to register your first client.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: 🏨 ALL PROPERTIES & SUBSCRIPTIONS */}
      {/* ============================================================== */}
      {activeTab === 'hostels' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">All Registered Hotel Properties</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Control property access, plan validity, and toggle active/locked state for any hotel.
              </p>
            </div>
            <button
              onClick={() => {
                setNewPropertyForm(prev => ({ ...prev, owner: '' }));
                setIsAddPropertyOpen(true);
              }}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Register New Property</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner (Admin)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan & Pricing</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validity & Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property Access</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">AI & WhatsApp</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredHostels.map(h => {
                  const isTrial = h.planStatus === 'trial' || h.plan === 'demo';
                  const isExpired = h.planStatus === 'expired' || (h.planEndDate && new Date(h.planEndDate) < new Date());
                  const daysLeft = h.planEndDate ? Math.max(0, Math.ceil((new Date(h.planEndDate) - new Date()) / (1000 * 60 * 60 * 24))) : null;
                  const isLocked = h.isActive === false;

                  return (
                    <tr key={h._id} className={`hover:bg-gray-50/80 transition-colors ${isLocked ? 'bg-amber-50/20' : ''}`}>
                      {/* Property Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-bold shadow-sm ${
                            isLocked ? 'bg-amber-100 text-amber-700' : 'bg-blue-600 text-white'
                          }`}>
                            <Building size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-gray-900 text-sm">{h.name}</p>
                              {isLocked && (
                                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 rounded">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-gray-500">{h.address || 'No Address'}</p>
                            <p className="text-[10px] font-bold text-gray-400">📞 {h.contactNumber || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-bold text-gray-900 text-xs flex items-center gap-1">
                            <Briefcase size={12} className="text-gray-400" />
                            <span>{h.owner?.name || 'Unassigned'}</span>
                          </div>
                          <div className="text-[11px] text-gray-500">{h.owner?.email || 'N/A'}</div>
                          {h.owner?.phone ? (
                            <a 
                              href={`tel:${h.owner.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                              title="Click to call owner"
                            >
                              <Phone size={10} className="text-emerald-600" />
                              <span>{h.owner.phone}</span>
                            </a>
                          ) : (
                            <div className="text-[10px] font-medium text-gray-400 italic">No owner phone</div>
                          )}
                        </div>
                      </td>

                      {/* Plan & Pricing */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider w-max ${
                            h.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700' :
                            h.plan === 'professional' ? 'bg-purple-100 text-purple-700' :
                            h.plan === 'starter' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {h.plan || 'Starter'} Plan ({h.billingCycle || 'monthly'})
                          </span>
                          <span className="text-[11px] font-bold text-gray-600">
                            ₹{h.planPrice || 0} · Max {h.maxRooms || 20} Rooms
                          </span>
                        </div>
                      </td>

                      {/* Validity */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`text-xs font-black ${isExpired ? 'text-red-600' : isTrial ? 'text-amber-600' : 'text-emerald-700'}`}>
                            {isExpired ? '⚠️ Expired' : isTrial ? 'Trial / Demo' : '● Paid Active'}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500 mt-0.5">
                            {h.planEndDate ? new Date(h.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No End Date'}
                          </span>
                          {daysLeft !== null && !isExpired && (
                            <span className="text-[10px] font-bold text-emerald-600">{daysLeft} days remaining</span>
                          )}
                        </div>
                      </td>

                      {/* Property Access Switch (One-Click Active / Locked) */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleHostelStatus(h._id, h.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 border ${
                            h.isActive !== false
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          }`}
                          title={h.isActive !== false ? "Click to Lock / Disable this property" : "Click to Enable / Unlock this property"}
                        >
                          {h.isActive !== false ? (
                            <>
                              <Unlock size={12} className="text-emerald-600" />
                              <span>Enabled (Active)</span>
                            </>
                          ) : (
                            <>
                              <Lock size={12} className="text-amber-600" />
                              <span>Locked (Disabled)</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* AI & WhatsApp Features */}
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

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditPropertyModal(h)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95"
                            title="Edit property details"
                          >
                            <Pencil size={11} />
                            <span>Edit Info</span>
                          </button>

                          <button
                            onClick={() => openPlanModal(h)}
                            className="px-3 py-1.5 bg-black hover:bg-gray-800 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all shadow-sm active:scale-95"
                          >
                            Manage Plan
                          </button>

                          <button
                            onClick={() => handleDeleteHostel(h._id, h.name)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all active:scale-95"
                            title="Delete property"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredHostels.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-500 font-bold">
                      No properties found matching your filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: 👥 ALL SYSTEM USERS & STAFF */}
      {/* ============================================================== */}
      {activeTab === 'all-users' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900">All System Accounts</h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Surveillance and login impersonation for Super Admins, Hotel Owners (Admins), and Receptionists.
              </p>
            </div>
            <button
              onClick={() => setIsCreateOwnerOpen(true)}
              className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Create Account</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone / Mobile</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role & Assignment</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredAllUsers.map(u => (
                  <tr key={u._id} className={`hover:bg-gray-50/80 transition-colors ${u.isActive === false ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-bold text-base">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {u.phone ? (
                        <a 
                          href={`tel:${u.phone}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                          title="Click to call"
                        >
                          <Phone size={12} className="text-emerald-600" />
                          <span>{u.phone}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 font-medium italic">No phone added</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                        u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'Hotel Owner (Admin)' : u.role}
                      </span>
                      {u.assignedHostel && (
                        <p className="text-[11px] font-bold text-gray-500 mt-1 flex items-center gap-1">
                          <Building size={11} /> {u.assignedHostel.name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.isActive !== false ? (
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-emerald-100 text-emerald-700">Active</span>
                      ) : (
                        <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-gray-200 text-gray-600">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u._id !== user.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleToggleUserStatus(u._id)} 
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm ${
                              u.isActive !== false ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {u.isActive !== false ? 'Disable' : 'Enable'}
                          </button>
                          <button 
                            onClick={() => handleResetPassword(u._id, u.name)} 
                            className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all active:scale-95 shadow-sm"
                          >
                            Reset Pass
                          </button>
                          <button 
                            onClick={(e) => handleImpersonate(u._id, e)}
                            disabled={impersonating || u.isActive === false}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            <LogIn size={11} /> Log In As
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u._id, u.name)} 
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all active:scale-95"
                            title="Delete Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2">Current Super Admin</span>
                      )}
                    </td>
                  </tr>
                ))}

                {filteredAllUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Users size={36} className="text-gray-300 mb-2" />
                        <p className="text-sm font-bold text-gray-700">No users found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 👤 MODAL 1: CREATE NEW HOTEL OWNER (ADMIN) */}
      {/* ============================================================== */}
      {isCreateOwnerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsCreateOwnerOpen(false)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/20 px-2.5 py-0.5 rounded-full">
                  Step 1 · Client Onboarding
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">Create New Hotel Owner (Admin)</h3>
                <p className="text-xs text-gray-400 mt-0.5">This creates the master login for the hotel owner.</p>
              </div>
              <button onClick={() => setIsCreateOwnerOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOwner} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Owner Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newOwnerForm.name}
                  onChange={e => setNewOwnerForm({ ...newOwnerForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address (Login ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rajesh@hotelroyal.com"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newOwnerForm.email}
                  onChange={e => setNewOwnerForm({ ...newOwnerForm, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newOwnerForm.phone}
                    onChange={e => setNewOwnerForm({ ...newOwnerForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newOwnerForm.password}
                    onChange={e => setNewOwnerForm({ ...newOwnerForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900">
                <Briefcase size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Role: Admin (Hotel Owner)</strong>. Once created, you can attach their first property or multiple properties immediately.
                </p>
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOwnerOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOwner}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {creatingOwner ? 'Creating Owner...' : 'Create Hotel Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🏨 MODAL 2: REGISTER NEW PROPERTY & ASSIGN TO OWNER */}
      {/* ============================================================== */}
      {isAddPropertyOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setIsAddPropertyOpen(false)}>
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-2.5 py-0.5 rounded-full">
                  Step 2 · Property Provisioning
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">Register New Hotel Property</h3>
                <p className="text-xs text-gray-400 mt-0.5">Attach to a Hotel Owner and configure their subscription plan.</p>
              </div>
              <button onClick={() => setIsAddPropertyOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-6 space-y-4">
              {/* Hotel Owner Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Select Hotel Owner (Admin) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.owner}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, owner: e.target.value })}
                >
                  <option value="">Select an Owner from the list...</option>
                  {hotelOwners.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email}) {u.phone ? `· ${u.phone}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Don't see the owner? Create them first using the "+ Create Hotel Owner" button.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Heritage Resort"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.name}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Property Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newPropertyForm.contactNumber}
                    onChange={e => setNewPropertyForm({ ...newPropertyForm, contactNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    placeholder="hotel@gmail.com"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={newPropertyForm.email}
                    onChange={e => setNewPropertyForm({ ...newPropertyForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Property Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42, Civil Lines, Jaipur, Rajasthan"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.address}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, address: e.target.value })}
                />
              </div>

              {/* Initial Plan Allocation Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  🎟️ Step 3 · Initial Plan & Validity
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
                      <option value="active">Active (Paid)</option>
                      <option value="trial">Trial</option>
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
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                      <option value="lifetime">Lifetime</option>
                      <option value="trial">Trial</option>
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
                  {addingProperty ? 'Registering...' : 'Register & Link to Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎟️ MODAL 3: EDIT SUBSCRIPTION PLAN */}
      {/* ============================================================== */}
      {selectedPlanHostel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedPlanHostel(null)}>
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
                    <option value="active">Active (Paid)</option>
                    <option value="trial">Trial</option>
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

      {/* ✏️ EDIT PROPERTY DETAILS MODAL */}
      {selectedEditHostel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedEditHostel(null)}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-2.5 py-0.5 rounded-full">
                  Property Configuration
                </span>
                <h3 className="text-xl font-black text-white mt-1.5">Edit Property Details</h3>
                <p className="text-xs text-gray-400 mt-0.5">Modify property name, address, contact, or reassign owner.</p>
              </div>
              <button onClick={() => setSelectedEditHostel(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditProperty} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Property Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={editPropertyForm.name}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Assigned Hotel Owner (Admin) <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={editPropertyForm.owner}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, owner: e.target.value })}
                >
                  <option value="">Select an Owner...</option>
                  {hotelOwners.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={editPropertyForm.contactNumber}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, contactNumber: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Official Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                    value={editPropertyForm.email}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Address
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-black"
                  value={editPropertyForm.address}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, address: e.target.value })}
                />
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedEditHostel(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditProperty}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  {savingEditProperty ? 'Saving...' : 'Save Details'}
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
