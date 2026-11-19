import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  CreditCard, 
  History, 
  Repeat, 
  MessageSquare, 
  X, 
  Copy, 
  Check, 
  FileText, 
  Building, 
  User, 
  ArrowRight,
  TrendingUp,
  Receipt,
  Settings2,
  Edit3,
  CalendarPlus,
  Trash2,
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function SubscriptionPlanModal({
  isOpen,
  onClose,
  hotel,
  onSavePlan,
  isSaving = false,
  currentUserRole = 'superadmin'
}) {
  if (!isOpen || !hotel) return null;

  // 4 Standard Enterprise Modes:
  // 1. 'renew' -> 🔄 Next Month Renewal (अगले महीने के लिए रिन्यू करें)
  // 2. 'assign' -> ⚡ Change / Upgrade Plan Tier (प्लान पैकेज बदलें)
  // 3. 'edit' -> ✏️ Fix Mistake / Edit Details (गलती सुधारें - बिना नया बिल बनाए)
  // 4. 'history' -> 📜 Invoices & Ledger (बिलिंग हिस्ट्री व गलत एंट्री हटाएं)
  const [activeTab, setActiveTab] = useState('renew');
  const [copiedKey, setCopiedKey] = useState(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);
  const [localHistory, setLocalHistory] = useState([]);

  const now = new Date();
  const currentStart = hotel.planStartDate ? new Date(hotel.planStartDate) : now;
  const currentEnd = hotel.planEndDate ? new Date(hotel.planEndDate) : now;
  const isExpired = hotel.isExpired !== undefined 
    ? hotel.isExpired 
    : (hotel.planStatus === 'expired' || currentEnd < now);
  const daysRemaining = hotel.daysRemaining !== undefined 
    ? hotel.daysRemaining 
    : Math.ceil((currentEnd - now) / (1000 * 60 * 60 * 24));

  // --- MODE 1: RENEW / EXTEND STATE ---
  const [extendOption, setExtendOption] = useState(30); // 30, 60, 90, 365, or 'custom'
  const [customDays, setCustomDays] = useState('');
  const [startFrom, setStartFrom] = useState(() => {
    // If expired more than 15 days ago, start from today; otherwise extend continuous from current expiry
    if (isExpired && Math.abs(daysRemaining) > 15) return 'today';
    return 'previousExpiry';
  });
  const [renewalAmount, setRenewalAmount] = useState(() => {
    return hotel.planPrice !== undefined ? hotel.planPrice : 1000;
  });
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState('UPI');
  const [renewalPaymentRef, setRenewalPaymentRef] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  // Auto-calculated renewal dates preview
  const renewalDates = useMemo(() => {
    const daysToAdd = extendOption === 'custom' ? (Number(customDays) || 30) : extendOption;
    let baseStartDate;

    if (startFrom === 'previousExpiry' && hotel.planEndDate) {
      baseStartDate = new Date(hotel.planEndDate);
    } else {
      baseStartDate = new Date();
      baseStartDate.setHours(0, 0, 0, 0);
    }

    const calculatedEndDate = new Date(baseStartDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    calculatedEndDate.setHours(23, 59, 59, 999);

    return {
      startDate: baseStartDate,
      endDate: calculatedEndDate,
      startDateStr: baseStartDate.toISOString().split('T')[0],
      endDateStr: calculatedEndDate.toISOString().split('T')[0],
      days: daysToAdd
    };
  }, [extendOption, customDays, startFrom, hotel.planEndDate]);

  // --- MODE 2: ASSIGN / CHANGE PLAN STATE ---
  const [newPlanTier, setNewPlanTier] = useState(hotel.plan === 'demo' ? 'monthly' : (hotel.plan || 'monthly'));
  const [assignDurationDays, setAssignDurationDays] = useState(30);
  const [assignStartDate, setAssignStartDate] = useState(now.toISOString().split('T')[0]);
  const [assignPrice, setAssignPrice] = useState(1000);
  const [assignDiscount, setAssignDiscount] = useState(0);
  const [assignPaymentMethod, setAssignPaymentMethod] = useState('UPI');
  const [assignPaymentRef, setAssignPaymentRef] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Auto-calculated assign end date
  const assignEndDate = useMemo(() => {
    const s = new Date(assignStartDate + 'T00:00:00');
    const e = new Date(s.getTime() + assignDurationDays * 24 * 60 * 60 * 1000);
    return e.toISOString().split('T')[0];
  }, [assignStartDate, assignDurationDays]);

  // --- MODE 3: DIRECT EDIT (FIX MISTAKE) STATE ---
  const [editForm, setEditForm] = useState({
    plan: hotel.plan || 'monthly',
    planStatus: hotel.planStatus || 'active',
    planStartDate: hotel.planStartDate ? new Date(hotel.planStartDate).toISOString().split('T')[0] : now.toISOString().split('T')[0],
    planEndDate: hotel.planEndDate ? new Date(hotel.planEndDate).toISOString().split('T')[0] : now.toISOString().split('T')[0],
    planPrice: hotel.planPrice || 0,
    maxRooms: hotel.maxRooms || 20,
    billingCycle: hotel.billingCycle || 'monthly',
    planNotes: hotel.planNotes || ''
  });

  // Re-sync whenever hotel prop changes
  useEffect(() => {
    if (hotel) {
      setRenewalAmount(hotel.planPrice !== undefined ? hotel.planPrice : 1000);
      setNewPlanTier(hotel.plan === 'demo' ? 'monthly' : (hotel.plan || 'monthly'));
      setAssignPrice(hotel.plan === 'yearly' || hotel.plan === 'annual' ? 9600 : (hotel.plan === 'demo' ? 1000 : (hotel.planPrice || 1000)));
      setEditForm({
        plan: hotel.plan || 'monthly',
        planStatus: hotel.planStatus || 'active',
        planStartDate: hotel.planStartDate ? new Date(hotel.planStartDate).toISOString().split('T')[0] : now.toISOString().split('T')[0],
        planEndDate: hotel.planEndDate ? new Date(hotel.planEndDate).toISOString().split('T')[0] : now.toISOString().split('T')[0],
        planPrice: hotel.planPrice || 0,
        maxRooms: hotel.maxRooms || 20,
        billingCycle: hotel.billingCycle || 'monthly',
        planNotes: hotel.planNotes || ''
      });
      setLocalHistory(Array.isArray(hotel.subscriptionHistory) ? [...hotel.subscriptionHistory] : []);
      setActiveTab('renew');
    }
  }, [hotel?._id]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper presets for Edit Mode
  const applyEditPreset = (type) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startStr = today.toISOString().split('T')[0];

    if (type === '30days') {
      const end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      setEditForm(prev => ({
        ...prev,
        plan: 'monthly',
        planStatus: 'active',
        planStartDate: startStr,
        planEndDate: end.toISOString().split('T')[0],
        planPrice: 1000,
        planNotes: 'Reset to standard 30-day active monthly plan'
      }));
    } else if (type === '7days_demo') {
      const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      setEditForm(prev => ({
        ...prev,
        plan: 'demo',
        planStatus: 'trial',
        planStartDate: startStr,
        planEndDate: end.toISOString().split('T')[0],
        planPrice: 0,
        planNotes: 'Reset to 7-day free trial demo'
      }));
    } else if (type === '365days') {
      const end = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000);
      setEditForm(prev => ({
        ...prev,
        plan: 'yearly',
        planStatus: 'active',
        planStartDate: startStr,
        planEndDate: end.toISOString().split('T')[0],
        planPrice: 9600,
        planNotes: 'Reset to 1-year annual plan'
      }));
    }
  };

  // SUBMIT HANDLER FOR MODE 1: RENEW / EXTEND
  const handleRenewSubmit = (e) => {
    e.preventDefault();
    if (!onSavePlan) return;

    const payload = {
      plan: hotel.plan === 'demo' ? 'monthly' : (hotel.plan || 'monthly'),
      planStatus: 'active', // 🚀 Always set to active upon renewal!
      planStartDate: renewalDates.startDateStr,
      planEndDate: renewalDates.endDateStr,
      planPrice: Number(renewalAmount) || 0,
      finalAmount: Number(renewalAmount) || 0,
      billingCycle: renewalDates.days >= 365 ? 'yearly' : 'monthly',
      paymentMethod: renewalPaymentMethod,
      paymentReference: renewalPaymentRef || '',
      actionType: 'renewal',
      planNotes: renewalNotes || `Plan Renewal (+${renewalDates.days} Days)`
    };

    onSavePlan(payload);
  };

  // SUBMIT HANDLER FOR MODE 2: ASSIGN NEW PLAN TIER
  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!onSavePlan) return;

    const finalAmt = Math.max(0, (Number(assignPrice) || 0) - (Number(assignDiscount) || 0));

    const payload = {
      plan: newPlanTier,
      planStatus: newPlanTier === 'demo' ? 'trial' : 'active',
      planStartDate: assignStartDate,
      planEndDate: assignEndDate,
      planPrice: Number(assignPrice) || 0,
      discountAmount: Number(assignDiscount) || 0,
      finalAmount: finalAmt,
      billingCycle: assignDurationDays >= 365 ? 'yearly' : 'monthly',
      paymentMethod: newPlanTier === 'demo' ? 'Free Trial' : assignPaymentMethod,
      paymentReference: assignPaymentRef || '',
      actionType: newPlanTier === 'demo' ? 'initial' : (hotel.plan === 'demo' ? 'upgrade' : 'renewal'),
      planNotes: assignNotes || `New ${newPlanTier.toUpperCase()} Plan assigned`
    };

    onSavePlan(payload);
  };

  // SUBMIT HANDLER FOR MODE 3: DIRECT EDIT (FIX MISTAKE WITHOUT EXTRA PAYMENT)
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!onSavePlan) return;

    const payload = {
      ...editForm,
      planPrice: Number(editForm.planPrice) || 0,
      maxRooms: Number(editForm.maxRooms) || 20,
      actionType: 'adjustment',
      finalAmount: 0 // 🛡️ Direct correction does NOT add phantom revenue
    };

    onSavePlan(payload);
  };

  // DELETE / VOID MISTAKEN TRANSACTION IN HISTORY
  const handleDeleteHistory = async (historyId) => {
    if (!historyId) return;
    if (!window.confirm('⚠️ Are you sure you want to delete / void this mistaken transaction record?\n\nThis will remove it from history and recalculate total revenue.')) {
      return;
    }

    try {
      setDeletingHistoryId(historyId);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const endpoint = currentUserRole === 'sales'
        ? `${API}/api/sales/properties/${hotel._id}/subscription-history/${historyId}`
        : `${API}/api/superadmin/hostels/${hotel._id}/subscription-history/${historyId}`;

      await axios.delete(endpoint);
      setLocalHistory(prev => prev.filter(item => item._id && item._id.toString() !== historyId.toString()));
      alert('✅ Transaction record deleted / voided successfully. Revenue has been recalculated.');
      if (onSavePlan) {
        onSavePlan({ _action: 'refresh_only' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete transaction record');
    } finally {
      setDeletingHistoryId(null);
    }
  };

  // Collect history records (newest first)
  const historyList = useMemo(() => {
    if (localHistory && localHistory.length > 0) {
      return [...localHistory].reverse();
    }
    return [
      {
        _id: 'init-1',
        plan: hotel.plan || 'demo',
        billingCycle: hotel.billingCycle || 'trial',
        finalAmount: hotel.planPrice || 0,
        paymentMethod: hotel.plan === 'demo' ? 'Free Trial' : 'Initial Provision',
        paymentReference: 'Onboarding System',
        startDate: hotel.planStartDate || hotel.createdAt,
        endDate: hotel.planEndDate,
        durationDays: 30,
        actionType: 'initial',
        notes: hotel.planNotes || 'Initial hotel creation',
        recordedByName: hotel.onboardedBy?.name || 'Super Admin',
        createdAt: hotel.createdAt || now
      }
    ];
  }, [localHistory, hotel]);

  const totalCollectedFromHotel = useMemo(() => {
    return historyList.reduce((sum, item) => sum + (Number(item.finalAmount) || 0), 0);
  }, [historyList]);

  // WhatsApp notification link
  const getWhatsAppRenewalUrl = () => {
    const phone = hotel.owner?.phone ? hotel.owner.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const endDate = renewalDates.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const msg = [
      `🏨 *${hotel.name} - Subscription Renewal Update*`,
      `──────────────────────`,
      `Namaste *${hotel.owner?.name || 'Partner'}* ji,`,
      `Your hotel management software subscription has been updated successfully:`,
      `📦 *Plan:* ${hotel.plan === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}`,
      `💰 *Amount:* ₹${(Number(renewalAmount) || 0).toLocaleString('en-IN')} (${renewalPaymentMethod})`,
      renewalPaymentRef ? `🧾 *Ref / UTR:* ${renewalPaymentRef}` : '',
      `📅 *Valid Until:* ${endDate}`,
      `🏢 *Status:* Active ✓`,
      `──────────────────────`,
      `Thank you for using NXHotel! ✨`
    ].filter(Boolean).join('\n');

    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-slate-200/90 max-h-[94dvh] sm:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── MODAL HEADER ─── */}
        <div className="p-5 sm:p-6 bg-slate-950 text-white flex justify-between items-start shrink-0 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                <ShieldAlert size={12} className="text-amber-400" />
                <span>Subscription Management</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {hotel._id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
              <span>🏨 {hotel.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Owner: <strong className="text-slate-200">{hotel.owner?.name || 'Unassigned'}</strong></span>
              {hotel.owner?.phone && (
                <span className="font-mono text-emerald-400 font-bold">📞 {hotel.owner.phone}</span>
              )}
              {hotel.city && (
                <span className="text-slate-400">📍 {hotel.city}</span>
              )}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── HERO CURRENT SUBSCRIPTION STATUS CARD ─── */}
        <div className={`p-4 px-5 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isExpired 
            ? 'bg-rose-50/90 border-rose-200 text-rose-950' 
            : daysRemaining <= 7 
            ? 'bg-amber-50/90 border-amber-200 text-amber-950' 
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2.5 h-2.5 rounded-full ${isExpired ? 'bg-rose-600 animate-pulse' : daysRemaining <= 7 ? 'bg-amber-500' : 'bg-emerald-600'}`} />
              <span className="text-xs font-black uppercase tracking-wider">
                {isExpired ? 'Subscription Expired / Overdue' : daysRemaining <= 7 ? 'Expiring Soon' : 'Subscription Active'}
              </span>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white border border-current shadow-2xs">
                {hotel.plan === 'demo' ? '7-Day Free Trial' : hotel.plan === 'yearly' || hotel.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
              </span>
              <span className="text-xs font-mono font-black">
                ₹{(hotel.planPrice || 0).toLocaleString()} / {hotel.billingCycle || 'mo'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs font-medium mt-1.5 flex-wrap">
              <span>
                📅 Period: <strong className="font-mono font-bold">{currentStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong> ➔ <strong className="font-mono font-bold">{currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              </span>
              <span className={`font-bold ${isExpired ? 'text-rose-700' : daysRemaining <= 7 ? 'text-amber-700' : 'text-emerald-700'}`}>
                ({isExpired ? `Expired ${Math.abs(daysRemaining)}d ago` : `${daysRemaining} days remaining`})
              </span>
              <span>🚪 Capacity: <strong className="font-bold">{hotel.maxRooms || 20} Rooms</strong></span>
            </div>
          </div>

          {hotel.owner?.phone && (
            <a
              href={getWhatsAppRenewalUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all self-start sm:self-auto shrink-0"
              title="Send WhatsApp notice to Hotel Owner"
            >
              <MessageSquare size={13} />
              <span>WhatsApp Notice</span>
            </a>
          )}
        </div>

        {/* ─── 4 CRYSTAL-CLEAR OPERATION MODES (SEGMENTED TABS) ─── */}
        <div className="p-3 bg-slate-100/80 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'renew',
                title: '1. Renew Plan',
                sub: 'रिन्यू करें (+30d)',
                icon: Repeat,
                activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              },
              {
                id: 'assign',
                title: '2. Change Tier',
                sub: 'प्लान बदलें / अपग्रेड',
                icon: Settings2,
                activeColor: 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              },
              {
                id: 'edit',
                title: '3. Fix Mistake',
                sub: 'गलती सुधारें (No Bill)',
                icon: Edit3,
                activeColor: 'bg-amber-600 text-white border-amber-600 shadow-sm'
              },
              {
                id: 'history',
                title: '4. Invoices',
                sub: `हिस्ट्री (${historyList.length})`,
                icon: History,
                activeColor: 'bg-slate-900 text-white border-slate-900 shadow-sm'
              }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? tab.activeColor
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                    <span className="text-xs font-black tracking-tight">{tab.title}</span>
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-white/90' : 'text-slate-500'}`}>
                    {tab.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 1: 🔄 RENEW PLAN (+1 Month, +3 Months, +1 Year)              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'renew' && (
          <form onSubmit={handleRenewSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              
              {/* Visual Extension Timeline Box */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">Current Expiry</span>
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {hotel.planEndDate ? new Date(hotel.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Today'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                  <ArrowRight size={16} />
                  <span>+{renewalDates.days} Days Extension</span>
                  <ArrowRight size={16} />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">New Expiry After Renewal</span>
                  <span className="text-sm font-mono font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                    {renewalDates.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Quick Duration Chips */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                  1. Select Extension Period (अवधि चुनें)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { days: 30, label: '+1 Month', sub: '30 Days', price: 1000 },
                    { days: 60, label: '+2 Months', sub: '60 Days', price: 2000 },
                    { days: 90, label: '+3 Months', sub: 'Quarterly', price: 2700 },
                    { days: 365, label: '+1 Year', sub: '365 Days', price: 9600 }
                  ].map(item => (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => {
                        setExtendOption(item.days);
                        setRenewalAmount(item.price);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        extendOption === item.days
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs font-black'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <div className="text-xs font-black">{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${extendOption === item.days ? 'text-slate-300' : 'text-slate-500'}`}>
                        ₹{item.price.toLocaleString('en-IN')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Extension From Option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-700">Calculate Extension From:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStartFrom('previousExpiry')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      startFrom === 'previousExpiry'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Previous Expiry Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartFrom('today')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      startFrom === 'today'
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    Today ({now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                  </button>
                </div>
              </div>

              {/* Amount & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Renewal Amount Billed (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={renewalAmount}
                      onChange={e => setRenewalAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={renewalPaymentMethod}
                    onChange={e => setRenewalPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  >
                    <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="Cash">Cash (कैश)</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Reference Number / UTR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12-digit UPI Ref / UTR / Cheque No."
                    value={renewalPaymentRef}
                    onChange={e => setRenewalPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Renewal Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Next month renewal received"
                    value={renewalNotes}
                    onChange={e => setRenewalNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Modal Bottom Action */}
            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? (
                  <span>Saving Renewal...</span>
                ) : (
                  <>
                    <Check size={14} className="stroke-[3]" />
                    <span>Confirm Renewal (+{renewalDates.days} Days) & Record ₹{Number(renewalAmount || 0).toLocaleString()} ✓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 2: ⚡ CHANGE PLAN TIER (Monthly, Annual, Custom, Demo)         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'assign' && (
          <form onSubmit={handleAssignSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Select New Plan Package Tier
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'monthly', title: 'Monthly Plan', sub: '₹1,000 / month', price: 1000, days: 30 },
                    { id: 'yearly', title: 'Annual Plan', sub: '₹800/mo (₹9,600/yr)', price: 9600, days: 365 },
                    { id: 'demo', title: '7-Day Free Trial', sub: 'Demo Access (₹0)', price: 0, days: 7 }
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setNewPlanTier(tier.id);
                        setAssignPrice(tier.price);
                        setAssignDurationDays(tier.days);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        newPlanTier === tier.id
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-2xs font-bold'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-black">{tier.title}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">{tier.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={assignStartDate}
                    onChange={e => setAssignStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assignDurationDays}
                    onChange={e => setAssignDurationDays(Number(e.target.value) || 30)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              {/* Calculated Expiry Preview */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                <span className="font-bold text-slate-600">Calculated Expiry Date:</span>
                <span className="font-mono font-black text-slate-900">
                  {new Date(assignEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Pricing & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tariff Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assignPrice}
                    onChange={e => setAssignPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Discount Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={assignDiscount}
                    onChange={e => setAssignDiscount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              {/* Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    value={assignPaymentMethod}
                    onChange={e => setAssignPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    UTR / Payment Reference
                  </label>
                  <input
                    type="text"
                    placeholder="Reference number"
                    value={assignPaymentRef}
                    onChange={e => setAssignPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Applying Plan...' : 'Apply New Plan Tier ✓'}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 3: ✏️ FIX MISTAKE / EDIT DETAILS (NO EXTRA PAYMENT)            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'edit' && (
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              
              {/* Informative Alert Banner */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-black text-amber-950">Fix Configuration / Mistake Mode (गलती सुधारें):</strong>
                  <span>Use this if you made an error while assigning the plan (e.g. wrong expiry date, wrong room count, or typo). Saving here updates active hotel properties directly <strong>without generating a duplicate invoice or adding fake revenue</strong>.</span>
                </div>
              </div>

              {/* ⚡ Quick Reset Helper Chips */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Quick Preset Fixes (एक क्लिक में रीसेट करें)
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyEditPreset('30days')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                  >
                    ⚡ Set Active +30 Days from Today
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEditPreset('7days_demo')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                  >
                    ⚡ Set 7-Day Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => applyEditPreset('365days')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all border border-slate-300 cursor-pointer"
                  >
                    ⚡ Set 1-Year Active
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Status
                  </label>
                  <select
                    value={editForm.planStatus}
                    onChange={e => setEditForm({ ...editForm, planStatus: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  >
                    <option value="active">Active (चालू)</option>
                    <option value="trial">Trial / Demo</option>
                    <option value="expired">Expired (समाप्त)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Package
                  </label>
                  <select
                    value={editForm.plan}
                    onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  >
                    <option value="monthly">Monthly Plan</option>
                    <option value="yearly">Annual Plan</option>
                    <option value="demo">7-Day Free Trial</option>
                    <option value="custom">Custom Commercial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.planStartDate}
                    onChange={e => setEditForm({ ...editForm, planStartDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.planEndDate}
                    onChange={e => setEditForm({ ...editForm, planEndDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Tariff Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.planPrice}
                    onChange={e => setEditForm({ ...editForm, planPrice: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Max Room Capacity (कमरे)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.maxRooms}
                    onChange={e => setEditForm({ ...editForm, maxRooms: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Correction / Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.planNotes}
                  onChange={e => setEditForm({ ...editForm, planNotes: e.target.value })}
                  placeholder="e.g. Corrected wrong expiry date entered during setup..."
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                />
              </div>
            </div>

            <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Saving Corrections...' : 'Save Corrections / गलती ठीक करें ✓'}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 4: 📜 SUBSCRIPTION INVOICES & RENEWAL HISTORY                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-slate-900" />
                <span>Historical Subscription Invoices & Ledger</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Total Collected: ₹{totalCollectedFromHotel.toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {historyList.length} Records
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {historyList.map((entry, idx) => {
                const sDate = entry.startDate ? new Date(entry.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                const eDate = entry.endDate ? new Date(entry.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                const cDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                const isRealMongoId = entry._id && !entry._id.toString().startsWith('init-') && !entry._id.toString().startsWith('legacy-');

                return (
                  <div key={entry._id || idx} className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl hover:border-slate-300 transition-all space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            entry.plan === 'demo'
                              ? 'bg-amber-100 text-amber-800'
                              : entry.plan === 'yearly' || entry.plan === 'annual'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {entry.plan === 'demo' ? '7-Day Free Trial' : entry.plan === 'yearly' || entry.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                            {entry.actionType === 'adjustment' ? 'Configuration Fix' : entry.actionType || 'Renewal'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 mt-1">
                          📅 {sDate} ➔ {eDate} <span className="text-slate-400 font-normal">({entry.durationDays || 30} days)</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-700 font-mono">
                          ₹{(entry.finalAmount !== undefined ? entry.finalAmount : (entry.planPrice || 0)).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1">
                          <CreditCard size={11} />
                          <span>{entry.paymentMethod || 'UPI'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 gap-2 flex-wrap">
                      <div>
                        {entry.paymentReference && (
                          <span className="font-mono text-slate-700 font-medium">Ref: {entry.paymentReference} • </span>
                        )}
                        <span>Recorded by <strong className="text-slate-800">{entry.recordedByName || 'Staff'}</strong> on {cDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.notes && (
                          <span className="text-[10px] text-slate-600 italic bg-white px-2 py-0.5 rounded border border-slate-200/80">
                            "{entry.notes}"
                          </span>
                        )}

                        {isRealMongoId && (
                          <button
                            type="button"
                            disabled={deletingHistoryId === entry._id}
                            onClick={() => handleDeleteHistory(entry._id)}
                            className="p-1 text-rose-500 hover:text-white hover:bg-rose-600 rounded-md transition-colors cursor-pointer border border-rose-200"
                            title="Void / Delete mistaken entry from ledger"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
