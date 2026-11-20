import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
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
  Pencil,
  QrCode,
  Shirt,
  ShieldCheck,
  CreditCard,
  Network,
  Crown,
  Clock,
  ChevronRight,
  Trophy,
  Menu,
  X,
  LogOut,
  RefreshCw,
  Hexagon,
  Download,
  BookOpen
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SuperAdminStats from '../../components/superadmin/SuperAdminStats';
import EcosystemView from '../../components/superadmin/EcosystemView';
import SubscriptionsView from '../../components/superadmin/SubscriptionsView';
import SalesTeamView from '../../components/superadmin/SalesTeamView';
import OnboardingWizardModal from '../../components/common/OnboardingWizardModal';
import SubscriptionPlanModal from '../../components/common/SubscriptionPlanModal';

const SuperAdminDashboard = () => {
  // --- 1. ALL HOOKS STRICTLY AT THE TOP ---
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [salesTeamData, setSalesTeamData] = useState(null);
  const [subscriptionTransactions, setSubscriptionTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Tabs: 'ecosystem' (default) | 'subscriptions' | 'sales' | 'owners' | 'hostels' | 'all-users'
  const [activeTab, setActiveTab] = useState('ecosystem');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');

  // 🚀 Fast Client Onboarding Modal State
  const [isOnboardingWizardOpen, setIsOnboardingWizardOpen] = useState(false);
  const [onboardingInitialData, setOnboardingInitialData] = useState({});

  // 👤 Create New Hotel Owner (Admin) Modal State
  const [isCreateOwnerOpen, setIsCreateOwnerOpen] = useState(false);
  const [newOwnerForm, setNewOwnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: 'password123',
    role: 'admin',
    assignedHostel: null
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
    assignedSalesAgent: '',
    upiId: '',
    upiPayeeName: '',
    plan: 'monthly',
    planStatus: 'active',
    planStartDate: new Date().toISOString().split('T')[0],
    planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    planPrice: 1000,
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
    owner: '',
    upiId: '',
    upiPayeeName: ''
  });
  const [savingEditProperty, setSavingEditProperty] = useState(false);

  // 👤 Edit User / Phone Details Modal State
  const [selectedEditUser, setSelectedEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [savingUser, setSavingUser] = useState(false);

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
      const [statsRes, usersRes, hostelsRes, salesRes, subTxRes] = await Promise.all([
        axios.get(`${API}/api/superadmin/stats`),
        axios.get(`${API}/api/superadmin/users`),
        axios.get(`${API}/api/superadmin/hostels`),
        axios.get(`${API}/api/superadmin/sales-team`).catch(() => ({ data: { data: null } })),
        axios.get(`${API}/api/superadmin/subscription-transactions`).catch(() => ({ data: { data: { transactions: [] } } }))
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data || []);
      setHostels(hostelsRes.data.data || []);
      setSalesTeamData(salesRes.data?.data || null);
      setSubscriptionTransactions(subTxRes.data?.data?.transactions || []);
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
      const roleLabel = createdUser.role === 'sales'
        ? 'Field Sales Executive'
        : createdUser.role === 'receptionist'
        ? 'Front Desk Staff'
        : 'Hotel Owner';
      alert(`✅ ${roleLabel} "${createdUser.name}" created successfully!\nEmail: ${createdUser.email}`);
      setIsCreateOwnerOpen(false);
      
      const prevEmail = newOwnerForm.email;
      const wasAdmin = newOwnerForm.role === 'admin';
      setNewOwnerForm({
        name: '',
        email: '',
        phone: '',
        password: 'password123',
        role: 'admin',
        assignedHostel: null
      });

      // Refresh data
      await fetchData();

      // Offer to immediately assign a property to this new owner
      if (wasAdmin && window.confirm(`Would you like to register their first property now for ${createdUser.name}?`)) {
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
        upiId: '',
        upiPayeeName: '',
        plan: 'monthly',
        planStatus: 'active',
        planStartDate: new Date().toISOString().split('T')[0],
        planEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        planPrice: 1000,
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

  const handleAssignSalesAgent = async (hostelId, salesAgentId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/assign-sales`, {
        salesAgentId: salesAgentId || null
      });
      if (res.data.success) {
        setHostels(prev => prev.map(h => h._id === hostelId ? { ...h, assignedSalesAgent: res.data.data.assignedSalesAgent } : h));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign sales representative');
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

  const handleImpersonate = async (target, e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const targetUserId = typeof target === 'object' && target !== null ? target.userId : target;

    if (!targetUserId) {
      alert('⚠️ User ID is missing');
      return;
    }

    if (!window.confirm('Are you sure you want to log in as this user? You can return to Super Admin anytime by clicking "Return to Super Admin" on the top banner.')) {
      return;
    }
    
    try {
      setImpersonating(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/superadmin/impersonate`, { userId: targetUserId });
      const { token, user: targetUser } = res.data;
      
      if (!token) throw new Error('No authentication token received from server');

      // Preserve original superadmin token if not already stored
      const currentToken = localStorage.getItem('token');
      if (!localStorage.getItem('superAdminToken') && currentToken) {
        localStorage.setItem('superAdminToken', currentToken);
        localStorage.setItem('impersonateReturnUrl', '/superadmin');
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

      if (targetUser.role === 'sales') {
        window.location.href = '/sales';
      } else if (targetUser.role === 'superadmin') {
        window.location.href = '/superadmin';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Impersonation error:', err);
      alert(err.response?.data?.message || err.message || 'Impersonation failed');
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

  const handleToggleLaundry = async (hostelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-laundry`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, laundryEnabled: res.data.data.laundryEnabled } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle Laundry Management status');
    }
  };

  const handleToggleDailyRegister = async (hostelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-daily-register`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, dailyRegisterEnabled: res.data.data.dailyRegisterEnabled } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle Daily Register status');
    }
  };

  const handleToggleDigitalAadhaar = async (hostelId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/hostels/${hostelId}/toggle-digital-aadhaar`);
      setHostels(hostels.map(h => h._id === hostelId ? { ...h, digitalAadhaarEnabled: res.data.data.digitalAadhaarEnabled } : h));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle Digital Aadhaar status');
    }
  };

  const openPlanModal = (h) => {
    setSelectedPlanHostel(h);
    const startIso = h.planStartDate ? new Date(h.planStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const endIso = h.planEndDate ? new Date(h.planEndDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setPlanForm({
      plan: h.plan || 'monthly',
      planStatus: h.planStatus || 'active',
      planStartDate: startIso,
      planEndDate: endIso,
      planPrice: h.planPrice !== undefined ? h.planPrice : 1000,
      discountAmount: h.discountAmount || 0,
      extraCharges: h.extraCharges || 0,
      billingCycle: h.billingCycle || 'monthly',
      maxRooms: h.maxRooms || 20,
      planNotes: h.planNotes || ''
    });
  };

  const handleSavePlan = async (planData) => {
    if (!selectedPlanHostel) return;
    if (planData?._action === 'refresh_only') {
      await fetchData();
      return;
    }
    try {
      setSavingPlan(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const payload = planData || planForm;
      const res = await axios.put(`${API}/api/superadmin/hostels/${selectedPlanHostel._id}/plan`, payload);
      setHostels(hostels.map(h => h._id === selectedPlanHostel._id ? { ...h, ...res.data.data } : h));
      alert(`✅ Subscription plan updated successfully for ${selectedPlanHostel.name}`);
      setSelectedPlanHostel(null);
      fetchData(); // 🔄 Re-fetch stats, hostels & transaction ledger so revenue updates in real-time
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
      owner: h.owner?._id || h.owner || '',
      assignedSalesAgent: h.assignedSalesAgent?._id || (typeof h.assignedSalesAgent === 'string' ? h.assignedSalesAgent : ''),
      upiId: h.upiId || '',
      upiPayeeName: h.upiPayeeName || ''
    });
  };

  const handleSaveEditProperty = async (e) => {
    e.preventDefault();
    if (!selectedEditHostel) return;
    try {
      setSavingEditProperty(true);
      const payload = { ...editPropertyForm };
      if (!payload.owner) delete payload.owner;
      const res = await axios.put(`${API}/api/hostels/${selectedEditHostel._id}`, payload);
      alert(`✅ Property details updated successfully for "${editPropertyForm.name}"`);
      if (res.data?.data) {
        setHostels(prev => prev.map(h => h._id === selectedEditHostel._id ? { ...h, ...res.data.data } : h));
      }
      setSelectedEditHostel(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update property details');
    } finally {
      setSavingEditProperty(false);
    }
  };

  const openEditUserModal = (u, fallbackPhone = '') => {
    setSelectedEditUser(u);
    setEditUserForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || fallbackPhone || ''
    });
  };

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!selectedEditUser) return;
    try {
      setSavingUser(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/users/${selectedEditUser._id}`, editUserForm);
      setUsers(users.map(u => u._id === selectedEditUser._id ? { ...u, ...res.data.data } : u));
      setHostels(hostels.map(h => {
        if ((h.owner?._id || h.owner) === selectedEditUser._id) {
          return {
            ...h,
            owner: typeof h.owner === 'object' ? { ...h.owner, phone: editUserForm.phone, name: editUserForm.name } : h.owner
          };
        }
        return h;
      }));
      alert(`✅ User details & phone number updated successfully!`);
      setSelectedEditUser(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user details');
    } finally {
      setSavingUser(false);
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

  // Helper to open Create Staff modal pre-assigned to a specific hotel
  const openCreateStaffForHotel = (hostelId) => {
    setNewOwnerForm({
      name: '',
      email: '',
      phone: '',
      password: 'password123',
      role: 'receptionist',
      assignedHostel: hostelId
    });
    setIsCreateOwnerOpen(true);
  };

  // Helper to open Create Sales Executive modal
  const openCreateSalesAgent = () => {
    setNewOwnerForm({
      name: '',
      email: '',
      phone: '',
      password: 'password123',
      role: 'sales',
      assignedHostel: null
    });
    setIsCreateOwnerOpen(true);
  };

  // --- 4. FILTERED DATA CALCULATIONS ---
  const hotelOwners = users.filter(u => u.role === 'admin');
  const staffUsers = users.filter(u => u.role === 'receptionist');
  const salesUsers = users.filter(u => u.role === 'sales');
  
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

  const exportPropertiesCsv = () => {
    const headers = ['Property Name', 'Owner Name', 'Owner Email', 'Owner Phone', 'City / Address', 'Plan Tier', 'Price (INR)', 'Billing Cycle', 'Status', 'AI OCR', 'WhatsApp Sync'];
    const rows = filteredHostels.map(h => [
      `"${(h.name || '').replace(/"/g, '""')}"`,
      `"${(h.owner?.name || '').replace(/"/g, '""')}"`,
      `"${(h.owner?.email || '').replace(/"/g, '""')}"`,
      `"${(h.owner?.phone || h.contactNumber || '').replace(/"/g, '""')}"`,
      `"${(h.address || '').replace(/"/g, '""')}"`,
      `"${(h.plan || 'starter').toUpperCase()}"`,
      h.planPrice || 0,
      `"${h.billingCycle || 'monthly'}"`,
      `"${h.isActive !== false ? 'Active' : 'Locked'}"`,
      `"${h.aiOcrEnabled ? 'Enabled' : 'Disabled'}"`,
      `"${h.whatsappSyncEnabled ? 'Enabled' : 'Disabled'}"`
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotel-properties-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased overflow-x-hidden w-full max-w-full">
      {/* 🏛️ CLEAN ENTERPRISE TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-3">
            {/* Left: Brand & Badge */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src="/logo.png" alt="NXHotel Logo" className="w-9 h-9 rounded-xl object-contain shadow-xs shrink-0 bg-white border border-slate-200/80 p-0.5" />
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-slate-950 text-base tracking-tight">NX<span className="text-emerald-600">Hotel</span></h1>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Super Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Headquarters Command Console</p>
              </div>
            </div>

            {/* Right: Search, Actions, Profile & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="relative hidden md:block w-48 lg:w-64 shrink-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search platform..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-slate-900 focus:bg-white outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={() => {
                  setOnboardingInitialData({});
                  setIsOnboardingWizardOpen(true);
                }}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Launch Fast Client Onboarding Wizard"
              >
                <Sparkles size={14} className="text-amber-300" />
                <span className="hidden sm:inline">+ Onboard Hotel</span>
                <span className="sm:hidden">+ Onboard</span>
              </button>

              <button
                onClick={() => {
                  setNewOwnerForm({
                    name: '',
                    email: '',
                    phone: '',
                    password: 'password123',
                    role: 'admin',
                    assignedHostel: null
                  });
                  setIsCreateOwnerOpen(true);
                }}
                className="hidden md:inline-flex px-3 py-2 bg-white hover:bg-slate-50 text-slate-750 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Crown size={13} />
                <span>New Owner</span>
              </button>

              <a
                href="/sales"
                className="hidden lg:inline-flex px-3 py-2 bg-white hover:bg-slate-50 text-slate-750 font-bold text-xs rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 items-center gap-1.5 cursor-pointer shrink-0"
                title="Directly launch Field Sales Operations Portal"
              >
                <Briefcase size={13} className="text-slate-600" />
                <span>Sales Portal</span>
              </a>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all cursor-pointer shrink-0"
                title="Refresh Data"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>

              {/* User Profile & High-Visibility Logout Button */}
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 border-l border-slate-200 shrink-0">
                <div className="hidden sm:flex w-8 h-8 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs items-center justify-center shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <button
                  type="button"
                  onClick={() => logout ? logout() : (localStorage.clear(), window.location.href = '/login')}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-xl font-black text-xs transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                  title="Sign out of Super Admin Console"
                >
                  <LogOut size={13} className="stroke-[2.5]" />
                  <span className="text-[11px] font-black uppercase tracking-wider">Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* 🗂️ HORIZONTAL SEGMENTED PILL TABS BAR */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 border-t border-slate-100">
            {[
              { id: 'ecosystem', name: 'Hierarchy Tree', icon: Network, badge: 'Full' },
              { id: 'hostels', name: 'Properties', icon: Building, badge: hostels.length },
              { id: 'owners', name: 'Owners', icon: Crown, badge: hotelOwners.length },
              { id: 'subscriptions', name: 'Subscriptions', icon: CreditCard, badge: `₹${((stats?.totalSaasRevenue || 0)/1000).toFixed(0)}k` },
              { id: 'sales', name: 'Sales Team', icon: Trophy, badge: salesUsers.length },
              { id: 'all-users', name: 'Staff Logins', icon: Users, badge: users.length },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                  <span>{tab.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Mobile search bar */}
        <div className="md:hidden relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search platform..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-slate-900 outline-none"
          />
        </div>

      {/* ============================================================== */}
      {/* TAB 0: 🌐 HOTEL ECOSYSTEM - COMPLETE HIERARCHY TREE */}
      {/* ============================================================== */}
      {activeTab === 'ecosystem' && (
        <div className="space-y-6">
          {/* 📊 Top Enterprise Metrics Bar */}
          <SuperAdminStats
            stats={stats}
            hotelOwnersCount={hotelOwners.length}
            hostelsCount={stats?.totalHostels || hostels.length}
            activeHostelsCount={activeHostelsCount}
            lockedHostelsCount={lockedHostelsCount}
            staffCount={staffUsers.length}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
          />

          <EcosystemView
            owners={filteredOwners}
            hostels={hostels}
            users={users}
            salesAgents={users.filter(u => u.role === 'sales')}
          onAssignSalesAgent={handleAssignSalesAgent}
          onImpersonate={handleImpersonate}
          onResetPassword={handleResetPassword}
          onEditUser={openEditUserModal}
          onOpenAddProperty={openAddPropertyForOwner}
          onOpenPlanModal={openPlanModal}
          onEditProperty={openEditPropertyModal}
          onToggleHostelStatus={handleToggleHostelStatus}
          onToggleAiOcr={handleToggleAiOcr}
          onToggleWhatsAppSync={handleToggleWhatsAppSync}
          onToggleLaundry={handleToggleLaundry}
          onToggleDailyRegister={handleToggleDailyRegister}
          onToggleDigitalAadhaar={handleToggleDigitalAadhaar}
          onOpenCreateStaffForHotel={openCreateStaffForHotel}
          onOpenCreateOwner={() => {
            setNewOwnerForm({
              name: '',
              email: '',
              phone: '',
              password: 'password123',
              role: 'admin',
              assignedHostel: null
            });
            setIsCreateOwnerOpen(true);
          }}
          onOpenRegisterProperty={() => {
            setNewPropertyForm(prev => ({ ...prev, owner: '' }));
            setIsAddPropertyOpen(true);
          }}
          onOpenOnboardingWizard={() => {
            setOnboardingInitialData({});
            setIsOnboardingWizardOpen(true);
          }}
          impersonating={impersonating}
          quickFilter={quickFilter}
        />
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 0.5: 💰 SAAS PLANS & REVENUE HEADQUARTERS */}
      {/* ============================================================== */}
      {activeTab === 'subscriptions' && (
        <SubscriptionsView
          stats={stats}
          hostels={filteredHostels}
          allHostels={hostels}
          transactions={subscriptionTransactions}
          onOpenPlanModal={openPlanModal}
          onRefresh={fetchData}
          currentUserRole="superadmin"
        />
      )}

      {/* ============================================================== */}
      {/* TAB 0.7: 💼 FIELD SALES TEAM & PERFORMANCE LEADERBOARD */}
      {/* ============================================================== */}
      {activeTab === 'sales' && (
        <SalesTeamView
          salesData={salesTeamData}
          onOpenCreateSalesAgent={openCreateSalesAgent}
          onResetPassword={handleResetPassword}
          onImpersonate={handleImpersonate}
          impersonating={impersonating}
          onRefresh={fetchData}
          loading={loading}
        />
      )}

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
            <table className="w-full min-w-[650px] text-left text-sm whitespace-nowrap">
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
                  const propContact = ownerProps.find(p => p.contactNumber && p.contactNumber !== 'N/A' && p.contactNumber.trim() !== '')?.contactNumber;
                  const displayPhone = o.phone || propContact || '';

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
                          {displayPhone ? (
                            <div className="flex items-center gap-1.5">
                              <a 
                                href={`tel:${displayPhone}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                                title="Click to call"
                              >
                                <Phone size={13} className="text-emerald-600" />
                                <span>{displayPhone}</span>
                              </a>
                              <button
                                onClick={() => openEditUserModal(o, displayPhone)}
                                className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
                                title="Edit Phone Number"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-medium italic">No phone added</span>
                              <button
                                onClick={() => openEditUserModal(o)}
                                className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              >
                                + Add Phone
                              </button>
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
            <div className="flex items-center gap-2">
              <button
                onClick={exportPropertiesCsv}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Download properties directory as CSV"
              >
                <Download size={14} className="text-slate-600" />
                <span>Export CSV</span>
              </button>
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
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property Details</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner (Admin)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales Rep</th>
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold text-gray-400">📞 {h.contactNumber || 'No Phone'}</span>
                              {h.upiId && (
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 flex items-center gap-1">
                                  <QrCode size={10} className="text-purple-600" />
                                  <span>{h.upiId}</span>
                                </span>
                              )}
                            </div>
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
                          {(() => {
                            const ownerPhone = h.owner?.phone || (h.contactNumber && h.contactNumber !== 'N/A' && h.contactNumber.trim() !== '' ? h.contactNumber : '');
                            return ownerPhone ? (
                              <a 
                                href={`tel:${ownerPhone}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                                title="Click to call owner"
                              >
                                <Phone size={10} className="text-emerald-600" />
                                <span>{ownerPhone}</span>
                              </a>
                            ) : (
                              <div className="text-[10px] font-medium text-gray-400 italic">No owner phone</div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* Sales Rep / Account Manager */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 min-w-[150px]">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                            <Briefcase size={12} className="text-purple-600 shrink-0" />
                            <span className="truncate max-w-[130px]">
                              {h.assignedSalesAgent?.name || h.onboardedBy?.name || 'Direct (No Rep)'}
                            </span>
                            {h.assignedSalesAgent && (
                              <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1 rounded shrink-0">
                                Assigned
                              </span>
                            )}
                          </div>
                          <select
                            value={h.assignedSalesAgent?._id || (typeof h.assignedSalesAgent === 'string' ? h.assignedSalesAgent : '')}
                            onChange={(e) => handleAssignSalesAgent(h._id, e.target.value)}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold text-gray-700 outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-2xs"
                            title="Assign Sales Executive"
                          >
                            <option value="">— Direct / None —</option>
                            {users.filter(u => u.role === 'sales').map(sa => (
                              <option key={sa._id} value={sa._id}>
                                {sa.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      {/* Plan & Pricing */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider w-max border ${
                            h.plan === 'demo' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            h.plan === 'yearly' || h.plan === 'annual' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {h.plan === 'demo' ? '7-Day Free Trial' : h.plan === 'yearly' || h.plan === 'annual' ? 'Annual Plan (₹800/mo)' : 'Monthly Plan'}
                          </span>
                          <span className="text-[11px] font-bold text-gray-600">
                            ₹{(h.planPrice !== undefined ? h.planPrice : (h.plan === 'demo' ? 0 : (h.plan === 'yearly' || h.plan === 'annual' ? 9600 : 1000))).toLocaleString()} · Max {h.maxRooms || 20} Rooms
                          </span>
                          {h.discountAmount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">-₹{h.discountAmount} discount</span>
                          )}
                          {h.extraCharges > 0 && (
                            <span className="text-[10px] font-bold text-blue-600">+₹{h.extraCharges} add-ons</span>
                          )}
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
                          <button
                            onClick={() => handleToggleLaundry(h._id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${
                              h.laundryEnabled
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                            title="Toggle Laundry Management module"
                          >
                            <Shirt size={11} className={h.laundryEnabled ? 'text-indigo-600' : 'text-gray-400'} />
                            {h.laundryEnabled ? 'Laundry On' : 'Laundry Off'}
                          </button>
                          <button
                            onClick={() => handleToggleDailyRegister(h._id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${
                              h.dailyRegisterEnabled
                                ? 'bg-amber-50 text-amber-800 border border-amber-300'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                            title="Toggle Daily Register (रोकड़ बही) module"
                          >
                            <BookOpen size={11} className={h.dailyRegisterEnabled ? 'text-amber-600' : 'text-gray-400'} />
                            {h.dailyRegisterEnabled ? 'Register On' : 'Register Off'}
                          </button>
                          <button
                            onClick={() => handleToggleDigitalAadhaar(h._id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 ${
                              h.digitalAadhaarEnabled
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}
                            title="Toggle UIDAI Secure QR Cryptographic Verification Audit"
                          >
                            <ShieldCheck size={11} className={h.digitalAadhaarEnabled ? 'text-emerald-600 fill-emerald-500' : 'text-gray-400'} />
                            {h.digitalAadhaarEnabled ? 'UIDAI QR On' : 'UIDAI QR Off'}
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
            <table className="w-full min-w-[650px] text-left text-sm whitespace-nowrap">
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
                {filteredAllUsers.map(u => {
                  const userHostel = hostels.find(h => h._id === (u.assignedHostel?._id || u.assignedHostel));
                  const ownerHostel = hostels.find(h => (h.owner?._id || h.owner) === u._id && h.contactNumber && h.contactNumber !== 'N/A' && h.contactNumber.trim() !== '');
                  const fallbackContact = u.assignedHostel?.contactNumber || userHostel?.contactNumber || ownerHostel?.contactNumber || '';
                  const userPhone = u.phone || (fallbackContact && fallbackContact !== 'N/A' ? fallbackContact : '') || '';

                  return (
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
                        {userPhone ? (
                          <div className="flex items-center gap-1.5">
                            <a 
                              href={`tel:${userPhone}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition-colors"
                              title="Click to call"
                            >
                              <Phone size={12} className="text-emerald-600" />
                              <span>{userPhone}</span>
                            </a>
                            <button
                              onClick={() => openEditUserModal(u, userPhone)}
                              className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors"
                              title="Edit User / Phone"
                            >
                              <Pencil size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-medium italic">No phone added</span>
                            <button
                              onClick={() => openEditUserModal(u)}
                              className="px-2 py-0.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              + Add
                            </button>
                          </div>
                        )}
                      </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                        u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'sales' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role === 'admin' ? 'Hotel Owner (Admin)' : u.role === 'sales' ? 'Field Sales' : u.role === 'receptionist' ? 'Front Desk Staff' : u.role}
                      </span>
                      {u.role === 'admin' && (
                        <p className="text-[11px] font-bold text-purple-700 mt-1 flex items-center gap-1">
                          <Crown size={11} /> Owns {u.ownedHostelsCount || hostels.filter(h => (h.owner?._id || h.owner) === u._id).length} Properties
                        </p>
                      )}
                      {u.role === 'sales' && (
                        <p className="text-[11px] font-bold text-indigo-700 mt-1 flex items-center gap-1">
                          <Briefcase size={11} /> {hostels.filter(h => (h.onboardedBy?._id || h.onboardedBy) === u._id).length} Properties Onboarded
                        </p>
                      )}
                      {u.role === 'receptionist' && u.assignedHostel && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] font-bold text-gray-900 flex items-center gap-1">
                            <Building size={11} className="text-blue-600" /> {u.assignedHostel.name}
                          </p>
                          {(() => {
                            const hotelObj = hostels.find(h => h._id === (u.assignedHostel?._id || u.assignedHostel));
                            return hotelObj?.owner?.name ? (
                              <p className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                                <Crown size={10} className="text-amber-500" /> Owner: {hotelObj.owner.name}
                              </p>
                            ) : null;
                          })()}
                        </div>
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
                );
              })}

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
      </main>

      {/* ============================================================== */}
      {/* 👤 MODAL 1: CREATE USER (OWNER / SALES / STAFF) */}
      {/* ============================================================== */}
      {isCreateOwnerOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200" onClick={() => setIsCreateOwnerOpen(false)}>
          <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 text-center sm:text-left">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-gray-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200 text-left" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    newOwnerForm.role === 'sales' 
                      ? 'text-indigo-400 bg-indigo-500/20' 
                      : newOwnerForm.role === 'receptionist'
                      ? 'text-blue-400 bg-blue-500/20'
                      : 'text-purple-400 bg-purple-500/20'
                  }`}>
                    {newOwnerForm.role === 'sales' ? 'Field Sales Team' : newOwnerForm.role === 'receptionist' ? 'Front Desk Staff' : 'Client Onboarding'}
                  </span>
                  <h3 className="text-xl font-black text-white mt-1.5">
                    {newOwnerForm.role === 'sales' ? 'Add Sales Executive' : newOwnerForm.role === 'receptionist' ? 'Add Front Desk Staff' : 'Create Hotel Owner (Admin)'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {newOwnerForm.role === 'sales' 
                      ? 'Grants access to /sales portal with hotel onboarding & demo mode.' 
                      : newOwnerForm.role === 'receptionist'
                      ? 'Grants front desk check-in and room operation access.'
                      : 'Master login for the hotel owner to manage their properties.'}
                  </p>
                </div>
                <button onClick={() => setIsCreateOwnerOpen(false)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOwner} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      User Role / Permission Level
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewOwnerForm({ ...newOwnerForm, role: 'admin' })}
                        className={`p-2.5 text-xs font-black rounded-xl border text-center transition-all ${
                          newOwnerForm.role === 'admin'
                            ? 'bg-purple-50 border-purple-300 text-purple-900 ring-2 ring-purple-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        👑 Hotel Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOwnerForm({ ...newOwnerForm, role: 'sales' })}
                        className={`p-2.5 text-xs font-black rounded-xl border text-center transition-all ${
                          newOwnerForm.role === 'sales'
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-2 ring-indigo-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        💼 Sales Exec
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewOwnerForm({ ...newOwnerForm, role: 'receptionist' })}
                        className={`p-2.5 text-xs font-black rounded-xl border text-center transition-all ${
                          newOwnerForm.role === 'receptionist'
                            ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-600'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        🛎️ Front Desk
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={newOwnerForm.role === 'sales' ? 'e.g. Amit Kumar (Sales)' : 'e.g. Rajesh Sharma'}
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
                      placeholder="e.g. sales@domain.com"
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

                  {newOwnerForm.role === 'receptionist' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Assigned Property <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                        value={newOwnerForm.assignedHostel || ''}
                        onChange={e => setNewOwnerForm({ ...newOwnerForm, assignedHostel: e.target.value || null })}
                      >
                        <option value="">Select Property...</option>
                        {hostels.map(h => (
                          <option key={h._id} value={h._id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {newOwnerForm.role === 'sales' && (
                    <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
                      <Briefcase size={16} className="text-indigo-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>Field Sales Privilege:</strong> This account will only access <code>/sales</code>. They can onboard clients, run 1-click live demos, and resolve front desk issues. <em>Total platform revenue is strictly hidden from them.</em>
                      </p>
                    </div>
                  )}

                  {newOwnerForm.role === 'admin' && (
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 flex items-start gap-2.5 text-xs text-purple-900">
                      <Briefcase size={16} className="text-purple-600 shrink-0 mt-0.5" />
                      <p>
                        <strong>Role: Admin (Hotel Owner)</strong>. Once created, you can attach their first property or multiple properties immediately.
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 flex gap-3 justify-end shrink-0">
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
                    {creatingOwner 
                      ? 'Creating...' 
                      : newOwnerForm.role === 'sales'
                      ? 'Create Sales Executive'
                      : newOwnerForm.role === 'receptionist'
                      ? 'Create Front Desk Staff'
                      : 'Create Hotel Owner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 🏨 MODAL 2: REGISTER NEW PROPERTY & ASSIGN TO OWNER */}
      {/* ============================================================== */}
      {isAddPropertyOpen && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200" onClick={() => setIsAddPropertyOpen(false)}>
          <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 text-center sm:text-left">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl sm:max-w-2xl w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-gray-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200 text-left" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
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

              <form onSubmit={handleCreateProperty} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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

              {/* Assigned Sales Representative (Optional) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assigned Sales Representative (Optional)</span>
                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">CRM Manager</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={newPropertyForm.assignedSalesAgent || ''}
                  onChange={e => setNewPropertyForm({ ...newPropertyForm, assignedSalesAgent: e.target.value })}
                >
                  <option value="">— Direct / None (Managed by Super Admin) —</option>
                  {users.filter(u => u.role === 'sales').map(sa => (
                    <option key={sa._id} value={sa._id}>
                      {sa.name} ({sa.email})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  If assigned, this hotel will appear in this sales rep's portal and they can manage demos, staff, and plans for it.
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

              {/* ⚡ Dynamic UPI Payment QR Setup */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <QrCode size={13} className="text-purple-600" /> Dynamic UPI Payment QR
                  </span>
                  <span className="text-[10px] font-bold bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full">
                    Exact Amount Lock
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                      Hotel UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. hotelroyal@icici"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600"
                      value={newPropertyForm.upiId}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, upiId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                      Payee Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Royal Taj"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-purple-600"
                      value={newPropertyForm.upiPayeeName}
                      onChange={e => setNewPropertyForm({ ...newPropertyForm, upiPayeeName: e.target.value })}
                    />
                  </div>
                </div>
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
            </div>

            <div className="p-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 flex gap-3 justify-end shrink-0">
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
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 🎟️ MODAL 3: COMPREHENSIVE SUBSCRIPTION & RENEWAL CENTER */}
      {/* ============================================================== */}
      <SubscriptionPlanModal
        isOpen={Boolean(selectedPlanHostel)}
        onClose={() => setSelectedPlanHostel(null)}
        hotel={selectedPlanHostel}
        onSavePlan={handleSavePlan}
        isSaving={savingPlan}
        currentUserRole="superadmin"
      />

      {/* ✏️ EDIT PROPERTY DETAILS MODAL */}
      {selectedEditHostel && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200" onClick={() => setSelectedEditHostel(null)}>
          <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 text-center sm:text-left">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-gray-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200 text-left" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
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

              <form onSubmit={handleSaveEditProperty} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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

              {/* Assigned Sales Representative */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Assigned Sales Representative</span>
                  <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">CRM Manager</span>
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                  value={editPropertyForm.assignedSalesAgent || ''}
                  onChange={e => setEditPropertyForm({ ...editPropertyForm, assignedSalesAgent: e.target.value })}
                >
                  <option value="">— Direct / None (Managed by Super Admin) —</option>
                  {users.filter(u => u.role === 'sales').map(sa => (
                    <option key={sa._id} value={sa._id}>
                      {sa.name} ({sa.email})
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

              {/* ⚡ Dynamic UPI Payment QR Setup */}
              <div className="p-3.5 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                    <QrCode size={13} className="text-purple-600" /> Dynamic UPI Payment QR
                  </span>
                  <span className="text-[10px] font-bold bg-purple-200/60 text-purple-800 px-2 py-0.5 rounded-full">
                    Exact Amount Lock
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                      Hotel UPI ID (VPA)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. hotelroyal@icici"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-600"
                      value={editPropertyForm.upiId}
                      onChange={e => setEditPropertyForm({ ...editPropertyForm, upiId: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                      Payee Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hotel Royal Taj"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-medium text-xs outline-none focus:ring-2 focus:ring-purple-600"
                      value={editPropertyForm.upiPayeeName}
                      onChange={e => setEditPropertyForm({ ...editPropertyForm, upiPayeeName: e.target.value })}
                    />
                  </div>
                </div>
              </div>

                </div>

                <div className="p-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 flex gap-3 justify-end shrink-0">
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
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* 👤 MODAL 5: EDIT USER & PHONE DETAILS */}
      {/* ============================================================== */}
      {selectedEditUser && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200" onClick={() => setSelectedEditUser(null)}>
          <div className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 text-center sm:text-left">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-gray-100 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200 text-left" onClick={e => e.stopPropagation()}>
              <div className="p-6 bg-gradient-to-r from-gray-950 to-gray-900 text-white flex justify-between items-start shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    User Profile
                  </span>
                  <h3 className="text-xl font-black text-white mt-1.5">Edit User & Phone</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Update mobile number, name, and email.</p>
                </div>
                <button onClick={() => setSelectedEditUser(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditUser} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                      value={editUserForm.name}
                      onChange={e => setEditUserForm({ ...editUserForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                      value={editUserForm.email}
                      onChange={e => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Phone / Mobile Number</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Direct Click-to-Call</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-black"
                        value={editUserForm.phone}
                        onChange={e => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gray-50 border-t border-gray-100 flex gap-3 justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedEditUser(null)}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingUser}
                    className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {savingUser ? 'Saving...' : 'Update Phone & Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 🚀 COMPREHENSIVE CLIENT ONBOARDING & 7-DAY DEMO LAUNCH WIZARD */}
      <OnboardingWizardModal
        isOpen={isOnboardingWizardOpen}
        onClose={() => setIsOnboardingWizardOpen(false)}
        initialData={onboardingInitialData}
        ownersList={hotelOwners}
        salesAgentsList={users.filter(u => u.role === 'sales')}
        currentUserRole="superadmin"
        onSuccess={fetchData}
        onImpersonate={handleImpersonate}
      />
      {/* ─── Mobile Bottom Navigation Bar for Super Admin HQ ─── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex justify-around items-center h-16 px-1">
          <button
            type="button"
            onClick={() => setActiveTab('ecosystem')}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors cursor-pointer ${activeTab === 'ecosystem' ? 'text-slate-950 font-black' : 'text-slate-400'}`}
          >
            <Network size={20} className={activeTab === 'ecosystem' ? 'stroke-[2.5]' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">Ecosystem</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hostels')}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors cursor-pointer ${activeTab === 'hostels' ? 'text-slate-950 font-black' : 'text-slate-400'}`}
          >
            <Building size={20} className={activeTab === 'hostels' ? 'stroke-[2.5]' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">Hotels</span>
          </button>

          {/* Elevated Onboard Action in center */}
          <div className="relative -top-3">
            <button
              type="button"
              onClick={() => {
                setOnboardingInitialData({});
                setIsOnboardingWizardOpen(true);
              }}
              className="flex items-center justify-center w-12 h-12 bg-slate-950 text-white rounded-full shadow-lg hover:bg-slate-800 transition-all active:scale-95 border-2 border-white cursor-pointer"
              title="Onboard Hotel"
            >
              <Sparkles size={20} className="text-amber-300" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`flex flex-col items-center justify-center w-14 h-full transition-colors cursor-pointer ${activeTab === 'subscriptions' ? 'text-slate-950 font-black' : 'text-slate-400'}`}
          >
            <CreditCard size={20} className={activeTab === 'subscriptions' ? 'stroke-[2.5]' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tight">Billing</span>
          </button>

          <button
            type="button"
            onClick={() => logout ? logout() : (localStorage.clear(), window.location.href = '/login')}
            className="flex flex-col items-center justify-center w-14 h-full text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut size={20} className="stroke-[2.5]" />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tight text-rose-600">Logout</span>
          </button>
        </div>
      </nav>

    </div>
  );
};

export default SuperAdminDashboard;
