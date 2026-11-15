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
  ChevronRight,
  Network,
  Pencil,
  QrCode,
  Shirt,
  Briefcase,
  Lock,
  Unlock,
  CreditCard,
  History,
  CheckCircle,
  X
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SalesDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Data states
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [owners, setOwners] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs: 'ecosystem' | 'leads' | 'properties' | 'owners' | 'staff' | 'outreach'
  const [activeTab, setActiveTab] = useState('ecosystem');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'mine' | 'active' | 'trial'

  // Leads sub-filter: 'all' | 'today' | 'overdue' | 'demo'
  const [leadFilterTab, setLeadFilterTab] = useState('all');

  // 👑 Modal 1: Create Hotel Owner (Admin)
  const [isCreateOwnerOpen, setIsCreateOwnerOpen] = useState(false);
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123'
  });
  const [creatingOwner, setCreatingOwner] = useState(false);

  // 🏨 Modal 2: Register Hotel Property
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
    owner: '',
    plan: 'demo',
    maxRooms: 20,
    upiId: '',
    upiPayeeName: '',
    leadId: null
  });
  const [creatingProperty, setCreatingProperty] = useState(false);

  // 🛎️ Modal 3: Add Front Desk Staff (Receptionist)
  const [isCreateStaffOpen, setIsCreateStaffOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    assignedHostel: ''
  });
  const [creatingStaff, setCreatingStaff] = useState(false);

  // 🎟️ Modal 4: Plan Assignment & Subscription Management (Like Super Admin)
  const [selectedPlanHotel, setSelectedPlanHotel] = useState(null);
  const [planForm, setPlanForm] = useState({
    plan: 'starter',
    planStatus: 'active',
    planStartDate: '',
    planEndDate: '',
    planPrice: 2499,
    billingCycle: 'monthly',
    maxRooms: 20,
    planNotes: ''
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // ✏️ Modal 5: Edit Property Details
  const [editingProperty, setEditingProperty] = useState(null);
  const [editPropertyForm, setEditPropertyForm] = useState({
    name: '',
    address: '',
    contactNumber: '',
    email: '',
    owner: '',
    upiId: '',
    upiPayeeName: '',
    maxRooms: 20
  });
  const [savingEditProperty, setSavingEditProperty] = useState(false);

  // 👤 Modal 6: Edit User / Phone Details
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [savingEditUser, setSavingEditUser] = useState(false);

  // 🔑 Modal 7: Reset Password
  const [resetModalData, setResetModalData] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('password123');
  const [resettingPassword, setResettingPassword] = useState(false);

  // 🎯 Modal 8: Add Field Lead
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
    notes: ''
  });
  const [savingLead, setSavingLead] = useState(false);

  // 📅 Modal 9: Log Follow-up for Lead
  const [followUpModalLead, setFollowUpModalLead] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    note: '',
    nextFollowUpDate: '',
    status: 'contacted'
  });
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  // 💬 WhatsApp Outreach
  const [outreachPhone, setOutreachPhone] = useState('');
  const [outreachContactName, setOutreachContactName] = useState('');
  const [outreachHotelName, setOutreachHotelName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('brochure');

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
      const [statsRes, ecoRes, leadsRes] = await Promise.all([
        axios.get(`${API}/api/sales/stats`),
        axios.get(`${API}/api/sales/ecosystem`),
        axios.get(`${API}/api/sales/leads`).catch(() => ({ data: { data: [] } }))
      ]);

      setStats(statsRes.data?.data || null);
      setHostels(ecoRes.data?.data?.hostels || []);
      setOwners(ecoRes.data?.data?.owners || []);
      setStaffUsers(ecoRes.data?.data?.staffUsers || []);
      setLeads(leadsRes.data?.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to load sales ecosystem data:', err);
      setError(err.response?.data?.message || 'Failed to load sales dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 👑 Handler: Create Hotel Owner
  const handleCreateOwner = async (e) => {
    e.preventDefault();
    if (!ownerForm.name.trim() || !ownerForm.email.trim()) {
      return alert('Owner Name and Email are required');
    }

    try {
      setCreatingOwner(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/owners`, ownerForm);
      const newOwner = res.data.data;
      alert(`✅ Hotel Owner "${newOwner.name}" created successfully!\nEmail: ${newOwner.email}`);
      setIsCreateOwnerOpen(false);

      const ownerEmail = ownerForm.email;
      const ownerPhone = ownerForm.phone;
      setOwnerForm({ name: '', email: '', phone: '', password: 'password123' });
      await fetchData();

      // Offer to immediately register property for this owner
      if (window.confirm(`Would you like to register a hotel property now for ${newOwner.name}?`)) {
        setPropertyForm(prev => ({
          ...prev,
          owner: newOwner._id,
          contactNumber: ownerPhone || '',
          email: ownerEmail || ''
        }));
        setIsAddPropertyOpen(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create owner');
    } finally {
      setCreatingOwner(false);
    }
  };

  // 🏨 Handler: Register Property
  const handleCreateProperty = async (e) => {
    e.preventDefault();
    if (!propertyForm.name.trim()) return alert('Hotel name is required');
    if (!propertyForm.owner) return alert('Please select a Hotel Owner');

    try {
      setCreatingProperty(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/properties`, propertyForm);
      const newHotel = res.data.data;
      alert(`✅ Property "${newHotel.name}" registered successfully!`);
      setIsAddPropertyOpen(false);
      setPropertyForm({
        name: '',
        address: '',
        contactNumber: '',
        email: '',
        owner: '',
        plan: 'demo',
        maxRooms: 20,
        upiId: '',
        upiPayeeName: '',
        leadId: null
      });
      await fetchData();

      // Offer immediate demo launch
      if (window.confirm(`Launch Demo Mode now for "${newHotel.name}"?`)) {
        handleSalesImpersonate(newHotel._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register property');
    } finally {
      setCreatingProperty(false);
    }
  };

  // 🛎️ Handler: Create Staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim()) {
      return alert('Staff Name and Email are required');
    }
    if (!staffForm.assignedHostel) {
      return alert('Please select an assigned hotel');
    }

    try {
      setCreatingStaff(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/staff`, staffForm);
      alert(`✅ Front desk staff "${res.data.data.name}" added successfully!`);
      setIsCreateStaffOpen(false);
      setStaffForm({
        name: '',
        email: '',
        phone: '',
        password: 'password123',
        assignedHostel: ''
      });
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setCreatingStaff(false);
    }
  };

  // 🎟️ Plan Assignment Modal Open
  const openPlanModal = (hotel) => {
    setSelectedPlanHotel(hotel);
    const startIso = hotel.planStartDate ? new Date(hotel.planStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endIso = hotel.planEndDate ? new Date(hotel.planEndDate).toISOString().split('T')[0] : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setPlanForm({
      plan: hotel.plan || 'demo',
      planStatus: hotel.planStatus || 'trial',
      planStartDate: startIso,
      planEndDate: endIso,
      planPrice: hotel.planPrice || (hotel.plan === 'demo' ? 0 : 2499),
      billingCycle: hotel.billingCycle || 'monthly',
      maxRooms: hotel.maxRooms || 20,
      planNotes: hotel.planNotes || ''
    });
  };

  // 🎟️ Plan Save Handler
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!selectedPlanHotel) return;
    try {
      setSavingPlan(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/properties/${selectedPlanHotel._id}/plan`, planForm);
      setHostels(prev => prev.map(h => h._id === selectedPlanHotel._id ? { ...h, ...res.data.data } : h));
      alert(`✅ Plan updated successfully for "${selectedPlanHotel.name}"`);
      setSelectedPlanHotel(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  // 🔒 Lock / Unlock Property Toggle
  const handleTogglePropertyStatus = async (hotelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/properties/${hotelId}/toggle-status`);
      setHostels(prev => prev.map(h => h._id === hotelId ? { ...h, isActive: res.data.data.isActive } : h));
      alert(res.data.message);
    } catch (err) {
      alert('Failed to toggle property lock status');
    }
  };

  // 🔒 Lock / Unlock User Toggle
  const handleToggleUserStatus = async (userId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/users/${userId}/toggle-status`);
      setOwners(prev => prev.map(o => o._id === userId ? { ...o, isActive: res.data.data.isActive } : o));
      setStaffUsers(prev => prev.map(s => s._id === userId ? { ...s, isActive: res.data.data.isActive } : s));
      alert(res.data.message);
    } catch (err) {
      alert('Failed to toggle user status');
    }
  };

  // ✏️ Edit Property Handler
  const openEditPropertyModal = (h) => {
    setEditingProperty(h);
    setEditPropertyForm({
      name: h.name || '',
      address: h.address || '',
      contactNumber: h.contactNumber || '',
      email: h.email || '',
      owner: h.owner?._id || h.owner || '',
      upiId: h.upiId || '',
      upiPayeeName: h.upiPayeeName || '',
      maxRooms: h.maxRooms || 20
    });
  };

  const handleSaveEditProperty = async (e) => {
    e.preventDefault();
    if (!editingProperty) return;
    try {
      setSavingEditProperty(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/sales/properties/${editingProperty._id}`, editPropertyForm);
      alert(`✅ Property "${editPropertyForm.name}" updated successfully!`);
      setEditingProperty(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update property');
    } finally {
      setSavingEditProperty(false);
    }
  };

  // 👤 Edit User / Phone Handler
  const openEditUserModal = (u) => {
    setEditingUser(u);
    setEditUserForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || ''
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setSavingEditUser(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/sales/users/${editingUser._id}`, editUserForm);
      alert(`✅ User "${editUserForm.name}" updated successfully!`);
      setEditingUser(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEditUser(false);
    }
  };

  // ⚙️ Toggle Property Feature (AI OCR, WhatsApp Sync, Laundry)
  const handleToggleFeature = async (hostelId, feature) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/properties/${hostelId}/toggle-feature`, { feature });
      setHostels(prev => prev.map(h => h._id === hostelId ? { ...h, ...res.data.data } : h));
    } catch (err) {
      alert('Failed to toggle feature');
    }
  };

  // ⚡ 1-Click Launch Demo Mode
  const handleSalesImpersonate = async (hostelId, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!hostelId) return alert('Property ID is missing');

    if (!window.confirm('Launch Demo / Support Mode for this hotel?\nYou can return anytime by clicking "Return to Sales Portal" on the top banner.')) {
      return;
    }

    try {
      setImpersonatingId(hostelId);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/sales/impersonate`, { hostelId });
      const { token, user: targetUser } = res.data;

      if (!token) throw new Error('No authentication token received');

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
      alert(err.response?.data?.message || err.message || 'Failed to launch demo mode');
      setImpersonatingId(null);
    }
  };

  // 🔑 Reset Client Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModalData?.userId) return;
    try {
      setResettingPassword(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/sales/reset-password`, {
        userId: resetModalData.userId,
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

  // 🎯 Field Leads Handlers
  const handleCreateLead = async (e) => {
    e.preventDefault();
    if (!leadForm.hotelName.trim() || !leadForm.contactPerson.trim() || !leadForm.phone.trim()) {
      return alert('Hotel Name, Contact Person, and Phone are required');
    }
    try {
      setSavingLead(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.post(`${API}/api/sales/leads`, leadForm);
      alert(`✅ Field prospect for "${leadForm.hotelName}" saved!`);
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
        notes: ''
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSavingLead(false);
    }
  };

  // 📅 Open Follow-up Modal for Lead
  const openFollowUpModal = (lead) => {
    setFollowUpModalLead(lead);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setFollowUpForm({
      note: '',
      nextFollowUpDate: lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().split('T')[0] : tomorrow,
      status: lead.status || 'contacted'
    });
  };

  // 📅 Submit Follow-up
  const handleSaveFollowUp = async (e) => {
    e.preventDefault();
    if (!followUpModalLead) return;
    try {
      setSavingFollowUp(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.post(`${API}/api/sales/leads/${followUpModalLead._id}/follow-up`, followUpForm);
      alert(`✅ Follow-up logged for "${followUpModalLead.hotelName}"!`);
      setFollowUpModalLead(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to log follow-up');
    } finally {
      setSavingFollowUp(false);
    }
  };

  const convertLeadToClient = (lead) => {
    // Open owner modal pre-filled with lead contact
    setOwnerForm({
      name: lead.contactPerson || '',
      email: lead.email || '',
      phone: lead.phone || '',
      password: 'password123'
    });
    setPropertyForm(prev => ({
      ...prev,
      name: lead.hotelName || '',
      address: lead.address || lead.city || '',
      contactNumber: lead.phone || '',
      email: lead.email || '',
      maxRooms: lead.roomCount || 20,
      leadId: lead._id
    }));
    setIsCreateOwnerOpen(true);
  };

  // 💬 WhatsApp Outreach
  const getOutreachText = () => {
    const name = outreachContactName.trim() || 'Sir / Ma’am';
    const hotel = outreachHotelName.trim() || 'Your Hotel';

    if (selectedTemplate === 'brochure') {
      return `🏨 *Namaste ${name} ji!*
Greetings from *NexisParkX Hotel SaaS* ✨

We help hotels like *${hotel}* run a 100% digital front desk:
⚡ *AI OCR Scanner:* Auto-fills Guest Name, ID, Address from Aadhaar/Passport in 2 seconds.
📲 *Auto WhatsApp Receipts:* Instant digital welcome & check-in bills on guest mobile.
💳 *Dynamic UPI QR:* Guests pay room-wise via GooglePay/PhonePe with automatic room settlement!
🧹 *Housekeeping Board:* Track cleaned/dirty rooms in real-time.
📊 *Owner Multi-Property Dashboard:* Check today’s collections from anywhere on phone.

Would you like a *Free 10-Minute Live Demo* at ${hotel}?
Please let us know your available time today! 🙏`;
    }

    if (selectedTemplate === 'follow_up') {
      return `Namaste ${name} ji, regarding our software demo for *${hotel}*, please let me know your available time today. We would love to show you how easy check-ins and UPI bills can be! 🙏`;
    }

    return `Namaste ${name} ji, regarding our software demo for *${hotel}*, please let me know your available time today. Thank you!`;
  };

  const handleOpenWhatsAppOutreach = () => {
    const clean = outreachPhone.replace(/\D/g, '').slice(-10);
    if (!clean || clean.length !== 10) return alert('Enter valid 10-digit WhatsApp number');
    window.open(`https://wa.me/91${clean}?text=${encodeURIComponent(getOutreachText())}`, '_blank');
  };

  // --- FILTERED CALCULATIONS ---
  const q = searchQuery.toLowerCase();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const filteredOwners = owners.filter(o => {
    const match = o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || (o.phone && o.phone.includes(q));
    if (!match) return false;
    if (quickFilter === 'onboarded') {
      const owned = hostels.filter(h => (h.owner?._id || h.owner)?.toString() === o._id.toString());
      return o.onboardedBy?.toString() === user?._id || owned.some(h => h.isOnboardedByMe);
    }
    if (quickFilter === 'assigned') {
      const owned = hostels.filter(h => (h.owner?._id || h.owner)?.toString() === o._id.toString());
      return owned.some(h => h.isAssignedToMe && !h.isOnboardedByMe);
    }
    return true;
  });

  const filteredHostels = hostels.filter(h => {
    const match = 
      h.name.toLowerCase().includes(q) ||
      (h.address && h.address.toLowerCase().includes(q)) ||
      (h.contactNumber && h.contactNumber.includes(q)) ||
      (h.owner?.name && h.owner.name.toLowerCase().includes(q));

    if (!match) return false;
    if (quickFilter === 'onboarded' || quickFilter === 'mine') return h.isOnboardedByMe;
    if (quickFilter === 'assigned') return h.isAssignedToMe && !h.isOnboardedByMe;
    if (quickFilter === 'active') return h.planStatus === 'active';
    if (quickFilter === 'trial') return h.planStatus === 'trial' || h.plan === 'demo';
    return true;
  });

  const filteredStaff = staffUsers.filter(s => {
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)) || (s.assignedHostel?.name && s.assignedHostel.name.toLowerCase().includes(q));
  });

  const filteredLeads = leads.filter(l => {
    const match = l.hotelName.toLowerCase().includes(q) || l.contactPerson.toLowerCase().includes(q) || l.phone.includes(q) || (l.city && l.city.toLowerCase().includes(q));
    if (!match) return false;

    if (leadFilterTab === 'today') {
      if (!l.nextFollowUpDate) return false;
      const d = new Date(l.nextFollowUpDate);
      return d >= todayStart && d <= todayEnd && l.status !== 'won' && l.status !== 'lost';
    }
    if (leadFilterTab === 'overdue') {
      if (!l.nextFollowUpDate) return false;
      const d = new Date(l.nextFollowUpDate);
      return d < todayStart && l.status !== 'won' && l.status !== 'lost';
    }
    if (leadFilterTab === 'demo') {
      return l.status === 'demo_scheduled' || l.status === 'demo_completed';
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
        <p className="text-sm font-bold text-gray-500">Loading Sales Executive Headquarters...</p>
      </div>
    );
  }

  const agentName = stats?.agent?.name || user?.name || 'Executive';
  const monthlyTarget = stats?.agent?.monthlyTarget || 10;
  const thisMonthOnboarded = stats?.agent?.thisMonthOnboarded || 0;
  const targetProgressPct = stats?.agent?.targetProgressPct || 0;
  const remainingTarget = stats?.agent?.remainingTarget || 0;
  const daysLeft = stats?.agent?.daysRemainingInMonth || 0;
  const todayFollowUpsCount = stats?.pipeline?.todayFollowUps || 0;
  const overdueFollowUpsCount = stats?.pipeline?.overdueFollowUps || 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 pb-24 sm:pb-16 px-1 sm:px-0">
      
      {/* 🚀 TOP HERO BANNER (Responsive Mobile & Tablet Optimized) */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl relative overflow-hidden border border-gray-800">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase size={12} className="text-indigo-400" />
                <span>Field Sales Command</span>
              </span>
              <span className="text-xs text-gray-400 font-bold">· {agentName}</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-2">
              Hotel Client Management & Onboarding
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-medium max-w-2xl mt-1">
              Create hotel owners, configure properties, assign subscription plans, add front desk staff, and track field follow-ups.
            </p>
          </div>

          {/* Action CTAs - Responsive Flex / Grid */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setIsCreateOwnerOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Crown size={14} />
              <span>+ Owner</span>
            </button>

            <button
              onClick={() => {
                setPropertyForm(prev => ({ ...prev, owner: '' }));
                setIsAddPropertyOpen(true);
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Building size={14} />
              <span>+ Property</span>
            </button>

            <button
              onClick={() => setIsCreateStaffOpen(true)}
              className="flex-1 sm:flex-initial px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Users size={14} />
              <span>+ Staff</span>
            </button>

            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors border border-gray-700 active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 🎯 TARGET GAUGE & KEY METRICS (Responsive Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Monthly Target Progress Card */}
        <div className="sm:col-span-2 bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Target size={14} className="text-indigo-600" />
                <span>Monthly Hotel Onboarding Target</span>
              </span>
              <span className="text-xs font-black text-gray-900">
                {thisMonthOnboarded} / {monthlyTarget} Hotels ({targetProgressPct}%)
              </span>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-3 mt-3 overflow-hidden border border-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(4, targetProgressPct)}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 font-semibold mt-3 pt-2 border-t border-gray-100 gap-1">
            <span>{remainingTarget > 0 ? `🎯 Need ${remainingTarget} more hotels` : '🎉 Target achieved!'}</span>
            <span className="text-amber-600 font-bold">{daysLeft} days left in month</span>
          </div>
        </div>

        {/* My Managed Portfolio Hotels */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Building size={14} className="text-blue-600" />
            <span>My Active Portfolio</span>
          </span>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{stats?.myHotelsCount || 0}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 rounded-md">
                {stats?.onboardedByMeCount || 0} Closed by You
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 rounded-md">
                {stats?.assignedByAdminCount || 0} Assigned by Admin
              </span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">Hotels you manage & support</span>
        </div>

        {/* Follow-up Alerts & Leads */}
        <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Clock size={14} className="text-rose-600" />
              <span>Follow-ups Required</span>
            </span>
            {todayFollowUpsCount > 0 && (
              <span className="px-2 py-0.5 text-[9px] font-black bg-rose-100 text-rose-700 rounded-full animate-pulse">
                {todayFollowUpsCount} Today
              </span>
            )}
          </div>
          <div className="my-2">
            <p className="text-2xl sm:text-3xl font-black text-rose-600">
              {todayFollowUpsCount + overdueFollowUpsCount}
            </p>
            <p className="text-[11px] text-gray-500 font-medium mt-1">
              {overdueFollowUpsCount > 0 ? `⚠️ ${overdueFollowUpsCount} overdue · ` : ''}
              {todayFollowUpsCount} scheduled today
            </p>
          </div>
          <button
            onClick={() => {
              setActiveTab('leads');
              setLeadFilterTab(todayFollowUpsCount > 0 ? 'today' : 'all');
            }}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 text-left"
          >
            View follow-up queue →
          </button>
        </div>
      </div>

      {/* 🗂️ MAIN TABS & FAST SEARCH (Responsive Bar with Horizontal Scroll) */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-gray-100/70 p-2 rounded-2xl border border-gray-200">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button 
            onClick={() => setActiveTab('ecosystem')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'ecosystem' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Network size={14} className="text-purple-600" />
            <span>Ecosystem</span>
            <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-purple-100 text-purple-700 font-bold ml-1">
              Tree
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('leads')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'leads' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Target size={14} className="text-rose-600" />
            <span>Leads & Follow-ups</span>
            {(todayFollowUpsCount > 0 || overdueFollowUpsCount > 0) && (
              <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-rose-100 text-rose-700 font-bold ml-1">
                {todayFollowUpsCount + overdueFollowUpsCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('properties')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'properties' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Building size={14} className="text-blue-600" />
            <span>Hotels ({hostels.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('owners')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'owners' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Crown size={14} className="text-amber-600" />
            <span>Owners ({owners.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('staff')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'staff' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={14} className="text-indigo-600" />
            <span>Staff ({staffUsers.length})</span>
          </button>

          <button 
            onClick={() => setActiveTab('outreach')} 
            className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'outreach' ? 'bg-white shadow-sm text-gray-900 ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <MessageSquare size={14} className="text-emerald-600" />
            <span>WhatsApp</span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search hotel, owner, staff, phone..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none transition-all placeholder:text-gray-400 placeholder:font-normal" 
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: 🌐 HOTEL ECOSYSTEM - COMPLETE HIERARCHY TREE */}
      {/* ============================================================== */}
      {activeTab === 'ecosystem' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filter:</span>
            {['all', 'onboarded', 'assigned', 'active', 'trial'].map(filterKey => (
              <button
                key={filterKey}
                onClick={() => setQuickFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  quickFilter === filterKey 
                    ? 'bg-black text-white shadow-sm' 
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {filterKey === 'all' && `All Portfolio (${stats?.myHotelsCount || 0})`}
                {filterKey === 'onboarded' && `✨ Closed by Me (${stats?.onboardedByMeCount || 0})`}
                {filterKey === 'assigned' && `👑 Assigned by Admin (${stats?.assignedByAdminCount || 0})`}
                {filterKey === 'active' && '● Active Paid'}
                {filterKey === 'trial' && '⏳ Free Trials / Demos'}
              </button>
            ))}
          </div>

          {filteredOwners.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center shadow-sm">
              <Users size={36} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-sm font-black text-gray-700">No Hotel Ecosystem Clients Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                Register hotel owners and properties to start tracking their operations and front desks.
              </p>
              <button
                onClick={() => setIsCreateOwnerOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white font-black text-xs rounded-xl hover:bg-purple-700"
              >
                + Create Hotel Owner
              </button>
            </div>
          ) : (
            filteredOwners.map(owner => {
              const ownerHotels = filteredHostels.filter(h => (h.owner?._id || h.owner)?.toString() === owner._id.toString());
              if (ownerHotels.length === 0 && quickFilter !== 'all') return null;

              return (
                <div key={owner._id} className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Owner Header Bar */}
                  <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 via-purple-50/20 to-white border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm shrink-0">
                        {owner.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="text-sm sm:text-base font-black text-gray-900">{owner.name}</h3>
                          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 rounded-md">
                            Owner
                          </span>
                          {owner.isMine && (
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-md">
                              ⭐ Mine
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider ${
                            owner.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {owner.isActive !== false ? 'Active' : 'Locked'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500 font-semibold mt-1">
                          <span className="flex items-center gap-1 text-gray-700 font-bold truncate max-w-[200px] sm:max-w-none">
                            <Mail size={12} className="text-gray-400 shrink-0" /> {owner.email}
                          </span>
                          <span className="flex items-center gap-1 text-gray-700">
                            <Phone size={12} className="text-gray-400 shrink-0" /> {owner.phone || 'No phone'}
                          </span>
                          <span className="text-purple-700 font-black">
                            {ownerHotels.length} Properties
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Quick Actions */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => {
                          setPropertyForm(prev => ({
                            ...prev,
                            owner: owner._id,
                            contactNumber: owner.phone || '',
                            email: owner.email || ''
                          }));
                          setIsAddPropertyOpen(true);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl transition-all border border-indigo-200 flex items-center gap-1"
                      >
                        <Plus size={13} className="stroke-[3]" />
                        <span>Add Property</span>
                      </button>
                      <button
                        onClick={() => openEditUserModal(owner)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all border border-gray-200"
                        title="Edit Owner Details"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(owner._id)}
                        className={`p-1.5 rounded-xl transition-all border ${
                          owner.isActive !== false ? 'text-gray-500 hover:text-red-600 border-gray-200' : 'text-red-600 bg-red-50 border-red-200'
                        }`}
                        title={owner.isActive !== false ? "Lock Owner Account" : "Unlock Owner Account"}
                      >
                        {owner.isActive !== false ? <Unlock size={14} /> : <Lock size={14} />}
                      </button>
                      <button
                        onClick={() => setResetModalData({ userId: owner._id, userName: owner.name, role: 'Owner' })}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-gray-200"
                        title="Reset Owner Password"
                      >
                        <KeyRound size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Properties & Staff Tree */}
                  <div className="p-4 sm:p-6 space-y-4">
                    {ownerHotels.length === 0 ? (
                      <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                        <p className="text-xs text-gray-500 font-medium">No properties attached to this owner yet.</p>
                        <button
                          onClick={() => {
                            setPropertyForm(prev => ({
                              ...prev,
                              owner: owner._id,
                              contactNumber: owner.phone || '',
                              email: owner.email || ''
                            }));
                            setIsAddPropertyOpen(true);
                          }}
                          className="mt-2 text-xs font-black text-indigo-600 hover:text-indigo-800"
                        >
                          + Attach First Property Now
                        </button>
                      </div>
                    ) : (
                      ownerHotels.map(hotel => (
                        <div key={hotel._id} className="p-4 sm:p-5 bg-gray-50/60 rounded-2xl border border-gray-200 space-y-3 sm:space-y-4">
                          {/* Property Details Bar */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <Building size={16} className="text-blue-600 shrink-0" />
                                <h4 className="text-sm font-black text-gray-900">{hotel.name}</h4>
                                {hotel.isAssignedToMe && !hotel.isOnboardedByMe && (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                    👑 Assigned by Admin
                                  </span>
                                )}
                                {hotel.isOnboardedByMe && (
                                  <span className="px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    ✨ Closed by You
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider ${
                                  hotel.planStatus === 'active' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {hotel.planStatus === 'active' ? '● Active' : '⏳ Trial / Demo'}
                                </span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                                  hotel.isActive !== false ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {hotel.isActive !== false ? 'Live' : 'Locked'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="flex items-center gap-1">
                                  <MapPin size={11} className="text-gray-400 shrink-0" />
                                  <span>{hotel.address || 'Address not added'}</span>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="flex items-center gap-1">
                                  <Phone size={11} className="text-gray-400 shrink-0" />
                                  <span>{hotel.contactNumber || 'No contact'}</span>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="flex items-center gap-1">
                                  <CreditCard size={11} className="text-emerald-600 shrink-0" />
                                  <span className="font-bold text-gray-700">Tier: {(hotel.plan || 'Starter').toUpperCase()}</span>
                                </span>
                              </p>
                            </div>

                            {/* Property Actions - Responsive Grid on Mobile */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full md:w-auto">
                              <button
                                onClick={() => handleSalesImpersonate(hotel._id)}
                                disabled={impersonatingId === hotel._id}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                              >
                                <Sparkles size={12} />
                                <span>{impersonatingId === hotel._id ? 'Launching...' : '⚡ Demo'}</span>
                              </button>

                              <button
                                onClick={() => openPlanModal(hotel)}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-black text-xs rounded-xl border border-purple-200 flex items-center justify-center gap-1 transition-all"
                                title="Assign or Modify Subscription Plan"
                              >
                                <CreditCard size={12} />
                                <span>Plan</span>
                              </button>

                              <button
                                onClick={() => {
                                  setStaffForm(prev => ({ ...prev, assignedHostel: hotel._id }));
                                  setIsCreateStaffOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-xl border border-gray-200 flex items-center justify-center gap-1"
                              >
                                <Plus size={12} />
                                <span>Add Staff</span>
                              </button>

                              <button
                                onClick={() => handleTogglePropertyStatus(hotel._id)}
                                className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
                                  hotel.isActive !== false ? 'bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 border-gray-200' : 'bg-red-50 text-red-600 border-red-200'
                                }`}
                                title={hotel.isActive !== false ? "Lock Hotel Property" : "Unlock Hotel Property"}
                              >
                                {hotel.isActive !== false ? <Unlock size={13} /> : <Lock size={13} />}
                              </button>

                              <button
                                onClick={() => openEditPropertyModal(hotel)}
                                className="col-span-2 sm:col-span-1 p-1.5 bg-white hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 flex items-center justify-center"
                                title="Edit Property Details"
                              >
                                <Pencil size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Feature Toggles & Capabilities */}
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1 shrink-0">
                              Features:
                            </span>

                            <button
                              onClick={() => handleToggleFeature(hotel._id, 'aiOcr')}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 border shrink-0 ${
                                hotel.aiOcrEnabled !== false 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}
                            >
                              <span>AI OCR</span>
                              <span className="text-[10px]">{hotel.aiOcrEnabled !== false ? '✅' : '✕'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleFeature(hotel._id, 'whatsappSync')}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 border shrink-0 ${
                                hotel.whatsappSyncEnabled !== false 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}
                            >
                              <span>WhatsApp Bills</span>
                              <span className="text-[10px]">{hotel.whatsappSyncEnabled !== false ? '✅' : '✕'}</span>
                            </button>

                            <button
                              onClick={() => handleToggleFeature(hotel._id, 'laundry')}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 border shrink-0 ${
                                hotel.laundryEnabled !== false 
                                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                  : 'bg-white text-gray-400 border-gray-200'
                              }`}
                            >
                              <span>Laundry Board</span>
                              <span className="text-[10px]">{hotel.laundryEnabled !== false ? '✅' : '✕'}</span>
                            </button>

                            {hotel.upiId && (
                              <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0">
                                <QrCode size={11} className="text-gray-500" />
                                <span>UPI: {hotel.upiId}</span>
                              </span>
                            )}
                          </div>

                          {/* Front Desk Staff Members for this Hotel */}
                          <div className="pt-2 border-t border-gray-200/70">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Users size={12} className="text-indigo-600" />
                                <span>Front Desk Staff ({hotel.staffMembers?.length || 0})</span>
                              </span>
                              <button
                                onClick={() => {
                                  setStaffForm(prev => ({ ...prev, assignedHostel: hotel._id }));
                                  setIsCreateStaffOpen(true);
                                }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                              >
                                + Add Staff Member
                              </button>
                            </div>

                            {(!hotel.staffMembers || hotel.staffMembers.length === 0) ? (
                              <p className="text-xs text-gray-400 italic">No staff members created yet for this hotel.</p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {hotel.staffMembers.map(staff => (
                                  <div key={staff._id} className="p-2.5 bg-white rounded-xl border border-gray-200 flex items-center justify-between shadow-xs">
                                    <div className="truncate mr-2">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-black text-gray-900 truncate">{staff.name}</p>
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${staff.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                      </div>
                                      <p className="text-[10px] text-gray-500 truncate">{staff.email}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => openEditUserModal(staff)}
                                        className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
                                        title="Edit Staff"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      <button
                                        onClick={() => handleToggleUserStatus(staff._id)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded-md"
                                        title={staff.isActive !== false ? "Lock Staff" : "Unlock Staff"}
                                      >
                                        {staff.isActive !== false ? <Unlock size={11} /> : <Lock size={11} />}
                                      </button>
                                      <button
                                        onClick={() => setResetModalData({ userId: staff._id, userName: staff.name, role: 'Staff' })}
                                        className="p-1 text-gray-400 hover:text-amber-600 rounded-md"
                                        title="Reset Staff Password"
                                      >
                                        <KeyRound size={11} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: 🎯 FIELD LEADS & PROSPECTS PIPELINE WITH FOLLOW-UPS */}
      {/* ============================================================== */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-rose-600" />
                <span>Field Prospects & Follow-up Command</span>
              </h2>
              <p className="text-xs text-gray-500">Record on-ground visits, schedule demo follow-ups, and convert directly to clients.</p>
            </div>

            <button
              onClick={() => setIsLeadModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Add Field Prospect</span>
            </button>
          </div>

          {/* Follow-up Sub-tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setLeadFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                leadFilterTab === 'all' ? 'bg-black text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All Leads ({leads.length})
            </button>

            <button
              onClick={() => setLeadFilterTab('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                leadFilterTab === 'today' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-rose-600 hover:bg-rose-50'
              }`}
            >
              <Clock size={12} />
              <span>Today's Follow-ups ({todayFollowUpsCount})</span>
            </button>

            <button
              onClick={() => setLeadFilterTab('overdue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                leadFilterTab === 'overdue' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-amber-600 hover:bg-amber-50'
              }`}
            >
              <AlertTriangle size={12} />
              <span>Overdue Follow-ups ({overdueFollowUpsCount})</span>
            </button>

            <button
              onClick={() => setLeadFilterTab('demo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                leadFilterTab === 'demo' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-indigo-600 hover:bg-indigo-50'
              }`}
            >
              <Sparkles size={12} />
              <span>Demos Scheduled / Completed</span>
            </button>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center shadow-sm">
              <Target size={36} className="mx-auto text-gray-300 mb-3" />
              <h3 className="text-sm font-black text-gray-700">No leads in this queue</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                Record hot prospects while visiting hotels to manage their follow-ups.
              </p>
              <button
                onClick={() => setIsLeadModalOpen(true)}
                className="px-4 py-2 bg-purple-600 text-white font-black text-xs rounded-xl"
              >
                + Add Prospect Lead
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredLeads.map(lead => {
                const followDate = lead.nextFollowUpDate ? new Date(lead.nextFollowUpDate) : null;
                const isOverdue = followDate && followDate < todayStart && lead.status !== 'won' && lead.status !== 'lost';
                const isToday = followDate && followDate >= todayStart && followDate <= todayEnd;

                return (
                  <div key={lead._id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between space-y-3">
                    <div>
                      {/* Priority, Status & Overdue Badges */}
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                          lead.priority === 'hot' ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.priority === 'hot' ? '🔥 Hot Prospect' : `${lead.priority} priority`}
                        </span>

                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider ${
                          lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                          lead.status === 'demo_scheduled' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-gray-900 mt-2">{lead.hotelName}</h3>
                      <p className="text-xs text-gray-600 font-bold mt-0.5">{lead.contactPerson} {lead.city && `· ${lead.city}`}</p>

                      {/* Contact & Next Follow-up info */}
                      <div className="mt-3 text-xs text-gray-600 space-y-1.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 font-bold text-gray-800">
                            <Phone size={12} className="text-gray-400 shrink-0" /> {lead.phone}
                          </span>
                          <a
                            href={`https://wa.me/91${lead.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Namaste ${lead.contactPerson} ji! Following up regarding software demo for ${lead.hotelName}...`)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                          >
                            <MessageSquare size={11} /> WhatsApp
                          </a>
                        </div>

                        {followDate && (
                          <div className={`flex items-center gap-1 font-bold text-[11px] ${
                            isOverdue ? 'text-rose-600' : isToday ? 'text-amber-600 font-black' : 'text-gray-500'
                          }`}>
                            <Calendar size={11} />
                            <span>
                              Follow-up: {followDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {isOverdue && ' (Overdue ⚠️)'}
                              {isToday && ' (Today 🔥)'}
                            </span>
                          </div>
                        )}

                        <p className="text-[11px] text-gray-500">System: {lead.currentSystem} ({lead.roomCount} rooms)</p>
                        {lead.notes && <p className="text-[11px] italic text-gray-700 font-medium">"{lead.notes}"</p>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => openFollowUpModal(lead)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shrink-0"
                      >
                        <Clock size={12} />
                        <span>Follow-up</span>
                      </button>

                      {lead.status !== 'won' ? (
                        <button
                          onClick={() => convertLeadToClient(lead)}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <Trophy size={13} />
                          <span>Convert</span>
                        </button>
                      ) : (
                        <span className="flex-1 py-1.5 text-center text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                          ✅ Converted
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: 🏨 PROPERTIES DIRECTORY */}
      {/* ============================================================== */}
      {activeTab === 'properties' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">Hotel Properties Directory</h2>
              <p className="text-xs text-gray-500 font-medium">All properties configured in the ecosystem.</p>
            </div>
            <button
              onClick={() => {
                setPropertyForm(prev => ({ ...prev, owner: '' }));
                setIsAddPropertyOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Register Property</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotel Property</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotel Owner</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rooms & Staff</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan & Status</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHostels.map(h => (
                  <tr key={h._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="font-black text-gray-900 text-sm flex items-center gap-1.5 flex-wrap">
                          <Building size={14} className="text-blue-600 shrink-0" />
                          <span>{h.name}</span>
                          {h.isAssignedToMe && !h.isOnboardedByMe && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded uppercase bg-purple-100 text-purple-800 border border-purple-200">
                              👑 Assigned by Admin
                            </span>
                          )}
                          {h.isOnboardedByMe && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✨ Closed by You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{h.address || 'No address'}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{h.owner?.name || 'Owner N/A'}</p>
                        <p className="text-[11px] text-gray-500">{h.owner?.phone || h.owner?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-xs font-bold text-gray-700">
                      <span>{h.roomCount || 0} rooms</span>
                      <span className="text-gray-400 font-normal block">{h.staffCount || 0} staff</span>
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <div className="space-y-0.5">
                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md inline-block ${
                          h.planStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {h.planStatus === 'active' ? 'Active Paid' : 'Trial / Demo'}
                        </span>
                        <p className="text-[11px] text-gray-500 font-bold">Tier: {(h.plan || 'Starter').toUpperCase()}</p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSalesImpersonate(h._id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1"
                        >
                          <Sparkles size={12} />
                          <span>Demo</span>
                        </button>

                        <button
                          onClick={() => openPlanModal(h)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200"
                          title="Assign Plan"
                        >
                          <CreditCard size={12} />
                        </button>

                        <button
                          onClick={() => openEditPropertyModal(h)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: 👑 HOTEL OWNERS (ADMINS) */}
      {/* ============================================================== */}
      {activeTab === 'owners' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">Hotel Owners (Clients)</h2>
              <p className="text-xs text-gray-500 font-medium">Master logins for hotel owners.</p>
            </div>
            <button
              onClick={() => setIsCreateOwnerOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Create Owner</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner Name</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Login Email</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Properties Owned</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOwners.map(o => (
                  <tr key={o._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-black text-gray-900 text-sm">
                      <div className="flex items-center gap-2">
                        <Crown size={14} className="text-amber-500" />
                        <span>{o.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-bold text-gray-700 text-xs">{o.email}</td>
                    <td className="px-4 sm:px-6 py-4 text-xs font-semibold text-gray-600">{o.phone || 'No phone'}</td>
                    <td className="px-4 sm:px-6 py-4 text-center font-black text-gray-900">{o.ownedHostelsCount || 0}</td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditUserModal(o)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                          title="Edit Details"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setResetModalData({ userId: o._id, userName: o.name, role: 'Owner' })}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-gray-200"
                          title="Reset Password"
                        >
                          <KeyRound size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: 🛎️ FRONT DESK STAFF */}
      {/* ============================================================== */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900">Front Desk Staff Members</h2>
              <p className="text-xs text-gray-500 font-medium">Receptionist accounts attached to properties.</p>
            </div>
            <button
              onClick={() => setIsCreateStaffOpen(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Add Front Desk Staff</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Staff Name</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Hotel</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Login Email</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                  <th className="px-4 sm:px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStaff.map(s => (
                  <tr key={s._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 sm:px-6 py-4 font-black text-gray-900 text-sm">{s.name}</td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className="font-bold text-gray-900 text-xs flex items-center gap-1">
                        <Building size={13} className="text-blue-600" />
                        <span>{s.assignedHostel?.name || 'Unassigned'}</span>
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 font-bold text-gray-700 text-xs">{s.email}</td>
                    <td className="px-4 sm:px-6 py-4 text-xs font-semibold text-gray-600">{s.phone || 'No phone'}</td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditUserModal(s)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setResetModalData({ userId: s._id, userName: s.name, role: 'Staff' })}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-gray-200"
                        >
                          <KeyRound size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: 💬 WHATSAPP PITCH GENERATOR */}
      {/* ============================================================== */}
      {activeTab === 'outreach' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-600" />
              <span>1-Click WhatsApp Pitch Generator</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Send ready-to-share hotel brochures and demo invitations directly to hotel owners on WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Template</label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('brochure')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      selectedTemplate === 'brochure' ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    📄 Full Feature Brochure (AI OCR + QR + Bills)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate('follow_up')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      selectedTemplate === 'follow_up' ? 'bg-indigo-50 border-indigo-400 text-indigo-900' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    ⏰ Demo Follow-up Reminder
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={outreachContactName}
                  onChange={e => setOutreachContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hotel Name</label>
                <input
                  type="text"
                  placeholder="e.g. Hotel Grand Inn"
                  value={outreachHotelName}
                  onChange={e => setOutreachHotelName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Owner WhatsApp Number *</label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={outreachPhone}
                  onChange={e => setOutreachPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                onClick={handleOpenWhatsAppOutreach}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={14} />
                <span>Send via WhatsApp</span>
              </button>
            </div>

            <div className="md:col-span-2 bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block mb-2">
                  Live WhatsApp Message Preview
                </span>
                <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap bg-white p-3 sm:p-4 rounded-xl border border-gray-200 leading-relaxed max-h-80 overflow-y-auto">
                  {getOutreachText()}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 👑 MODAL 1: CREATE HOTEL OWNER (ADMIN) */}
      {/* ============================================================== */}
      {isCreateOwnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/20 px-2.5 py-0.5 rounded-full">
                  Step 1 · Client Onboarding
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">Create Hotel Owner (Admin)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Master owner account for managing properties.</p>
              </div>
              <button onClick={() => setIsCreateOwnerOpen(false)} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOwner} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  value={ownerForm.name}
                  onChange={e => setOwnerForm({ ...ownerForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Email Address (Login ID) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rajesh@hotelroyal.com"
                  value={ownerForm.email}
                  onChange={e => setOwnerForm({ ...ownerForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={ownerForm.phone}
                    onChange={e => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    value={ownerForm.password}
                    onChange={e => setOwnerForm({ ...ownerForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900">
                <Crown size={16} className="text-purple-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Hotel Owner (Admin):</strong> Once created, you can attach their first property or multiple properties immediately.
                </p>
              </div>

              <div className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOwnerOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingOwner}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {creatingOwner ? 'Creating...' : 'Create Hotel Owner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🏨 MODAL 2: REGISTER PROPERTY */}
      {/* ============================================================== */}
      {isAddPropertyOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 px-2.5 py-0.5 rounded-full">
                  Step 2 · Property Registration
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">Register Hotel Property</h3>
                <p className="text-xs text-gray-400 mt-0.5">Attach hotel property to a registered owner.</p>
              </div>
              <button onClick={() => setIsAddPropertyOpen(false)} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Hotel Property Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hotel Royal Orchid"
                  value={propertyForm.name}
                  onChange={e => setPropertyForm({ ...propertyForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Select Hotel Owner (Admin) *</label>
                <select
                  required
                  value={propertyForm.owner}
                  onChange={e => setPropertyForm({ ...propertyForm, owner: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">-- Choose Hotel Owner --</option>
                  {owners.map(o => (
                    <option key={o._id} value={o._id}>{o.name} ({o.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Property Address</label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Railway Station, Jaipur"
                  value={propertyForm.address}
                  onChange={e => setPropertyForm({ ...propertyForm, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={propertyForm.contactNumber}
                    onChange={e => setPropertyForm({ ...propertyForm, contactNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Max Rooms Capacity</label>
                  <input
                    type="number"
                    value={propertyForm.maxRooms}
                    onChange={e => setPropertyForm({ ...propertyForm, maxRooms: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">UPI ID for Direct QR</label>
                  <input
                    type="text"
                    placeholder="e.g. hotelroyal@upi"
                    value={propertyForm.upiId}
                    onChange={e => setPropertyForm({ ...propertyForm, upiId: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">UPI Payee Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Hotel Royal Orchid"
                    value={propertyForm.upiPayeeName}
                    onChange={e => setPropertyForm({ ...propertyForm, upiPayeeName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPropertyOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProperty}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {creatingProperty ? 'Registering...' : 'Register Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🛎️ MODAL 3: ADD FRONT DESK STAFF */}
      {/* ============================================================== */}
      {isCreateStaffOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  Step 3 · Staff Allocation
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">Add Front Desk Staff</h3>
                <p className="text-xs text-gray-400 mt-0.5">Creates receptionist account for check-in operations.</p>
              </div>
              <button onClick={() => setIsCreateStaffOpen(false)} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Verma"
                  value={staffForm.name}
                  onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Assign to Hotel Property *</label>
                <select
                  required
                  value={staffForm.assignedHostel}
                  onChange={e => setStaffForm({ ...staffForm, assignedHostel: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">-- Choose Assigned Hotel --</option>
                  {hostels.map(h => (
                    <option key={h._id} value={h._id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase mb-1">Staff Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. frontdesk@hotelroyal.com"
                  value={staffForm.email}
                  onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={staffForm.phone}
                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase mb-1">Initial Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="password123"
                    value={staffForm.password}
                    onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateStaffOpen(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {creatingStaff ? 'Creating...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎟️ MODAL 4: PLAN ASSIGNMENT & SUBSCRIPTION (Like Super Admin) */}
      {/* ============================================================== */}
      {selectedPlanHotel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92dvh] sm:max-h-[88vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Subscription Tier & Plan Setup
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">Manage Hotel Subscription</h3>
                <p className="text-xs text-gray-400 mt-0.5">Configure plan, validity, price, and rooms for {selectedPlanHotel.name}.</p>
              </div>
              <button onClick={() => setSelectedPlanHotel(null)} className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs font-bold">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Plan Tier</label>
                  <select
                    value={planForm.plan}
                    onChange={e => {
                      const p = e.target.value;
                      const price = p === 'demo' ? 0 : p === 'starter' ? 2499 : p === 'standard' ? 3999 : 6999;
                      setPlanForm({ ...planForm, plan: p, planPrice: price, planStatus: p === 'demo' ? 'trial' : 'active' });
                    }}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="demo">Free Trial / Demo (14 Days)</option>
                    <option value="starter">Starter Plan (₹2,499/mo)</option>
                    <option value="standard">Standard Plan (₹3,999/mo)</option>
                    <option value="growth">Growth Plan (₹6,999/mo)</option>
                    <option value="enterprise">Enterprise Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 uppercase mb-1">Status</label>
                  <select
                    value={planForm.planStatus}
                    onChange={e => setPlanForm({ ...planForm, planStatus: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="active">Active Paid</option>
                    <option value="trial">Trial / Demo</option>
                    <option value="grace">Grace Period</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Amount Charged (₹)</label>
                  <input
                    type="number"
                    value={planForm.planPrice}
                    onChange={e => setPlanForm({ ...planForm, planPrice: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 uppercase mb-1">Billing Cycle</label>
                  <select
                    value={planForm.billingCycle}
                    onChange={e => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly (Annual)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={planForm.planStartDate}
                    onChange={e => setPlanForm({ ...planForm, planStartDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 uppercase mb-1">End / Expiry Date</label>
                  <input
                    type="date"
                    value={planForm.planEndDate}
                    onChange={e => setPlanForm({ ...planForm, planEndDate: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Max Rooms Capacity Limit</label>
                <input
                  type="number"
                  value={planForm.maxRooms}
                  onChange={e => setPlanForm({ ...planForm, maxRooms: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Plan Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. 14-day free trial assigned during field visit"
                  value={planForm.planNotes}
                  onChange={e => setPlanForm({ ...planForm, planNotes: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanHotel(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  {savingPlan ? 'Saving...' : 'Save Plan Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ✏️ MODAL 5: EDIT PROPERTY DETAILS */}
      {/* ============================================================== */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Pencil size={16} className="text-blue-600" />
                <span>Edit Property Details</span>
              </h3>
              <button onClick={() => setEditingProperty(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProperty} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">Property Name</label>
                <input
                  type="text"
                  required
                  value={editPropertyForm.name}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={editPropertyForm.address}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={editPropertyForm.contactNumber}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, contactNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Max Rooms</label>
                  <input
                    type="number"
                    value={editPropertyForm.maxRooms}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, maxRooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">UPI ID</label>
                  <input
                    type="text"
                    value={editPropertyForm.upiId}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, upiId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 uppercase mb-1">UPI Payee Name</label>
                  <input
                    type="text"
                    value={editPropertyForm.upiPayeeName}
                    onChange={e => setEditPropertyForm({ ...editPropertyForm, upiPayeeName: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditProperty}
                  className="px-5 py-2 bg-black text-white font-black rounded-xl"
                >
                  {savingEditProperty ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 👤 MODAL 6: EDIT USER DETAILS */}
      {/* ============================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Pencil size={16} className="text-purple-600" />
                <span>Edit User Details</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserForm.name}
                  onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Email (Login ID)</label>
                <input
                  type="email"
                  required
                  value={editUserForm.email}
                  onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editUserForm.phone}
                  onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditUser}
                  className="px-5 py-2 bg-black text-white font-black rounded-xl"
                >
                  {savingEditUser ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🔑 MODAL 7: RESET PASSWORD */}
      {/* ============================================================== */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <KeyRound size={16} className="text-amber-500" />
                <span>Reset Password</span>
              </h3>
              <button onClick={() => setResetModalData(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Update password for <strong>{resetModalData.userName}</strong> ({resetModalData.role}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="flex justify-end gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => setResetModalData(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword}
                  className="px-4 py-2 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-700"
                >
                  {resettingPassword ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🎯 MODAL 8: ADD FIELD PROSPECT LEAD */}
      {/* ============================================================== */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Target size={18} className="text-purple-600" />
                <span>Log Field Prospect Lead</span>
              </h3>
              <button onClick={() => setIsLeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">Record hotel visits and follow-ups on the ground.</p>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">Hotel Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hotel Sunshine"
                  value={leadForm.hotelName}
                  onChange={e => setLeadForm({ ...leadForm, hotelName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Contact Person Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Singh"
                    value={leadForm.contactPerson}
                    onChange={e => setLeadForm({ ...leadForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Udaipur"
                    value={leadForm.city}
                    onChange={e => setLeadForm({ ...leadForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Priority</label>
                  <select
                    value={leadForm.priority}
                    onChange={e => setLeadForm({ ...leadForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="hot">🔥 Hot (High Interest)</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Initial Next Follow-up Date</label>
                <input
                  type="date"
                  value={leadForm.nextFollowUpDate}
                  onChange={e => setLeadForm({ ...leadForm, nextFollowUpDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Visit Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes from hotel visit..."
                  value={leadForm.notes}
                  onChange={e => setLeadForm({ ...leadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsLeadModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLead}
                  className="px-5 py-2 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-700"
                >
                  {savingLead ? 'Saving...' : 'Save Prospect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 📅 MODAL 9: LOG FOLLOW-UP ACTIVITY */}
      {/* ============================================================== */}
      {followUpModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 text-left max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-rose-600" />
                <span>Log Follow-up Activity</span>
              </h3>
              <button onClick={() => setFollowUpModalLead(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Record discussion and set next follow-up for <strong>{followUpModalLead.hotelName}</strong> ({followUpModalLead.contactPerson}).
            </p>

            <form onSubmit={handleSaveFollowUp} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">Discussion Note *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Spoke with owner, showed demo on phone. Asked to call tomorrow at 4 PM to confirm plan..."
                  value={followUpForm.note}
                  onChange={e => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 uppercase mb-1">Next Follow-up Date *</label>
                  <input
                    type="date"
                    required
                    value={followUpForm.nextFollowUpDate}
                    onChange={e => setFollowUpForm({ ...followUpForm, nextFollowUpDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 uppercase mb-1">Update Stage Status</label>
                  <select
                    value={followUpForm.status}
                    onChange={e => setFollowUpForm({ ...followUpForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="contacted">Contacted</option>
                    <option value="demo_scheduled">Demo Scheduled</option>
                    <option value="demo_completed">Demo Completed</option>
                    <option value="negotiation">Negotiation / Pricing</option>
                    <option value="won">Won (Ready to Onboard)</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              {/* Past follow-up history if any */}
              {followUpModalLead.followUpHistory && followUpModalLead.followUpHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest block mb-2">Previous Interactions</span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {followUpModalLead.followUpHistory.map((hist, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded-xl border border-gray-100 text-[11px]">
                        <p className="text-gray-800 font-medium">{hist.note}</p>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {new Date(hist.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · Stage: {hist.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFollowUpModalLead(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFollowUp}
                  className="px-5 py-2 bg-rose-600 text-white font-black rounded-xl text-xs hover:bg-rose-700 disabled:opacity-50"
                >
                  {savingFollowUp ? 'Logging...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📱 MOBILE FLOATING ACTION BAR (Fixed on Mobile Phones for Instant Thumb Access) */}
      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-2 shadow-2xl flex items-center justify-around">
        <button
          onClick={() => setIsCreateOwnerOpen(true)}
          className="flex flex-col items-center gap-0.5 text-purple-700 p-1"
        >
          <Crown size={16} />
          <span className="text-[10px] font-black">+ Owner</span>
        </button>

        <button
          onClick={() => {
            setPropertyForm(prev => ({ ...prev, owner: '' }));
            setIsAddPropertyOpen(true);
          }}
          className="flex flex-col items-center gap-0.5 text-indigo-700 p-1"
        >
          <Building size={16} />
          <span className="text-[10px] font-black">+ Hotel</span>
        </button>

        <button
          onClick={() => setIsCreateStaffOpen(true)}
          className="flex flex-col items-center gap-0.5 text-blue-700 p-1"
        >
          <Users size={16} />
          <span className="text-[10px] font-black">+ Staff</span>
        </button>

        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-rose-700 p-1"
        >
          <Target size={16} />
          <span className="text-[10px] font-black">+ Lead</span>
        </button>

        <button
          onClick={() => setActiveTab('outreach')}
          className="flex flex-col items-center gap-0.5 text-emerald-700 p-1"
        >
          <MessageSquare size={16} />
          <span className="text-[10px] font-black">Pitch</span>
        </button>
      </div>

    </div>
  );
};

export default SalesDashboard;
