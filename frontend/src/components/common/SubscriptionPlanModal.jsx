import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  CalendarPlus
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

  // 4 Crystal-Clear Modes:
  // 1. 'renew' -> 🔄 1-Click Renew / Extend (+1 Month, +3 Months, +1 Year)
  // 2. 'assign' -> ⚙️ Assign New Plan Tier (Switch to Monthly / Annual / Custom)
  // 3. 'edit' -> ✏️ Edit Current Plan Details (Manually fix dates, room limit, price)
  // 4. 'history' -> 📜 Subscription Invoices & History
  const [activeTab, setActiveTab] = useState('renew');
  const [copiedKey, setCopiedKey] = useState(null);

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
  const [extendOption, setExtendOption] = useState(30); // 30, 60, 90, 180, 365, or custom number
  const [customDays, setCustomDays] = useState('');
  // Start from: 'previousExpiry' or 'today'
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

  // --- MODE 2: ASSIGN NEW PLAN STATE ---
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

  // --- MODE 3: DIRECT EDIT STATE ---
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
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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

  // SUBMIT HANDLER FOR MODE 3: DIRECT EDIT
  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!onSavePlan) return;

    const payload = {
      ...editForm,
      planPrice: Number(editForm.planPrice) || 0,
      maxRooms: Number(editForm.maxRooms) || 20,
      actionType: 'adjustment',
      finalAmount: Number(editForm.planPrice) || 0
    };

    onSavePlan(payload);
  };

  // Collect history records (newest first)
  const historyList = useMemo(() => {
    if (hotel.subscriptionHistory && hotel.subscriptionHistory.length > 0) {
      return [...hotel.subscriptionHistory].reverse();
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
  }, [hotel]);

  // WhatsApp notification link
  const getWhatsAppRenewalUrl = () => {
    const phone = hotel.owner?.phone ? hotel.owner.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const endDate = renewalDates.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const msg = [
      `🏨 *${hotel.name} - Subscription Renewal Update*`,
      `──────────────────────`,
      `Namaste *${hotel.owner?.name || 'Partner'}* ji,`,
      `Your hotel management software subscription has been renewed successfully:`,
      `📦 *Plan:* ${hotel.plan === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}`,
      `💰 *Billed Amount:* ₹${(Number(renewalAmount) || 0).toLocaleString('en-IN')} (${renewalPaymentMethod})`,
      renewalPaymentRef ? `🧾 *Ref / UTR:* ${renewalPaymentRef}` : '',
      `📅 *New Expiry Date:* ${endDate}`,
      `🏢 *Status:* Active ✓`,
      `──────────────────────`,
      `Thank you for your partnership with NXHotel! ✨`
    ].filter(Boolean).join('\n');

    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] overflow-y-auto animate-in fade-in duration-200 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-xl w-full my-0 sm:my-8 overflow-hidden shadow-2xl border border-slate-200/90 max-h-[92dvh] sm:max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-200 text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* ─── MODAL HEADER ─── */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <ShieldAlert size={12} className="text-amber-400" />
                <span>Subscription & Billing Center</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {hotel._id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1.5 flex items-center gap-2">
              <span>🏨 {hotel.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Owner: <strong className="text-slate-200">{hotel.owner?.name || 'Unassigned'}</strong></span>
              {hotel.owner?.phone && (
                <span className="font-mono text-emerald-400">📞 {hotel.owner.phone}</span>
              )}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── LIVE CURRENT STATUS STRIP ─── */}
        <div className={`p-3.5 px-5 border-b shrink-0 flex items-center justify-between gap-3 flex-wrap ${
          isExpired 
            ? 'bg-rose-50 border-rose-200/80 text-rose-900' 
            : daysRemaining <= 7 
            ? 'bg-amber-50 border-amber-200/80 text-amber-900' 
            : 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isExpired ? 'bg-rose-600 animate-pulse' : daysRemaining <= 7 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isExpired ? 'Subscription Expired' : daysRemaining <= 7 ? 'Expiring Soon' : 'Active Subscription'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-white border border-current">
                  {hotel.plan === 'demo' ? '7-Day Free Trial' : hotel.plan === 'yearly' || hotel.plan === 'annual' ? 'Annual Plan' : 'Monthly Plan'}
                </span>
              </div>
              <p className="text-xs font-medium mt-0.5">
                {isExpired 
                  ? `Expired on ${currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${Math.abs(daysRemaining)} days ago)` 
                  : `Valid until ${currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${daysRemaining} days remaining)`}
              </p>
            </div>
          </div>

          {hotel.owner?.phone && (
            <a
              href={getWhatsAppRenewalUrl()}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
              title="Send status message to Hotel Owner on WhatsApp"
            >
              <MessageSquare size={12} />
              <span>WhatsApp</span>
            </a>
          )}
        </div>

        {/* ─── 4 SIMPLE TABS: RENEW | ASSIGN NEW | EDIT | HISTORY ─── */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 shrink-0 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('renew')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'renew'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Repeat size={13} className="text-emerald-600" />
            <span>1. Renew / Extend (+30d)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assign')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'assign'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Settings2 size={13} className="text-indigo-600" />
            <span>2. Change Plan Tier</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'edit'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Edit3 size={13} className="text-amber-600" />
            <span>3. Edit Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <History size={13} className="text-purple-600" />
            <span>4. Invoices ({historyList.length})</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 1: 🔄 RENEW / EXTEND PLAN (+1 Month, +3 Months, +1 Year)      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'renew' && (
          <form onSubmit={handleRenewSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              
              {/* Quick Duration Chips */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2">
                  1. Choose Extension Duration (अवधि चुनें)
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

              {/* Start Extension From: Previous Expiry vs Today */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                  2. Start Extension From (कहाँ से शुरू करें)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
                  {/* Option A: Continuous from Previous Expiry */}
                  <label 
                    onClick={() => setStartFrom('previousExpiry')}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      startFrom === 'previousExpiry'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="startFrom"
                      checked={startFrom === 'previousExpiry'}
                      onChange={() => setStartFrom('previousExpiry')}
                      className="mt-0.5 text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-black">From Previous Expiry Date</div>
                      <p className="text-[10.5px] font-normal text-slate-500 mt-0.5 leading-snug">
                        {currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (No gap in monthly cycle)
                      </p>
                    </div>
                  </label>

                  {/* Option B: From Today */}
                  <label 
                    onClick={() => setStartFrom('today')}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      startFrom === 'today'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="startFrom"
                      checked={startFrom === 'today'}
                      onChange={() => setStartFrom('today')}
                      className="mt-0.5 text-emerald-600 focus:ring-0"
                    />
                    <div>
                      <div className="font-black">From Today (आज से)</div>
                      <p className="text-[10.5px] font-normal text-slate-500 mt-0.5 leading-snug">
                        {now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (Fresh restart from today)
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* 🌟 New Calculated Validity Live Preview Box */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>New Subscription Validity:</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Active Status ✓
                  </span>
                </div>
                <div className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-emerald-900">{renewalDates.startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="text-emerald-500">➔</span>
                  <span className="font-mono text-emerald-900 font-extrabold">{renewalDates.endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    +{renewalDates.days} Days
                  </span>
                </div>
              </div>

              {/* Payment & Amount Collected */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Amount Collected (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={renewalAmount}
                      onChange={e => setRenewalAmount(e.target.value)}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono font-black text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Payment Mode
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
                    Payment Reference / UTR Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / UTR / Cheque No."
                    value={renewalPaymentRef}
                    onChange={e => setRenewalPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Renewal Notes / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Month 2 renewal received via UPI"
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
                className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition-colors"
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
                    <span>Confirm Renewal (+{renewalDates.days} Days) ✓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 2: ⚙️ CHANGE PLAN TIER (Monthly, Annual, Custom, Demo)         */}
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
                {isSaving ? 'Applying Plan...' : 'Apply New Plan Tier'}
              </button>
            </div>
          </form>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODE 3: ✏️ EDIT CURRENT PLAN DETAILS                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'edit' && (
          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              <p className="text-xs text-slate-500 font-medium">
                Manually adjust dates, status, or capacity without creating a duplicate renewal payment.
              </p>

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
                    Plan Price (₹)
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
                    Max Rooms Limit
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
                  Plan Notes
                </label>
                <textarea
                  rows={2}
                  value={editForm.planNotes}
                  onChange={e => setEditForm({ ...editForm, planNotes: e.target.value })}
                  placeholder="Additional remarks or notes..."
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
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? 'Saving Changes...' : 'Save Plan Edits'}
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
                <span>Historical Subscription Invoices & Renewals</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {historyList.length} Records Logged
              </span>
            </div>

            <div className="space-y-2.5">
              {historyList.map((entry, idx) => {
                const sDate = entry.startDate ? new Date(entry.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                const eDate = entry.endDate ? new Date(entry.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                const cDate = entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

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
                            {entry.actionType || 'Renewal'}
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
                        <span>Processed by <strong className="text-slate-800">{entry.recordedByName || 'Super Admin'}</strong> on {cDate}</span>
                      </div>
                      {entry.notes && (
                        <div className="text-[10px] text-slate-600 italic bg-white px-2 py-0.5 rounded border border-slate-200/80">
                          "{entry.notes}"
                        </div>
                      )}
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
