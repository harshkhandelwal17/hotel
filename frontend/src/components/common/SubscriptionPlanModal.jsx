import React, { useState, useEffect } from 'react';
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
  Receipt
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

  const [activeTab, setActiveTab] = useState('renew'); // 'renew' | 'history'
  const [copiedKey, setCopiedKey] = useState(null);

  // Expiry & duration calculation
  const now = new Date();
  const currentStart = hotel.planStartDate ? new Date(hotel.planStartDate) : now;
  const currentEnd = hotel.planEndDate ? new Date(hotel.planEndDate) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const isExpired = hotel.isExpired !== undefined 
    ? hotel.isExpired 
    : (hotel.planStatus === 'expired' || currentEnd < now);
  const daysRemaining = hotel.daysRemaining !== undefined 
    ? hotel.daysRemaining 
    : Math.ceil((currentEnd - now) / (1000 * 60 * 60 * 24));

  // Form State
  const [planForm, setPlanForm] = useState({
    plan: hotel.plan || 'monthly',
    planStatus: isExpired ? 'active' : (hotel.planStatus || 'active'),
    planStartDate: hotel.planStartDate ? new Date(hotel.planStartDate).toISOString().split('T')[0] : now.toISOString().split('T')[0],
    planEndDate: hotel.planEndDate ? new Date(hotel.planEndDate).toISOString().split('T')[0] : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    basePrice: hotel.plan === 'yearly' || hotel.plan === 'annual' ? 9600 : (hotel.plan === 'demo' ? 0 : 1000),
    planPrice: hotel.planPrice !== undefined ? hotel.planPrice : 1000,
    discountAmount: hotel.discountAmount || 0,
    extraCharges: hotel.extraCharges || 0,
    billingCycle: hotel.billingCycle || 'monthly',
    maxRooms: hotel.maxRooms || 20,
    planNotes: '',
    paymentMethod: 'UPI',
    paymentReference: '',
    actionType: 'renewal',
    extendFromCurrentExpiry: !isExpired // if active, default to extending continuous from current expiry!
  });

  // Re-sync form whenever hotel changes
  useEffect(() => {
    if (hotel) {
      const startIso = hotel.planStartDate ? new Date(hotel.planStartDate).toISOString().split('T')[0] : now.toISOString().split('T')[0];
      const endIso = hotel.planEndDate ? new Date(hotel.planEndDate).toISOString().split('T')[0] : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const base = hotel.plan === 'yearly' || hotel.plan === 'annual' ? 9600 : (hotel.plan === 'demo' ? 0 : 1000);
      
      setPlanForm({
        plan: hotel.plan || 'monthly',
        planStatus: isExpired ? 'active' : (hotel.planStatus || 'active'),
        planStartDate: startIso,
        planEndDate: endIso,
        basePrice: base,
        planPrice: hotel.planPrice !== undefined ? hotel.planPrice : base,
        discountAmount: hotel.discountAmount || 0,
        extraCharges: hotel.extraCharges || 0,
        billingCycle: hotel.billingCycle || 'monthly',
        maxRooms: hotel.maxRooms || 20,
        planNotes: '',
        paymentMethod: 'UPI',
        paymentReference: '',
        actionType: 'renewal',
        extendFromCurrentExpiry: !isExpired
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

  // Preset Selection Helper
  const applyPreset = (targetPlan, durationDays, baseRate, cycle, actionName = 'renewal') => {
    // Determine start date: if extendFromCurrentExpiry AND current plan is active and in future, extend from currentEnd
    let startD = new Date();
    if (planForm.extendFromCurrentExpiry && !isExpired && currentEnd > now) {
      startD = new Date(currentEnd);
    }
    const endD = new Date(startD.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const disc = Number(planForm.discountAmount) || 0;
    const extra = Number(planForm.extraCharges) || 0;
    const finalPrice = targetPlan === 'demo' ? 0 : Math.max(0, baseRate - disc + extra);

    setPlanForm(prev => ({
      ...prev,
      plan: targetPlan,
      planStatus: targetPlan === 'demo' ? 'trial' : 'active',
      planStartDate: startD.toISOString().split('T')[0],
      planEndDate: endD.toISOString().split('T')[0],
      basePrice: baseRate,
      planPrice: finalPrice,
      billingCycle: cycle,
      actionType: actionName,
      planNotes: prev.planNotes || `${targetPlan === 'demo' ? 'Demo Extension' : 'Plan Renewal'}: +${durationDays} Days`
    }));
  };

  // Price adjustment handlers
  const handlePriceChange = (field, val) => {
    const num = Number(val) || 0;
    setPlanForm(prev => {
      const updated = { ...prev, [field]: num };
      if (prev.plan === 'demo') return updated;
      const base = Number(updated.basePrice) || (prev.plan === 'yearly' ? 9600 : 1000);
      const disc = field === 'discountAmount' ? num : (Number(updated.discountAmount) || 0);
      const extra = field === 'extraCharges' ? num : (Number(updated.extraCharges) || 0);
      return {
        ...updated,
        planPrice: Math.max(0, base - disc + extra)
      };
    });
  };

  // WhatsApp Renewal Receipt Generator
  const getWhatsAppRenewalUrl = () => {
    const phone = hotel.owner?.phone ? hotel.owner.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const endDate = planForm.planEndDate ? new Date(planForm.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const planName = planForm.plan === 'demo' ? '7-Day Free Trial' : (planForm.plan === 'yearly' ? 'Annual Plan (₹800/mo)' : 'Monthly Plan (₹1,000/mo)');

    const msg = [
      `🏨 *${hotel.name} - Subscription Renewal Update*`,
      `──────────────────────`,
      `Namaste *${hotel.owner?.name || 'Partner'}* ji,`,
      `Your hotel software subscription has been updated successfully:`,
      `📦 *Plan:* ${planName}`,
      `💰 *Billed Amount:* ₹${(planForm.planPrice || 0).toLocaleString()} (${planForm.paymentMethod || 'UPI'})`,
      planForm.paymentReference ? `🧾 *Ref / UTR:* ${planForm.paymentReference}` : '',
      `📅 *New Expiry Date:* ${endDate}`,
      `🏢 *Active Rooms:* Up to ${planForm.maxRooms} Rooms`,
      `──────────────────────`,
      `Front desk and guest check-ins are active with continuous cloud sync. Thank you for choosing NXHotel! ✨`
    ].filter(Boolean).join('\n');

    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (onSavePlan) {
      onSavePlan(planForm);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Collect history records (newest first)
  const historyList = (hotel.subscriptionHistory && hotel.subscriptionHistory.length > 0)
    ? [...hotel.subscriptionHistory].reverse()
    : [
        {
          _id: 'init-1',
          plan: hotel.plan || 'demo',
          billingCycle: hotel.billingCycle || 'trial',
          finalAmount: hotel.planPrice || 0,
          paymentMethod: hotel.plan === 'demo' ? 'Free Trial' : 'Initial Provision',
          paymentReference: 'Onboarding System',
          startDate: hotel.planStartDate || hotel.createdAt,
          endDate: hotel.planEndDate,
          durationDays: Math.ceil(((hotel.planEndDate ? new Date(hotel.planEndDate) : now) - new Date(hotel.planStartDate || hotel.createdAt || now)) / (1000 * 60 * 60 * 24)),
          actionType: 'initial',
          notes: hotel.planNotes || 'Initial hotel creation',
          recordedByName: hotel.onboardedBy?.name || 'System Onboarding',
          createdAt: hotel.createdAt || now
        }
      ];

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
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                <ShieldAlert size={12} className="text-amber-400" />
                <span>Subscription & Billing Center</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ID: {hotel._id?.slice(-6).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-2 flex items-center gap-2">
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

        {/* ─── LIVE EXPIRY STATUS BANNER ─── */}
        <div className={`p-4 border-b shrink-0 flex items-center justify-between gap-3 flex-wrap ${
          isExpired 
            ? 'bg-rose-50 border-rose-200/80 text-rose-900' 
            : daysRemaining <= 7 
            ? 'bg-amber-50 border-amber-200/80 text-amber-900' 
            : 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isExpired ? 'bg-rose-600 text-white' : daysRemaining <= 7 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
            }`}>
              {isExpired ? '🚨' : daysRemaining <= 7 ? '⚠️' : '✅'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isExpired ? 'Subscription Expired' : daysRemaining <= 7 ? 'Expiring Soon' : 'Active Subscription'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.2 rounded-md bg-white/80 border border-current">
                  {hotel.plan === 'demo' ? '7-Day Demo' : hotel.plan === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}
                </span>
              </div>
              <p className="text-xs mt-0.5 font-medium">
                {isExpired 
                  ? `Expired on ${currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${Math.abs(daysRemaining)} days ago)` 
                  : `Valid until ${currentEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${daysRemaining} days remaining)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {hotel.owner?.phone && (
              <a
                href={getWhatsAppRenewalUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors"
                title="Send current subscription status to Hotel Owner"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* ─── 2 TABS: RENEW vs HISTORY ─── */}
        <div className="flex border-b border-slate-200 bg-slate-50/75 px-4 pt-2 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('renew')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'renew'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <Repeat size={13} />
            <span>Renew / Update Plan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 border-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 border-transparent'
            }`}
          >
            <History size={13} />
            <span>Subscription History ({historyList.length})</span>
          </button>
        </div>

        {/* ─── TAB 1: RENEW & UPDATE PLAN ─── */}
        {activeTab === 'renew' && (
          <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              
              {/* ⚡ 1-Click Fast Renewal & Repetition Presets */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <span>1-Click Plan Actions & Renewal</span>
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={planForm.extendFromCurrentExpiry}
                      onChange={e => setPlanForm({ ...planForm, extendFromCurrentExpiry: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0"
                    />
                    <span>Extend from current expiry</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Repeat / Renew Current Plan */}
                  <button
                    type="button"
                    onClick={() => {
                      const isYear = hotel.plan === 'yearly' || hotel.plan === 'annual';
                      const days = isYear ? 365 : 30;
                      const base = isYear ? 9600 : 1000;
                      applyPreset(hotel.plan === 'demo' ? 'monthly' : hotel.plan, days, base, isYear ? 'yearly' : 'monthly', 'renewal');
                    }}
                    className="p-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-all active:scale-95 flex items-center justify-between gap-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat size={14} className="text-slate-700" />
                      <div>
                        <div className="text-slate-900 leading-tight">Repeat Current Plan</div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {hotel.plan === 'yearly' ? '+365 Days (₹9,600)' : '+30 Days (₹1,000)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">1-Click</span>
                  </button>

                  {/* Switch / Renew Annual Plan */}
                  <button
                    type="button"
                    onClick={() => applyPreset('yearly', 365, 9600, 'yearly', 'upgrade')}
                    className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs transition-all active:scale-95 flex items-center justify-between gap-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <div>
                        <div className="text-emerald-950 leading-tight">Annual Plan (Best Value)</div>
                        <div className="text-[10px] text-emerald-700 font-normal">₹800/mo · Billed ₹9,600 / 1 Year</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">20% Off</span>
                  </button>

                  {/* Switch / Renew Monthly Plan */}
                  <button
                    type="button"
                    onClick={() => applyPreset('monthly', 30, 1000, 'monthly', 'renewal')}
                    className="p-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 flex items-center justify-between gap-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-600" />
                      <div>
                        <div className="text-slate-900 leading-tight">Monthly Plan</div>
                        <div className="text-[10px] text-slate-500 font-normal">₹1,000 / 30 Days</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">+30d</span>
                  </button>

                  {/* Free Trial Demo Extension */}
                  <button
                    type="button"
                    onClick={() => applyPreset('demo', 7, 0, 'trial', 'extension')}
                    className="p-2.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 shadow-2xs transition-all active:scale-95 flex items-center justify-between gap-1 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-amber-600" />
                      <div>
                        <div className="text-amber-950 leading-tight">Extend 7-Day Demo</div>
                        <div className="text-[10px] text-amber-700 font-normal">₹0 / Free 7 More Days</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">+7d Demo</span>
                  </button>
                </div>
              </div>

              {/* Form Controls: Plan Selection & Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Plan Package
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.plan}
                    onChange={e => {
                      const p = e.target.value;
                      if (p === 'demo') applyPreset('demo', 7, 0, 'trial', 'extension');
                      else if (p === 'yearly') applyPreset('yearly', 365, 9600, 'yearly', 'upgrade');
                      else applyPreset('monthly', 30, 1000, 'monthly', 'renewal');
                    }}
                  >
                    <option value="demo">7-Day Free Trial (₹0)</option>
                    <option value="monthly">Monthly Plan (₹1,000 / month)</option>
                    <option value="yearly">Annual Plan (₹800/mo · ₹9,600 / yr)</option>
                    <option value="custom">Custom Commercial Plan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subscription Status
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.planStatus}
                    onChange={e => setPlanForm({ ...planForm, planStatus: e.target.value })}
                  >
                    <option value="active">Active (Full Access)</option>
                    <option value="trial">Trial Mode</option>
                    <option value="expired">Expired (Restricted Access)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Date Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Plan Start Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.planStartDate}
                    onChange={e => setPlanForm({ ...planForm, planStartDate: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.planEndDate}
                    onChange={e => setPlanForm({ ...planForm, planEndDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Price Calculation Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                  Commercial Pricing & Ledger Breakup
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 uppercase mb-1">- Discount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-emerald-700 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                      value={planForm.discountAmount || ''}
                      onChange={e => handlePriceChange('discountAmount', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">+ Extra Add-ons (₹)</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-blue-700 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                      value={planForm.extraCharges || ''}
                      onChange={e => handlePriceChange('extraCharges', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-900 uppercase mb-1">= Total Billed (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      className="w-full px-3 py-2 bg-white border-2 border-slate-900 rounded-xl font-black text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                      value={planForm.planPrice}
                      onChange={e => setPlanForm({ ...planForm, planPrice: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Payment Mode & Reference Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Payment Method</label>
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                      value={planForm.paymentMethod}
                      onChange={e => setPlanForm({ ...planForm, paymentMethod: e.target.value })}
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Cash">Cash Collection</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Free Trial">Free Trial / Complimentary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Transaction Ref / UTR</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI/493829482934 or Cash"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                      value={planForm.paymentReference}
                      onChange={e => setPlanForm({ ...planForm, paymentReference: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Max Rooms & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Room Capacity Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.maxRooms}
                    onChange={e => setPlanForm({ ...planForm, maxRooms: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    value={planForm.billingCycle}
                    onChange={e => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                  >
                    <option value="trial">Trial Cycle</option>
                    <option value="monthly">Monthly Cycle</option>
                    <option value="yearly">Yearly Cycle</option>
                    <option value="annual">Annual Cycle</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client renewed for 1 year with ₹9,600 advance via PhonePe"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl font-medium text-xs text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  value={planForm.planNotes}
                  onChange={e => setPlanForm({ ...planForm, planNotes: e.target.value })}
                />
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-50 border-t border-slate-200/90 flex gap-2.5 justify-end shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 bg-white text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? 'Updating Plan...' : <><CheckCircle2 size={14} /> Save & Apply Plan</>}
              </button>
            </div>
          </form>
        )}

        {/* ─── TAB 2: SUBSCRIPTION & PAYMENT HISTORY ─── */}
        {activeTab === 'history' && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt size={14} className="text-slate-900" />
                <span>Historical Subscription Invoices & Renewals</span>
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {historyList.length} Records Logged
              </span>
            </div>

            <div className="space-y-3">
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
                            {entry.plan === 'demo' ? '7-Day Free Trial' : entry.plan === 'yearly' ? 'Annual Plan' : 'Monthly Plan'}
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
                        <div className="text-sm font-black text-slate-900">
                          ₹{(entry.finalAmount !== undefined ? entry.finalAmount : (entry.planPrice || 0)).toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 flex items-center justify-end gap-1">
                          <CreditCard size={11} />
                          <span>{entry.paymentMethod || 'UPI'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata details */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 gap-2 flex-wrap">
                      <div>
                        {entry.paymentReference && (
                          <span className="font-mono text-slate-700 font-medium">Ref: {entry.paymentReference} • </span>
                        )}
                        <span>Processed by <strong className="text-slate-800">{entry.recordedByName || 'Admin'}</strong> on {cDate}</span>
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

            <div className="p-3 bg-slate-100 text-slate-600 rounded-xl text-xs text-center font-medium">
              Every renewal automatically extends validity and maintains an immutable audit trail.
            </div>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
