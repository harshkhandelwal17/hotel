import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { 
  Building, 
  Crown, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  LogIn, 
  KeyRound, 
  Phone, 
  Mail, 
  Sparkles, 
  LogOut, 
  ShieldCheck, 
  Users, 
  BedDouble, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SalesDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [hotels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs: 'mine' (default) | 'all'
  const [activeTab, setActiveTab] = useState('mine');
  const [searchQuery, setSearchQuery] = useState('');

  // 🚀 Onboarding Modal State
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerPassword: 'password123',
    hotelName: '',
    hotelAddress: '',
    hotelContact: '',
    plan: 'demo',
    planPrice: 0,
    billingCycle: 'monthly',
    maxRooms: 20
  });
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'sales' && user.role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const [statsRes, hotelsRes] = await Promise.all([
        axios.get(`${API}/api/sales/stats`),
        axios.get(`${API}/api/sales/hostels`)
      ]);
      setStats(statsRes.data?.data || null);
      setHostels(hotelsRes.data?.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to load sales data:', err);
      setError(err.response?.data?.message || 'Failed to load sales dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1-Step Hotel Onboarding
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!onboardForm.ownerName.trim() || !onboardForm.ownerEmail.trim()) {
      alert('Please fill in Owner Name and Email');
      return;
    }
    if (!onboardForm.hotelName.trim()) {
      alert('Please enter Property / Hotel Name');
      return;
    }

    try {
      setOnboardingLoading(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/onboard`, onboardForm);

      alert(`✅ Hotel "${res.data.data.hostel.name}" successfully onboarded!\nOwner: ${res.data.data.owner.name} (${res.data.data.owner.email})`);
      setIsOnboardOpen(false);
      
      const createdOwnerId = res.data.data.owner._id;
      const createdHotelName = res.data.data.hostel.name;

      // Reset form
      setOnboardForm({
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: 'password123',
        hotelName: '',
        hotelAddress: '',
        hotelContact: '',
        plan: 'demo',
        planPrice: 0,
        billingCycle: 'monthly',
        maxRooms: 20
      });

      await fetchData();

      // Offer immediate demo launch
      if (window.confirm(`Would you like to launch Demo Mode right now for "${createdHotelName}"?`)) {
        handleSalesImpersonate(createdOwnerId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to onboard hotel');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // ⚡ 1-Click Launch Demo / Support Mode (Sales Impersonation)
  const handleSalesImpersonate = async (targetUserId, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!targetUserId) {
      alert('⚠️ User ID is missing');
      return;
    }

    if (!window.confirm('Launch Demo / Support Mode for this hotel?\nYou can return back to Sales Portal anytime by clicking "Return to Sales Portal" on the top banner.')) {
      return;
    }

    try {
      setImpersonatingId(targetUserId);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/impersonate`, { userId: targetUserId });
      const { token, user: targetUser } = res.data;

      if (!token) throw new Error('No authentication token received');

      // Preserve sales agent session for return
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        localStorage.setItem('salesAdminToken', currentToken);
        localStorage.setItem('impersonateReturnUrl', '/sales');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      if (targetUser.assignedHostel) {
        const assignedId = typeof targetUser.assignedHostel === 'object' ? targetUser.assignedHostel._id : targetUser.assignedHostel;
        localStorage.setItem('adminGlobalProperty', assignedId);
      } else {
        localStorage.setItem('adminGlobalProperty', 'all');
      }

      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Demo launch error:', err);
      alert(err.response?.data?.message || err.message || 'Failed to launch demo mode');
      setImpersonatingId(null);
    }
  };

  // 🔑 Reset Client Password on field
  const handleResetPassword = async (userId, userName) => {
    const newPassword = window.prompt(`Enter new password for ${userName}:`, "123456");
    if (!newPassword || newPassword.trim() === '') return;

    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/sales/reset-password`, { userId, newPassword: newPassword.trim() });
      alert(`✅ Password successfully updated to "${newPassword.trim()}" for ${userName}.`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  // Filtered Hotels
  const filteredHotels = hotels.filter((h) => {
    if (activeTab === 'mine' && !h.isMine) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.address && h.address.toLowerCase().includes(q)) ||
      (h.contactNumber && h.contactNumber.includes(q)) ||
      (h.owner?.name && h.owner.name.toLowerCase().includes(q)) ||
      (h.owner?.email && h.owner.email.toLowerCase().includes(q)) ||
      (h.owner?.phone && h.owner.phone.includes(q))
    );
  });

  const myHotelsList = hotels.filter(h => h.isMine);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
        <p className="text-sm font-bold text-gray-500">Loading Sales Executive Headquarters...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 🚀 TOP HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl backdrop-blur-sm text-indigo-400 shrink-0">
              <ShieldCheck size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  Field Executive Partner
                </span>
                <span className="text-[10px] font-bold text-gray-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                  Hotel Growth & Support Portal
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                {user?.name || 'Sales Partner'}
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                Onboard new hotel clients on-site, launch live demos, and troubleshoot client accounts.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setIsOnboardOpen(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>+ Onboard Hotel Client</span>
            </button>

            {user?.role === 'superadmin' && (
              <button
                onClick={() => navigate('/superadmin')}
                className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-2xl transition-all"
              >
                Back to Super Admin
              </button>
            )}

            <button
              onClick={logout}
              className="p-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 rounded-2xl active:scale-95 transition-all cursor-pointer"
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 📊 PERSONAL SALES METRICS CARDS (STRICT PRIVACY: NO TOTAL PLATFORM NUMBERS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-2">
            <Building size={22} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {stats?.myHotelsCount || myHotelsList.length}
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">My Onboarded Hotels</p>
          <p className="text-[9px] font-bold text-gray-500 mt-0.5">Properties attributed to you</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 mb-2">
            <IndianRupee size={22} />
          </div>
          <h3 className="text-2xl font-black text-emerald-600 tracking-tight font-mono">
            ₹{(stats?.myTotalRevenue || 0).toLocaleString()}
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">My Sales Generated</p>
          <p className="text-[9px] font-bold text-gray-500 mt-0.5">From active subscriptions</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 mb-2">
            <CheckCircle2 size={22} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {stats?.myActivePaidCount || 0}
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Active Paid Clients</p>
          <p className="text-[9px] font-bold text-gray-500 mt-0.5">Live paid subscribers</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 mb-2">
            <Clock size={22} />
          </div>
          <h3 className="text-2xl font-black text-gray-900 tracking-tight">
            {stats?.myTrialCount || 0}
          </h3>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Free Demos / Trials</p>
          <p className="text-[9px] font-bold text-gray-500 mt-0.5">Potential conversions</p>
        </div>
      </div>

      {/* 🗂️ TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-gray-100/70 p-2 rounded-2xl border border-gray-200">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'mine' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Crown size={15} className="text-indigo-600" />
            <span>My Onboarded Hotels ({myHotelsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-black rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'all' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building size={15} className="text-blue-600" />
            <span>All Properties ({hotels.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search hotel, address, phone..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* 🏨 HOTELS LISTING FOR DEMO & SUPPORT */}
      {filteredHotels.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 space-y-3">
          <Building size={36} className="mx-auto opacity-30 text-gray-400" />
          <p className="font-bold text-gray-700 text-sm">No hotels found matching criteria</p>
          <button
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 transition-all cursor-pointer"
          >
            + Onboard First Hotel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHotels.map((h) => {
            const isOwnerAvailable = h.owner && typeof h.owner === 'object';
            const ownerId = isOwnerAvailable ? h.owner._id : h.owner;
            const ownerPhone = isOwnerAvailable ? h.owner.phone : h.contactNumber;

            return (
              <div 
                key={h._id} 
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                  h.isMine ? 'border-indigo-200 ring-1 ring-indigo-50' : 'border-gray-200'
                }`}
              >
                <div>
                  {/* Hotel Header & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl">🏨</span>
                        <h3 className="font-black text-lg text-gray-900 truncate">{h.name}</h3>
                        {h.isMine && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            ⭐ Onboarded By You
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          h.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {h.isActive !== false ? 'Active' : 'Locked'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-1 truncate">
                        📍 {h.address || 'Address not added'} {h.contactNumber ? `• 📞 ${h.contactNumber}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Owner & Account Details */}
                  <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                      <span className="text-gray-400 font-medium uppercase text-[10px] tracking-wider">Hotel Owner (Client)</span>
                      <span>{isOwnerAvailable ? h.owner.name : 'Unknown Owner'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 flex-wrap gap-1">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Mail size={12} className="text-gray-400" />
                        {isOwnerAvailable ? h.owner.email : 'No email'}
                      </span>
                      {ownerPhone && (
                        <a href={`tel:${ownerPhone}`} className="flex items-center gap-1 text-emerald-600 hover:underline font-mono text-[11px] font-bold">
                          <Phone size={12} />
                          {ownerPhone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Plan & Capacity Badges */}
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                        {h.plan || 'Demo'} Plan {h.planPrice ? `(₹${h.planPrice.toLocaleString()})` : ''}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500">
                        {h.isExpired ? (
                          <span className="text-red-600 font-black">Expired</span>
                        ) : (
                          <span>{h.daysRemaining} days left</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold">
                      <span className="flex items-center gap-1">
                        <BedDouble size={13} className="text-cyan-600" />
                        {h.roomCount || 0} Rooms
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={13} className="text-indigo-600" />
                        {h.staffCount || 0} Staff
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fast Action Buttons for Onsite Demo & Support */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    onClick={() => handleResetPassword(ownerId, isOwnerAvailable ? h.owner.name : h.name)}
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Reset Client Password on field"
                  >
                    <KeyRound size={13} />
                    <span>Reset Pass</span>
                  </button>

                  <button
                    onClick={(e) => handleSalesImpersonate(ownerId, e)}
                    disabled={impersonatingId === ownerId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Launch instant demo / login as this hotel on-site"
                  >
                    <LogIn size={13} />
                    <span>⚡ Launch Demo / Support Mode</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* 🚀 MODAL: 1-STEP HOTEL CLIENT ONBOARDING */}
      {/* ============================================================== */}
      {isOnboardOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsOnboardOpen(false)}
        >
          <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 text-left">
            <div 
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-gray-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 bg-gradient-to-r from-slate-950 to-indigo-950 text-white flex justify-between items-start shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                    Field Onboarding
                  </span>
                  <h3 className="text-xl font-black text-white mt-1.5">Onboard New Hotel Client</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Creates Owner Master Login + Registers Property tagged to your sales ID.</p>
                </div>
                <button 
                  onClick={() => setIsOnboardOpen(false)} 
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {/* Step 1: Owner Details */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 block bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                      👤 1. Hotel Owner (Admin Login)
                    </span>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Owner Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Chandra"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                        value={onboardForm.ownerName}
                        onChange={e => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Email (Login ID) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="owner@hotelroyal.com"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                          value={onboardForm.ownerEmail}
                          onChange={e => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Phone / WhatsApp
                        </label>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                          value={onboardForm.ownerPhone}
                          onChange={e => setOnboardForm({ ...onboardForm, ownerPhone: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Initial Password
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="password123"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                        value={onboardForm.ownerPassword}
                        onChange={e => setOnboardForm({ ...onboardForm, ownerPassword: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Step 2: Property Details */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 block bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                      🏨 2. Property / Hotel Details
                    </span>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Property Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hotel Royal Taj Palace"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600"
                        value={onboardForm.hotelName}
                        onChange={e => setOnboardForm({ ...onboardForm, hotelName: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                        Address / City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Near Station, Civil Lines, Jaipur"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                        value={onboardForm.hotelAddress}
                        onChange={e => setOnboardForm({ ...onboardForm, hotelAddress: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Plan Tier
                        </label>
                        <select
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                          value={onboardForm.plan}
                          onChange={e => {
                            const p = e.target.value;
                            setOnboardForm({
                              ...onboardForm,
                              plan: p,
                              planPrice: p === 'demo' ? 0 : (p === 'starter' ? 2499 : 3499)
                            });
                          }}
                        >
                          <option value="demo">Free Demo / Trial (14 Days)</option>
                          <option value="starter">Starter Plan (₹2,499/mo)</option>
                          <option value="professional">Professional (₹3,499/mo)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                          Max Rooms
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                          value={onboardForm.maxRooms}
                          onChange={e => setOnboardForm({ ...onboardForm, maxRooms: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 px-6 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOnboardOpen(false)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={onboardingLoading}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {onboardingLoading ? 'Onboarding...' : 'Onboard & Tag to My Sales'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesDashboard;
