import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, CheckCircle2, Clock, AlertTriangle, 
  MessageSquare, Calendar, Building, Crown, ExternalLink, Download,
  Receipt, Search, Filter, Phone, CreditCard, ArrowRight, UserCheck,
  Check, Copy, Sparkles, RefreshCw
} from 'lucide-react';

const SubscriptionsView = ({ 
  stats, 
  hostels = [], 
  allHostels = [],
  transactions = [],
  onOpenPlanModal,
  onRefresh
}) => {
  const [activeSubTab, setActiveSubTab] = useState('hotels'); // 'hotels' | 'ledger'
  const [copiedKey, setCopiedKey] = useState(null);

  // Search & Filter State for Hotels Tab
  const [hotelSearch, setHotelSearch] = useState('');
  const [hotelStatusFilter, setHotelStatusFilter] = useState('all'); // 'all' | 'active' | 'expiringSoon' | 'expired' | 'trial'

  // Search & Filter State for Revenue History Ledger Tab
  const [txSearch, setTxSearch] = useState('');
  const [txPlanFilter, setTxPlanFilter] = useState('all');
  const [txActionFilter, setTxActionFilter] = useState('all');
  const [txMethodFilter, setTxMethodFilter] = useState('all');
  const [txDateFilter, setTxDateFilter] = useState('all'); // 'all' | 'today' | 'thisMonth'

  // Copy helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Comprehensive Transactions Ledger Extractor (Resilient fallback from populated hostels)
  const allTransactions = useMemo(() => {
    if (transactions && transactions.length > 0) return transactions;
    const list = [];
    const sourceHostels = allHostels?.length > 0 ? allHostels : hostels;

    sourceHostels.forEach(h => {
      const history = Array.isArray(h.subscriptionHistory) ? h.subscriptionHistory : [];
      if (history.length > 0) {
        history.forEach((sub, idx) => {
          list.push({
            _id: sub._id ? sub._id.toString() : `${h._id}-${idx}`,
            hostelId: h._id,
            hostelName: h.name,
            city: h.city || '',
            ownerName: h.owner?.name || 'Owner',
            ownerPhone: h.owner?.phone || h.contactNumber || '',
            ownerEmail: h.owner?.email || '',
            assignedAgentName: h.assignedSalesAgent?.name || h.onboardedBy?.name || '',
            plan: sub.plan || h.plan || 'monthly',
            billingCycle: sub.billingCycle || h.billingCycle || 'monthly',
            actionType: sub.actionType || (idx === 0 ? 'initial' : 'renewal'),
            planPrice: Number(sub.planPrice) || 0,
            discountAmount: Number(sub.discountAmount) || 0,
            extraCharges: Number(sub.extraCharges) || 0,
            finalAmount: Number(sub.finalAmount !== undefined ? sub.finalAmount : sub.planPrice) || 0,
            paymentMethod: sub.paymentMethod || 'UPI',
            paymentReference: sub.paymentReference || '',
            startDate: sub.startDate || h.planStartDate,
            endDate: sub.endDate || h.planEndDate,
            durationDays: sub.durationDays || 30,
            notes: sub.notes || '',
            recordedByName: sub.recordedByName || 'Super Admin',
            createdAt: sub.createdAt || h.createdAt
          });
        });
      } else if (h.planPrice > 0 && h.plan !== 'demo') {
        list.push({
          _id: `${h._id}-initial`,
          hostelId: h._id,
          hostelName: h.name,
          city: h.city || '',
          ownerName: h.owner?.name || 'Owner',
          ownerPhone: h.owner?.phone || h.contactNumber || '',
          ownerEmail: h.owner?.email || '',
          assignedAgentName: h.assignedSalesAgent?.name || h.onboardedBy?.name || '',
          plan: h.plan || 'monthly',
          billingCycle: h.billingCycle || 'monthly',
          actionType: 'initial',
          planPrice: Number(h.planPrice) || 0,
          discountAmount: Number(h.discountAmount) || 0,
          extraCharges: Number(h.extraCharges) || 0,
          finalAmount: Number(h.planPrice) || 0,
          paymentMethod: 'UPI',
          paymentReference: 'Initial Onboarding Plan',
          startDate: h.planStartDate,
          endDate: h.planEndDate,
          durationDays: 30,
          notes: h.planNotes || 'Initial subscription plan',
          recordedByName: 'Super Admin',
          createdAt: h.planStartDate || h.createdAt
        });
      }
    });

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [transactions, hostels, allHostels]);

  // Aggregate Metrics from All-Time Transaction Ledger
  const ledgerMetrics = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0);
    const thisMonthRevenue = allTransactions
      .filter(t => new Date(t.createdAt) >= startOfThisMonth)
      .reduce((sum, t) => sum + (t.finalAmount || 0), 0);
    const todayRevenue = allTransactions
      .filter(t => new Date(t.createdAt) >= startOfToday)
      .reduce((sum, t) => sum + (t.finalAmount || 0), 0);

    return {
      totalRevenue: stats?.totalSaasRevenue !== undefined ? stats.totalSaasRevenue : (stats?.totalPortfolioRevenue !== undefined ? stats.totalPortfolioRevenue : totalRevenue),
      thisMonthRevenue: stats?.thisMonthSaasRevenue !== undefined ? stats.thisMonthSaasRevenue : (stats?.thisMonthPortfolioRevenue !== undefined ? stats.thisMonthPortfolioRevenue : thisMonthRevenue),
      todayRevenue: stats?.todaySaasRevenue !== undefined ? stats.todaySaasRevenue : (stats?.todayPortfolioRevenue !== undefined ? stats.todayPortfolioRevenue : todayRevenue),
      totalCount: allTransactions.length
    };
  }, [allTransactions, stats]);

  // Filtered Hotels
  const filteredHotels = useMemo(() => {
    const now = new Date();
    return hostels.filter(h => {
      const q = hotelSearch.trim().toLowerCase();
      const matchSearch = !q ||
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.owner?.name && h.owner.name.toLowerCase().includes(q)) ||
        (h.owner?.phone && h.owner.phone.includes(q)) ||
        (h.contactNumber && h.contactNumber.includes(q)) ||
        (h.city && h.city.toLowerCase().includes(q));

      if (!matchSearch) return false;

      const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
      const isExp = h.isExpired !== undefined ? h.isExpired : (h.planStatus === 'expired' || (endDate && endDate < now));
      const daysLeft = h.daysRemaining !== undefined ? h.daysRemaining : (endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0);

      if (hotelStatusFilter === 'active') return !isExp && h.planStatus === 'active' && h.plan !== 'demo';
      if (hotelStatusFilter === 'trial') return h.planStatus === 'trial' || h.plan === 'demo';
      if (hotelStatusFilter === 'expiringSoon') return !isExp && daysLeft <= 7 && daysLeft >= 0;
      if (hotelStatusFilter === 'expired') return isExp;

      return true;
    });
  }, [hostels, hotelSearch, hotelStatusFilter]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allTransactions.filter(t => {
      const q = txSearch.trim().toLowerCase();
      const matchSearch = !q ||
        (t.hostelName && t.hostelName.toLowerCase().includes(q)) ||
        (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
        (t.ownerPhone && t.ownerPhone.includes(q)) ||
        (t.paymentReference && t.paymentReference.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (txPlanFilter !== 'all' && t.plan !== txPlanFilter) return false;
      if (txActionFilter !== 'all' && t.actionType !== txActionFilter) return false;
      if (txMethodFilter !== 'all' && t.paymentMethod !== txMethodFilter) return false;

      if (txDateFilter === 'today') {
        return new Date(t.createdAt) >= startOfToday;
      }
      if (txDateFilter === 'thisMonth') {
        return new Date(t.createdAt) >= startOfThisMonth;
      }

      return true;
    });
  }, [allTransactions, txSearch, txPlanFilter, txActionFilter, txMethodFilter, txDateFilter]);

  // CSV Exporter for Subscriptions
  const exportSubscriptionsCsv = () => {
    const headers = ['Property Name', 'Owner Name', 'Owner Email', 'Owner Phone', 'Plan Tier', 'Price (INR)', 'Billing Cycle', 'Start Date', 'End Date', 'Days Remaining', 'Status'];
    const rows = filteredHotels.map(h => {
      const now = new Date();
      const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
      const isExp = h.isExpired !== undefined ? h.isExpired : (h.planStatus === 'expired' || (endDate && endDate < now));
      const daysLeft = h.daysRemaining !== undefined ? h.daysRemaining : (endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0);
      return [
        `"${(h.name || '').replace(/"/g, '""')}"`,
        `"${(h.owner?.name || '').replace(/"/g, '""')}"`,
        `"${(h.owner?.email || '').replace(/"/g, '""')}"`,
        `"${(h.owner?.phone || h.contactNumber || '').replace(/"/g, '""')}"`,
        `"${(h.plan || 'starter').toUpperCase()}"`,
        h.planPrice || 0,
        `"${h.billingCycle || 'monthly'}"`,
        `"${h.planStartDate ? new Date(h.planStartDate).toLocaleDateString('en-IN') : ''}"`,
        `"${h.planEndDate ? new Date(h.planEndDate).toLocaleDateString('en-IN') : ''}"`,
        daysLeft,
        `"${isExp ? 'Expired' : h.planStatus || 'Active'}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotel-subscriptions-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Exporter for Complete Revenue & Renewal Transactions Ledger
  const exportRevenueHistoryCsv = () => {
    const headers = [
      'Transaction Date', 'Property Name', 'City', 'Owner Name', 'Owner Phone', 'Owner Email',
      'Action Type', 'Plan Tier', 'Billing Cycle', 'Duration (Days)', 'Plan Start Date', 'Plan End Date',
      'Base Price (INR)', 'Discount (INR)', 'Extra Charges (INR)', 'Amount Paid (INR)',
      'Payment Method', 'Payment Reference / UTR', 'Processed By', 'Notes'
    ];

    const rows = filteredTransactions.map(t => {
      const txDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN') : '';
      const sDate = t.startDate ? new Date(t.startDate).toLocaleDateString('en-IN') : '';
      const eDate = t.endDate ? new Date(t.endDate).toLocaleDateString('en-IN') : '';

      return [
        `"${txDate}"`,
        `"${(t.hostelName || '').replace(/"/g, '""')}"`,
        `"${(t.city || '').replace(/"/g, '""')}"`,
        `"${(t.ownerName || '').replace(/"/g, '""')}"`,
        `"${(t.ownerPhone || '').replace(/"/g, '""')}"`,
        `"${(t.ownerEmail || '').replace(/"/g, '""')}"`,
        `"${t.actionType || 'renewal'}"`,
        `"${(t.plan || 'monthly').toUpperCase()}"`,
        `"${t.billingCycle || 'monthly'}"`,
        t.durationDays || 30,
        `"${sDate}"`,
        `"${eDate}"`,
        t.planPrice || 0,
        t.discountAmount || 0,
        t.extraCharges || 0,
        t.finalAmount || 0,
        `"${t.paymentMethod || 'UPI'}"`,
        `"${(t.paymentReference || '').replace(/"/g, '""')}"`,
        `"${(t.recordedByName || 'Super Admin').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `saas-revenue-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRenewalWhatsAppUrl = (hotel) => {
    const phone = hotel.owner?.phone ? hotel.owner.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const daysRemaining = hotel.daysRemaining !== undefined ? hotel.daysRemaining : 0;
    const endDate = hotel.planEndDate ? new Date(hotel.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    
    const msg = [
      `🏨 *NexisParkX Hotel SaaS - Subscription Reminder*`,
      `──────────────────────`,
      `Namaste *${hotel.owner?.name || 'Partner'}* ji,`,
      `This is regarding the subscription renewal for your property: *${hotel.name}*.`,
      `📦 *Current Tier:* ${hotel.plan?.toUpperCase() || 'Starter'} Plan`,
      `💰 *Billing:* ₹${(hotel.planPrice || 0).toLocaleString('en-IN')} / ${hotel.billingCycle || 'monthly'}`,
      hotel.isExpired 
        ? `⚠️ *Status:* Subscription has Expired.` 
        : `📅 *Expiry Date:* ${endDate} (${daysRemaining} days remaining).`,
      `──────────────────────`,
      `Please contact Super Admin to renew your subscription and avoid any disruption in hotel operations.`,
      `Thank you! ✨`
    ].join('\n');

    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ─── TOP METRICS: Real SaaS Platform Revenue Collections ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Total All-Time Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total SaaS Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <IndianRupee size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              ₹{(ledgerMetrics.totalRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">All-time platform collections</p>
        </div>

        {/* This Month's Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">This Month</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <Calendar size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-indigo-700 font-mono">
              ₹{(ledgerMetrics.thisMonthRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Current month collections</p>
        </div>

        {/* Today's Revenue */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Revenue</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                <Clock size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
              ₹{(ledgerMetrics.todayRevenue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Collected today</p>
        </div>

        {/* Total Transactions / Renewals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Invoices</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                <Receipt size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-purple-700">
              {ledgerMetrics.totalCount}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Logged renewals & payments</p>
        </div>

        {/* Active Paid Properties */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Paid</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-700">
              {stats?.activeSubscriptions || 0}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Hotels on live paid billing</p>
        </div>

        {/* Expired / Action Required */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Expired Plans</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
                <AlertTriangle size={14} />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600">
              {stats?.expiredSubscriptions || 0}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">Plan ended / Renewal needed</p>
        </div>
      </div>

      {/* ─── 2-TAB VIEW SWITCHER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('hotels')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'hotels'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Building size={14} />
            <span>Hotel Properties ({hostels.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Receipt size={14} className="text-emerald-500" />
            <span>Revenue & Renewal History Ledger ({allTransactions.length})</span>
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs self-end sm:self-auto cursor-pointer"
            title="Refresh All Subscription & Revenue Data"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: 🏨 HOTEL PROPERTIES & PLAN STATUS VIEW */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'hotels' && (
        <div className="space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search hotel name, owner, phone, city..."
                value={hotelSearch}
                onChange={e => setHotelSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'active', label: 'Active Paid' },
                  { key: 'expiringSoon', label: 'Expiring (7d)' },
                  { key: 'expired', label: 'Expired' },
                  { key: 'trial', label: 'Trial' }
                ].map(f => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setHotelStatusFilter(f.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      hotelStatusFilter === f.key
                        ? 'bg-slate-900 text-white shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={exportSubscriptionsCsv}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Download hotel properties plan list as CSV"
              >
                <Download size={13} className="text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Hotel Property</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Client / Owner</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Current Plan Tier</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Plan Tariff</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Validity Period</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredHotels.map((h) => {
                    const now = new Date();
                    const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
                    const startDate = h.planStartDate ? new Date(h.planStartDate) : null;
                    const isExpired = h.isExpired !== undefined ? h.isExpired : (h.planStatus === 'expired' || (endDate && endDate < now));
                    const daysRemaining = h.daysRemaining !== undefined ? h.daysRemaining : (endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0);
                    const waReminderUrl = getRenewalWhatsAppUrl(h);
                    const historyCount = Array.isArray(h.subscriptionHistory) ? h.subscriptionHistory.length : 0;

                    return (
                      <tr key={h._id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Property Name & City */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                              🏨
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate">{h.name}</p>
                              <p className="text-[11px] text-slate-500 font-medium truncate">
                                📍 {h.city || h.address || 'Location N/A'}
                                {historyCount > 0 && (
                                  <span className="ml-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                    {historyCount} {historyCount === 1 ? 'invoice' : 'invoices'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Owner / Phone */}
                        <td className="px-5 py-3.5">
                          {h.owner ? (
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{h.owner.name}</p>
                              {h.owner.phone && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <a href={`tel:${h.owner.phone}`} className="text-[11px] text-emerald-700 hover:underline font-mono font-bold flex items-center gap-0.5">
                                    <Phone size={10} />
                                    <span>{h.owner.phone}</span>
                                  </a>
                                  {waReminderUrl && (
                                    <a 
                                      href={waReminderUrl} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="p-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors border border-emerald-200"
                                      title="Send WhatsApp Reminder"
                                    >
                                      <MessageSquare size={11} />
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No Owner Attached</span>
                          )}
                        </td>

                        {/* Plan Tier */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                            h.plan === 'demo'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : h.plan === 'yearly' || h.plan === 'annual'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}>
                            {h.plan === 'demo'
                              ? '7-Day Free Trial'
                              : h.plan === 'yearly' || h.plan === 'annual'
                              ? 'Annual Plan'
                              : h.plan === 'monthly'
                              ? 'Monthly Plan'
                              : (h.plan || 'Monthly')}
                          </span>
                          {h.discountAmount > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                              -₹{h.discountAmount} discount
                            </span>
                          )}
                        </td>

                        {/* Plan Price */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="font-black text-slate-900 text-sm font-mono">
                              ₹{(h.planPrice || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">
                              /{h.billingCycle || 'monthly'}
                            </span>
                          </div>
                        </td>

                        {/* Validity Dates */}
                        <td className="px-5 py-3.5 text-xs font-medium text-slate-600">
                          {startDate && endDate ? (
                            <div>
                              <span>{startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              <span className="text-slate-400 mx-1">➔</span>
                              <span className="font-bold text-slate-900">{endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Dates not set</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 text-xs font-black rounded-full inline-flex items-center gap-1.5 ${
                            isExpired 
                              ? 'bg-red-50 text-red-700 border border-red-200' 
                              : daysRemaining <= 7 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : daysRemaining <= 7 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span>{isExpired ? 'Expired' : `${daysRemaining} days left`}</span>
                          </span>
                        </td>

                        {/* Action: Renew / Edit */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => onOpenPlanModal(h)}
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-2xs active:scale-95 cursor-pointer"
                            >
                              Renew / Edit
                            </button>
                            {waReminderUrl && (
                              <a
                                href={waReminderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                                title="Send WhatsApp Renewal Reminder"
                              >
                                <MessageSquare size={13} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredHotels.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        <Building size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-slate-600">No properties matching filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: 💳 REVENUE & RENEWAL HISTORY LEDGER (आय व रिन्यूअल विवरण) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          
          {/* Controls Bar for Ledger */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search hotel, client name, phone, UTR reference, notes..."
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs transition-all"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Date Filter */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                {[
                  { key: 'all', label: 'All Time' },
                  { key: 'thisMonth', label: 'This Month' },
                  { key: 'today', label: 'Today' }
                ].map(d => (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setTxDateFilter(d.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      txDateFilter === d.key
                        ? 'bg-slate-900 text-white shadow-2xs font-black'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {/* Action Filter */}
              <select
                value={txActionFilter}
                onChange={e => setTxActionFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="all">All Actions (सभी प्रकार)</option>
                <option value="renewal">Renewals (रिन्यूअल)</option>
                <option value="initial">Initial Plans (शुरुआती प्लान)</option>
                <option value="upgrade">Upgrades (अपग्रेड)</option>
                <option value="extension">Extensions (अवधि विस्तार)</option>
              </select>

              {/* Payment Mode Filter */}
              <select
                value={txMethodFilter}
                onChange={e => setTxMethodFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="all">All Modes (सभी पेमेंट मोड)</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
              </select>

              {/* Export Full Revenue Ledger CSV */}
              <button
                onClick={exportRevenueHistoryCsv}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Download full historical revenue transaction ledger as CSV"
              >
                <Download size={13} />
                <span>Export Revenue CSV</span>
              </button>
            </div>
          </div>

          {/* Revenue & Renewal Transactions Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-slate-900" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Platform Subscription & Renewal Ledger (आय व रिन्यूअल विवरण)
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                  Showing {filteredTransactions.length} of {allTransactions.length} records
                </span>
              </div>
              <div className="text-xs font-bold text-slate-600">
                Filtered Total: <strong className="text-emerald-700 font-mono font-black">₹{filteredTransactions.reduce((sum, t) => sum + (t.finalAmount || 0), 0).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm whitespace-nowrap">
                <thead className="bg-white border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Hotel & Client</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Action Type</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Plan & Validity Period</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Payment Mode & Ref</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Amount Paid</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Handled By</th>
                    <th className="px-5 py-3 text-[10px] font-black uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredTransactions.map((tx, idx) => {
                    const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
                    const sDate = tx.startDate ? new Date(tx.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';
                    const eDate = tx.endDate ? new Date(tx.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A';

                    return (
                      <tr key={tx._id || idx} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Date & Time (कब आया) */}
                        <td className="px-5 py-3.5">
                          {txDate ? (
                            <div>
                              <p className="font-bold text-slate-900 text-xs">
                                {txDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">N/A</span>
                          )}
                        </td>

                        {/* 2. Hotel & Client (किससे आया) */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                              🏨
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-xs truncate max-w-[180px]">{tx.hostelName}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                                <span>{tx.ownerName}</span>
                                {tx.ownerPhone && (
                                  <>
                                    <span>•</span>
                                    <a href={`tel:${tx.ownerPhone}`} className="text-emerald-700 hover:underline font-mono font-bold">
                                      {tx.ownerPhone}
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 3. Action Type Badge */}
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                            tx.actionType === 'initial'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : tx.actionType === 'upgrade'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : tx.actionType === 'extension'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            {tx.actionType === 'initial' ? 'Initial Setup' : tx.actionType === 'upgrade' ? 'Plan Upgrade' : tx.actionType === 'extension' ? 'Extension' : 'Renewal'}
                          </span>
                        </td>

                        {/* 4. Plan & Validity (कौनसा प्लान व कब से कब तक) */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="font-bold text-slate-900 text-xs">
                              {tx.plan === 'demo' ? '7-Day Free Trial' : tx.plan === 'yearly' || tx.plan === 'annual' ? 'Annual Plan' : tx.plan === 'monthly' ? 'Monthly Plan' : (tx.plan || 'Monthly')}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({tx.durationDays || 30} days)
                            </span>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              📅 {sDate} ➔ {eDate}
                            </p>
                          </div>
                        </td>

                        {/* 5. Payment Mode & Ref (कैसे आया) */}
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider inline-flex items-center gap-1 ${
                              tx.paymentMethod === 'UPI'
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : tx.paymentMethod === 'Bank Transfer'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <CreditCard size={10} />
                              <span>{tx.paymentMethod || 'UPI'}</span>
                            </span>
                            {tx.paymentReference && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                                <span className="truncate max-w-[120px]">Ref: {tx.paymentReference}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(tx.paymentReference, `ref-${idx}`)}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy UTR Reference"
                                >
                                  {copiedKey === `ref-${idx}` ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 6. Amount Paid (कितना आया) */}
                        <td className="px-5 py-3.5">
                          <div>
                            <span className="font-black text-emerald-700 text-sm font-mono">
                              ₹{(tx.finalAmount || tx.planPrice || 0).toLocaleString('en-IN')}
                            </span>
                            {tx.discountAmount > 0 && (
                              <span className="text-[10px] text-slate-400 line-through block">
                                ₹{((tx.finalAmount || 0) + tx.discountAmount).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 7. Handled By */}
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-medium">
                          <span>{tx.recordedByName || 'Super Admin'}</span>
                        </td>

                        {/* 8. Notes */}
                        <td className="px-5 py-3.5">
                          {tx.notes ? (
                            <span className="text-[11px] text-slate-600 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[150px] inline-block" title={tx.notes}>
                              "{tx.notes}"
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        <Receipt size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-bold text-slate-600">No revenue transactions matching filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SubscriptionsView;
