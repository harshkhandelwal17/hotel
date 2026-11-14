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
  AlertTriangle,
  Send,
  MessageSquare,
  Calendar,
  Flame,
  Target,
  Trophy,
  ArrowRight,
  TrendingUp,
  MapPin,
  FileText,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SalesDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [hotels, setHostels] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs: 'hotels' | 'leads' | 'outreach'
  const [activeTab, setActiveTab] = useState('hotels');
  const [hotelFilter, setHotelFilter] = useState('mine'); // 'mine' | 'all' | 'active' | 'trial'
  const [hotelSearch, setHotelSearch] = useState('');
  
  // Leads filter
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');

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
    maxRooms: 20,
    leadId: null
  });
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  // 🎯 New Lead Modal State
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({
    hotelName: '',
    contactPerson: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    roomCount: 15,
    currentSystem: 'Paper Register',
    status: 'new',
    priority: 'medium',
    nextFollowUpDate: '',
    notes: '',
    estimatedValue: 2499
  });
  const [savingLead, setSavingLead] = useState(false);

  // 🔑 Reset Password Modal
  const [resetModalData, setResetModalData] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('password123');
  const [resettingPassword, setResettingPassword] = useState(false);

  // 💬 WhatsApp Outreach State
  const [outreachPhone, setOutreachPhone] = useState('');
  const [outreachContactName, setOutreachContactName] = useState('');
  const [outreachHotelName, setOutreachHotelName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('brochure');

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
      const [statsRes, hotelsRes, leadsRes] = await Promise.all([
        axios.get(`${API}/api/sales/stats`),
        axios.get(`${API}/api/sales/hostels`),
        axios.get(`${API}/api/sales/leads`).catch(() => ({ data: { data: [] } }))
      ]);
      setStats(statsRes.data?.data || null);
      setHostels(hotelsRes.data?.data || []);
      setLeads(leadsRes.data?.data || []);
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
      
      const createdHostelId = res.data.data.hostel._id;
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
        maxRooms: 20,
        leadId: null
      });

      await fetchData();

      // Offer immediate demo launch
      if (window.confirm(`Would you like to launch Demo Mode right now for "${createdHotelName}"?`)) {
        handleSalesImpersonate(createdHostelId);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to onboard hotel');
    } finally {
      setOnboardingLoading(false);
    }
  };

  // ⚡ 1-Click Launch Demo / Support Mode (Sales Impersonation)
  const handleSalesImpersonate = async (hostelId, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!hostelId) {
      alert('⚠️ Hotel ID is missing');
      return;
    }

    if (!window.confirm('Launch Demo / Support Mode for this hotel?\nYou can return back to Sales Portal anytime by clicking "Return to Sales Portal" on the top banner.')) {
      return;
    }

    try {
      setImpersonatingId(hostelId);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/impersonate`, { hostelId });
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
      console.error('Demo Mode Launch Failed:', err);
      alert(err.response?.data?.message || err.message || 'Failed to launch demo mode');
      setImpersonatingId(null);
    }
  };

  // 🎯 Create Lead Handler
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!leadForm.hotelName.trim() || !leadForm.contactPerson.trim() || !leadForm.phone.trim()) {
      alert('Please fill in Hotel Name, Contact Person, and Phone number');
      return;
    }

    try {
      setSavingLead(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.post(`${API}/api/sales/leads`, leadForm);
      alert(`✅ Prospect Lead for "${leadForm.hotelName}" saved successfully!`);
      setIsLeadModalOpen(false);
      setLeadForm({
        hotelName: '',
        contactPerson: '',
        phone: '',
        email: '',
        city: '',
        address: '',
        roomCount: 15,
        currentSystem: 'Paper Register',
        status: 'new',
        priority: 'medium',
        nextFollowUpDate: '',
        notes: '',
        estimatedValue: 2499
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSavingLead(false);
    }
  };

  // 🔄 Update Lead Status Quick Action
  const handleUpdateLeadStatus = async (leadId, newStatus) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/sales/leads/${leadId}`, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
    } catch (err) {
      alert('Failed to update lead status');
    }
  };

  // 🗑️ Delete Lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this prospect lead?')) return;
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.delete(`${API}/api/sales/leads/${leadId}`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      alert('Failed to delete lead');
    }
  };

  // 🏆 Convert Lead into Client: Pre-fill Onboard Modal
  const convertLeadToClient = (lead) => {
    setOnboardForm({
      ownerName: lead.contactPerson || '',
      ownerEmail: lead.email || '',
      ownerPhone: lead.phone || '',
      ownerPassword: 'password123',
      hotelName: lead.hotelName || '',
      hotelAddress: lead.address || lead.city || '',
      hotelContact: lead.phone || '',
      plan: 'demo',
      planPrice: 0,
      billingCycle: 'monthly',
      maxRooms: lead.roomCount || 20,
      leadId: lead._id
    });
    setIsOnboardOpen(true);
  };

  // 🔑 Reset Client Password Handler
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalData?.ownerId) return;
    try {
      setResettingPassword(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/reset-password`, {
        ownerId: resetModalData.ownerId,
        newPassword: newPasswordVal
      });
      alert(res.data.message || 'Password updated successfully');
      setResetModalData(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  // 💬 WhatsApp Outreach Message Builder
  const getOutreachText = () => {
    const name = outreachContactName.trim() || 'Sir / Ma’am';
    const hotel = outreachHotelName.trim() || 'Your Hotel';

    if (selectedTemplate === 'brochure') {
      return `🏨 *Namaste ${name} ji!*
Greetings from *NexisParkX Hotel SaaS* ✨

We help hotels like *${hotel}* run seamless 100% digital front desks:
⚡ *AI OCR Scanner* - Auto-fills Guest Name, ID, Address from Aadhaar/Passport in 2 seconds.
📲 *Auto WhatsApp Bills* - Send digital receipts & check-in welcome directly to guest WhatsApp.
💳 *Dynamic UPI QR* - Guests pay room-wise via GooglePay/PhonePe with automatic room settlement!
🧹 *Housekeeping Board* - Track dirty/cleaned rooms in real-time.
📊 *Live Revenue Dashboard* - Owner can check today’s collection from their phone anywhere.

Would you like a *Free 10-Minute Live Demo* at ${hotel}?
Let us know a good time to visit! 🙏`;
    }

    if (selectedTemplate === 'trial_account') {
      return `🎉 *Welcome ${name} ji to NexisParkX Hotel SaaS!*

Your property *${hotel}* has been set up with your free trial account:
🌐 *Software Login Link:* ${window.location.origin}/login
👤 *Owner Login ID:* ${onboardForm.ownerEmail || 'Your Email'}
🔑 *Temporary Password:* password123

You can test check-ins, room allocation, and UPI payment right now on your mobile or desktop.
Feel free to message me if you need any assistance! 🚀`;
    }

    return `Namaste ${name} ji, regarding our software demo for *${hotel}*, please let me know your available time today. Thank you!`;
  };

  const handleOpenWhatsAppOutreach = () => {
    const cleanPhone = outreachPhone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit WhatsApp number');
      return;
    }
    const text = encodeURIComponent(getOutreachText());
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, '_blank');
  };

  // --- FILTERED LIST CALCULATIONS ---
  const filteredHotels = hotels.filter(h => {
    const matchesSearch = 
      h.name.toLowerCase().includes(hotelSearch.toLowerCase()) ||
      (h.address && h.address.toLowerCase().includes(hotelSearch.toLowerCase())) ||
      (h.contactNumber && h.contactNumber.includes(hotelSearch)) ||
      (h.owner?.name && h.owner.name.toLowerCase().includes(hotelSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (hotelFilter === 'mine') return h.isMine;
    if (hotelFilter === 'active') return h.planStatus === 'active';
    if (hotelFilter === 'trial') return h.planStatus === 'trial' || h.plan === 'demo';
    return true; // 'all'
  });

  const filteredLeads = leads.filter(l => {
    const matchesSearch = 
      l.hotelName.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.contactPerson.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone.includes(leadSearch) ||
      (l.city && l.city.toLowerCase().includes(leadSearch.toLowerCase()));

    if (!matchesSearch) return false;
    if (leadStatusFilter === 'all') return true;
    return l.status === leadStatusFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-400">Loading Sales Command Center...</p>
      </div>
    );
  }

  const agentName = stats?.agent?.name || user?.name || 'Executive';
  const monthlyTarget = stats?.agent?.monthlyTarget || 10;
  const commissionRate = stats?.agent?.commissionRate || 15;
  const thisMonthOnboarded = stats?.thisMonthOnboarded || 0;
  const targetProgressPct = stats?.targetProgressPct || 0;
  const commissionEarned = stats?.estimatedCommission || 0;
  const myTotalRevenue = stats?.myTotalRevenue || 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-16">
      
      {/* 🚀 TOP COMMAND NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-black text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-white">NexisParkX Sales Command</h1>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full">
                Field Portal
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Welcome back, <strong className="text-white">{agentName}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-indigo-500/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Target size={14} className="text-indigo-400" />
            <span className="hidden sm:inline">+ Log Field Lead</span>
          </button>

          <button
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-indigo-600/30 active:scale-95 flex items-center gap-1.5"
          >
            <Plus size={15} className="stroke-[3]" />
            <span>+ Onboard Hotel</span>
          </button>

          <button
            onClick={fetchData}
            disabled={refreshing}
            title="Refresh Data"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 active:scale-95"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all border border-red-500/20 active:scale-95"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* 📊 HERO PERFORMANCE METRICS & TARGET METER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-8 mt-6 space-y-6">

        {/* Motivational Sales Target & Commission Banner */}
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-purple-950/50 p-6 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {/* Target Gauge */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={18} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                    Monthly Onboarding Target
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-300">
                  <strong className="text-white text-base">{thisMonthOnboarded}</strong> / {monthlyTarget} Hotels ({targetProgressPct}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3.5 p-0.5 border border-slate-700 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.max(5, targetProgressPct)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>🔥 Keep pushing! Every hotel adds to your monthly sales incentive.</span>
                <span className="text-amber-400 font-bold">14 Days Left This Month</span>
              </div>
            </div>

            {/* Estimated Commission Card */}
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-indigo-500/30 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <IndianRupee size={12} className="text-emerald-400" />
                  <span>Est. Commission</span>
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md">
                  {commissionRate}% Rate
                </span>
              </div>
              <div className="my-2">
                <p className="text-3xl font-black text-emerald-400">₹{commissionEarned.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Calculated from ₹{myTotalRevenue.toLocaleString()} active client subscriptions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Quick Stat KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building size={13} className="text-blue-400" />
              <span>My Onboarded Hotels</span>
            </span>
            <p className="text-2xl font-black text-white mt-1.5">{stats?.myHotelsCount || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Total registered properties</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>Active Paid Clients</span>
            </span>
            <p className="text-2xl font-black text-emerald-400 mt-1.5">{stats?.myActivePaidCount || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Contributing to commission</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              <span>Free Demos / Trials</span>
            </span>
            <p className="text-2xl font-black text-amber-400 mt-1.5">{stats?.myTrialCount || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Ready for paid conversion</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Target size={13} className="text-purple-400" />
              <span>Active Leads Pipeline</span>
            </span>
            <p className="text-2xl font-black text-purple-400 mt-1.5">{leads.filter(l => l.status !== 'won' && l.status !== 'lost').length}</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Visits in progress</p>
          </div>
        </div>

        {/* 🗂️ MAIN TABS NAVIGATION */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'hotels'
                ? 'border-indigo-500 text-white bg-slate-900/50 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building size={15} className="text-indigo-400" />
            <span>My Hotels & Clients ({hotels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'border-indigo-500 text-white bg-slate-900/50 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target size={15} className="text-purple-400" />
            <span>Field Leads Pipeline ({leads.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('outreach')}
            className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'outreach'
                ? 'border-indigo-500 text-white bg-slate-900/50 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={15} className="text-emerald-400" />
            <span>WhatsApp Pitch & Brochure</span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: 🏨 MY HOTELS & CLIENTS */}
        {/* ============================================================== */}
        {activeTab === 'hotels' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setHotelFilter('mine')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    hotelFilter === 'mine' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⭐ Onboarded by Me ({hotels.filter(h => h.isMine).length})
                </button>
                <button
                  onClick={() => setHotelFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    hotelFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Properties ({hotels.length})
                </button>
                <button
                  onClick={() => setHotelFilter('active')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    hotelFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active Paid ({hotels.filter(h => h.planStatus === 'active').length})
                </button>
                <button
                  onClick={() => setHotelFilter('trial')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                    hotelFilter === 'trial' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Trials / Demos ({hotels.filter(h => h.planStatus === 'trial' || h.plan === 'demo').length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search hotel or owner..."
                  value={hotelSearch}
                  onChange={e => setHotelSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Hotel Cards Grid */}
            {filteredHotels.length === 0 ? (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center">
                <Building size={40} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-300">No properties found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  No hotels match your current search or filter. Register a new hotel directly from field.
                </p>
                <button
                  onClick={() => setIsOnboardOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  + Onboard New Hotel Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredHotels.map(h => (
                  <div
                    key={h._id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all p-5 flex flex-col justify-between shadow-lg relative group"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                          h.planStatus === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {h.planStatus === 'active' ? '● Active Paid' : '⏳ Trial / Demo'}
                        </span>

                        {h.isMine && (
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md">
                            ⭐ Onboarded By You
                          </span>
                        )}
                      </div>

                      {/* Hotel Name & Address */}
                      <h3 className="text-base font-black text-white group-hover:text-indigo-400 transition-colors">
                        {h.name}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={12} className="text-slate-500 shrink-0" />
                        <span>{h.address || 'Address not provided'}</span>
                      </p>

                      {/* Owner Details */}
                      <div className="mt-3.5 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-slate-300 font-bold">
                          <span className="flex items-center gap-1.5 truncate">
                            <Crown size={12} className="text-amber-400" />
                            <span>{h.owner?.name || 'Owner N/A'}</span>
                          </span>
                          {h.owner?.phone && (
                            <a 
                              href={`https://wa.me/91${h.owner.phone.replace(/\D/g, '').slice(-10)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold text-[11px]"
                              title="Message Owner on WhatsApp"
                            >
                              <MessageSquare size={12} /> WhatsApp
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{h.owner?.email || h.email || 'No email'}</p>
                      </div>

                      {/* Property Specs */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase font-black block">Rooms</span>
                          <span className="font-bold text-slate-200">{h.roomCount || 0} configured</span>
                        </div>
                        <div className="p-2 bg-slate-950/40 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-500 uppercase font-black block">Staff</span>
                          <span className="font-bold text-slate-200">{h.staffCount || 0} users</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        onClick={() => handleSalesImpersonate(h._id)}
                        disabled={impersonatingId === h._id}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles size={13} />
                        <span>{impersonatingId === h._id ? 'Launching...' : '⚡ Launch Demo'}</span>
                      </button>

                      {h.owner?._id && (
                        <button
                          onClick={() => setResetModalData({ ownerId: h.owner._id, ownerName: h.owner.name, hotelName: h.name })}
                          title="Reset Password for Owner"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-xl transition-colors border border-slate-700"
                        >
                          <KeyRound size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: 🎯 FIELD LEADS & PROSPECTS PIPELINE */}
        {/* ============================================================== */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {['all', 'new', 'demo_scheduled', 'demo_completed', 'won', 'lost'].map(st => (
                  <button
                    key={st}
                    onClick={() => setLeadStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all capitalize whitespace-nowrap ${
                      leadStatusFilter === st ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search prospect..."
                    value={leadSearch}
                    onChange={e => setLeadSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  onClick={() => setIsLeadModalOpen(true)}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Add Lead</span>
                </button>
              </div>
            </div>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center">
                <Target size={40} className="mx-auto text-slate-600 mb-3" />
                <h3 className="text-base font-bold text-slate-300">No leads found in this stage</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Log hotel owners you visit during field visits. Follow up, schedule demos, and convert them to clients!
                </p>
                <button
                  onClick={() => setIsLeadModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  + Add First Field Prospect
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLeads.map(l => (
                  <div
                    key={l._id}
                    className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-lg space-y-3"
                  >
                    <div>
                      {/* Priority & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                          l.priority === 'hot' 
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                            : l.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {l.priority === 'hot' ? '🔥 HOT PROSPECT' : `${l.priority} priority`}
                        </span>

                        <select
                          value={l.status}
                          onChange={e => handleUpdateLeadStatus(l._id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-bold text-indigo-300 outline-none"
                        >
                          <option value="new">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="demo_scheduled">Demo Scheduled</option>
                          <option value="demo_completed">Demo Done</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="won">Won (Converted)</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>

                      {/* Hotel Name & Contact Person */}
                      <h4 className="text-base font-black text-white mt-2">{l.hotelName}</h4>
                      <p className="text-xs text-slate-300 font-bold flex items-center gap-1.5 mt-0.5">
                        <Users size={12} className="text-purple-400" />
                        <span>{l.contactPerson}</span>
                        {l.city && <span className="text-slate-500 font-normal">· {l.city}</span>}
                      </p>

                      {/* Phone & Direct Outreach buttons */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <a
                          href={`tel:${l.phone}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1"
                        >
                          <Phone size={11} className="text-emerald-400" />
                          <span>{l.phone}</span>
                        </a>
                        <a
                          href={`https://wa.me/91${l.phone.replace(/\D/g, '').slice(-10)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg border border-emerald-500/30"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare size={13} />
                        </a>
                      </div>

                      {/* Notes / Current System */}
                      <div className="mt-2.5 text-xs text-slate-400 space-y-1">
                        <p className="text-[11px]">
                          <strong>System:</strong> {l.currentSystem || 'Paper Register'} ({l.roomCount || 15} rooms)
                        </p>
                        {l.notes && (
                          <p className="text-[11px] bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-slate-300 italic">
                            "{l.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                      {l.status !== 'won' ? (
                        <button
                          onClick={() => convertLeadToClient(l)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Trophy size={13} />
                          <span>Convert to Client</span>
                        </button>
                      ) : (
                        <span className="flex-1 py-1.5 text-center text-xs font-bold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                          ✅ Converted to Client
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteLead(l._id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: 💬 WHATSAPP PITCH & BROCHURE SENDER */}
        {/* ============================================================== */}
        {activeTab === 'outreach' && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-400" />
                <span>1-Click WhatsApp Pitch Generator</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Quickly send hotel brochures, demo invites, or trial credentials directly to hotel owners on WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Outreach Template
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('brochure')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        selectedTemplate === 'brochure'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs">📄 Full Feature Brochure</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">AI OCR, WhatsApp receipts, UPI QR</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedTemplate('trial_account')}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        selectedTemplate === 'trial_account'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <p className="font-bold text-xs">🔑 Trial Credentials Handover</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Login URL, Owner ID & Password</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={outreachContactName}
                    onChange={e => setOutreachContactName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Hotel / Property Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hotel Grand Inn"
                    value={outreachHotelName}
                    onChange={e => setOutreachHotelName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Owner WhatsApp Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={outreachPhone}
                    onChange={e => setOutreachPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={handleOpenWhatsAppOutreach}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-600/30 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  <span>Send via WhatsApp</span>
                </button>
              </div>

              {/* Right Live Preview */}
              <div className="md:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MessageSquare size={12} className="text-emerald-400" />
                      <span>Live WhatsApp Message Preview</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Formatted & Ready
                    </span>
                  </div>

                  <pre className="mt-4 text-xs font-mono text-slate-300 whitespace-pre-wrap bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 leading-relaxed max-h-96 overflow-y-auto">
                    {getOutreachText()}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 🚀 MODAL 1: 1-STEP HOTEL & CLIENT ONBOARDING */}
      {/* ============================================================== */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-indigo-900 to-purple-900 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 text-white rounded-full">
                  1-Step Field Setup
                </span>
                <h3 className="text-base font-black text-white mt-1">Onboard Hotel Client</h3>
                <p className="text-xs text-indigo-200 mt-0.5">Creates Owner account + Hotel property in 1 click.</p>
              </div>
              <button onClick={() => setIsOnboardOpen(false)} className="text-white/60 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Hotel / Property Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Palace Hotel"
                    value={onboardForm.hotelName}
                    onChange={e => setOnboardForm({ ...onboardForm, hotelName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">City / Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Station Road, Jaipur"
                    value={onboardForm.hotelAddress}
                    onChange={e => setOnboardForm({ ...onboardForm, hotelAddress: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajesh Sharma"
                    value={onboardForm.ownerName}
                    onChange={e => setOnboardForm({ ...onboardForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Owner Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. rajesh@hotelroyal.com"
                    value={onboardForm.ownerEmail}
                    onChange={e => setOnboardForm({ ...onboardForm, ownerEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Owner Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={onboardForm.ownerPhone}
                    onChange={e => setOnboardForm({ ...onboardForm, ownerPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Temporary Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    value={onboardForm.ownerPassword}
                    onChange={e => setOnboardForm({ ...onboardForm, ownerPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Initial Plan Tier</label>
                  <select
                    value={onboardForm.plan}
                    onChange={e => setOnboardForm({ ...onboardForm, plan: e.target.value, planPrice: e.target.value === 'demo' ? 0 : 2499 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="demo">Free 14-Day Demo / Trial</option>
                    <option value="starter">Starter Plan (₹2,499/mo)</option>
                    <option value="pro">Pro Plan (₹4,999/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Max Rooms Capacity</label>
                  <input
                    type="number"
                    value={onboardForm.maxRooms}
                    onChange={e => setOnboardForm({ ...onboardForm, maxRooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOnboardOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={onboardingLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50"
                >
                  {onboardingLoading ? 'Registering...' : 'Register & Start Demo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎯 MODAL 2: ADD NEW FIELD PROSPECT LEAD */}
      {/* ============================================================== */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-purple-900 to-indigo-900 flex items-center justify-between">
              <div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 text-white rounded-full">
                  Field CRM
                </span>
                <h3 className="text-base font-black text-white mt-1">Log Field Prospect Lead</h3>
                <p className="text-xs text-purple-200 mt-0.5">Record hotel visits for follow-up and demo.</p>
              </div>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-white/60 hover:text-white p-1">✕</button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Hotel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hotel Sunshine"
                  value={leadForm.hotelName}
                  onChange={e => setLeadForm({ ...leadForm, hotelName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singh"
                    value={leadForm.contactPerson}
                    onChange={e => setLeadForm({ ...leadForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">City / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Udaipur"
                    value={leadForm.city}
                    onChange={e => setLeadForm({ ...leadForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Priority</label>
                  <select
                    value={leadForm.priority}
                    onChange={e => setLeadForm({ ...leadForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="hot">🔥 Hot (High Interest)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Current System</label>
                  <select
                    value={leadForm.currentSystem}
                    onChange={e => setLeadForm({ ...leadForm, currentSystem: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Paper Register">Paper Register</option>
                    <option value="Excel / Sheets">Excel / Sheets</option>
                    <option value="Old Desktop Software">Old Desktop Software</option>
                    <option value="Other Cloud SaaS">Other Cloud SaaS</option>
                    <option value="None">None</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Approx Rooms Count</label>
                  <input
                    type="number"
                    value={leadForm.roomCount}
                    onChange={e => setLeadForm({ ...leadForm, roomCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">Visit Notes & Discussion</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Owner interested in Aadhaar OCR scanner and automatic WhatsApp bills..."
                  value={leadForm.notes}
                  onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium text-white outline-none focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50"
                >
                  {savingLead ? 'Saving...' : 'Save Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔑 MODAL 3: RESET CLIENT PASSWORD */}
      {/* ============================================================== */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <KeyRound size={16} className="text-amber-400" />
              <span>Reset Client Password</span>
            </h3>
            <p className="text-xs text-slate-400">
              Update master password for <strong>{resetModalData.ownerName}</strong> ({resetModalData.hotelName}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetModalData(null)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-wider rounded-xl text-xs shadow-md disabled:opacity-50"
                >
                  {resettingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesDashboard;
