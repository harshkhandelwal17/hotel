import React, { useState } from 'react';
import { 
  Crown, Building, Users, Mail, Phone, LogIn, KeyRound, 
  Pencil, Plus, Lock, Unlock, Sparkles, MessageSquare, 
  Shirt, ArrowRight, ExternalLink, Calendar, CheckCircle2, AlertTriangle, Clock,
  Network, Briefcase
} from 'lucide-react';

const EcosystemView = ({ 
  owners = [], 
  hostels = [], 
  users = [], 
  salesAgents = [],
  onAssignSalesAgent,
  onImpersonate, 
  onResetPassword, 
  onEditUser, 
  onOpenAddProperty, 
  onOpenPlanModal, 
  onEditProperty, 
  onToggleHostelStatus, 
  onToggleAiOcr, 
  onToggleWhatsAppSync, 
  onToggleLaundry,
  onOpenCreateStaffForHotel,
  onOpenCreateOwner,
  onOpenRegisterProperty,
  impersonating = false,
  quickFilter = 'all'
}) => {
  const [salesFilter, setSalesFilter] = useState('all');

  const getRenewalWhatsAppUrl = (owner, hotel) => {
    const phone = owner.phone ? owner.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const daysRemaining = hotel.daysRemaining !== undefined ? hotel.daysRemaining : 0;
    const endDate = hotel.planEndDate ? new Date(hotel.planEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    
    const msg = [
      `🏨 *NexisParkX Hotel SaaS - Subscription Update*`,
      `──────────────────────`,
      `Namaste *${owner.name}* ji,`,
      `This is a friendly reminder regarding your hotel software subscription for *${hotel.name}*.`,
      `📦 *Plan:* ${hotel.plan?.toUpperCase() || 'Starter'} (₹${(hotel.planPrice || 0).toLocaleString()} / ${hotel.billingCycle || 'mo'})`,
      hotel.isExpired 
        ? `⚠️ *Status:* Subscription has Expired.` 
        : `📅 *Expiry Date:* ${endDate} (${daysRemaining} days remaining).`,
      `──────────────────────`,
      `Please contact Super Admin to renew your subscription and ensure continuous front desk operations without disruption.`,
      `Thank you! ✨`
    ].join('\n');

    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  // Filter hostels if a quick filter or sales filter is active
  const filterHotel = (h) => {
    if (quickFilter === 'active' && (h.isActive === false || h.isExpired || h.planStatus === 'trial')) return false;
    if (quickFilter === 'expiringSoon' && !(h.daysRemaining >= 0 && h.daysRemaining <= 7 && !h.isExpired)) return false;
    if (quickFilter === 'expired' && !h.isExpired) return false;
    if (quickFilter === 'locked' && h.isActive !== false) return false;

    if (salesFilter !== 'all') {
      const assignedId = (h.assignedSalesAgent?._id || h.assignedSalesAgent)?.toString();
      const onboardedId = (h.onboardedBy?._id || h.onboardedBy)?.toString();

      if (salesFilter === 'unassigned') {
        if (assignedId || onboardedId) return false;
      } else {
        if (assignedId !== salesFilter && onboardedId !== salesFilter) return false;
      }
    }

    return true;
  };

  return (
    <div className="space-y-6">
      {/* Ecosystem Header Card with Fast Actions & Sales Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <Network size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Hotel Business Hierarchy</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Multi-tenant architecture: Owner ➔ Registered Properties ➔ Front Desk Staff
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end flex-wrap">
          {salesAgents.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Briefcase size={13} className="text-slate-600 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 shrink-0">Sales Rep:</span>
              <select
                value={salesFilter}
                onChange={(e) => setSalesFilter(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-900 outline-none cursor-pointer"
              >
                <option value="all">All Portfolios ({hostels.length} Hotels)</option>
                <option value="unassigned">Direct / Unassigned ({hostels.filter(h => !(h.assignedSalesAgent || h.onboardedBy)).length})</option>
                {salesAgents.map(sa => {
                  const count = hostels.filter(h => 
                    (h.assignedSalesAgent?._id || h.assignedSalesAgent)?.toString() === sa._id.toString() ||
                    (h.onboardedBy?._id || h.onboardedBy)?.toString() === sa._id.toString()
                  ).length;
                  return (
                    <option key={sa._id} value={sa._id}>
                      {sa.name} ({count} Hotels)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {(onOpenCreateOwner || onOpenRegisterProperty) && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {onOpenCreateOwner && (
                <button
                  onClick={onOpenCreateOwner}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>+ New Owner</span>
                </button>
              )}
              {onOpenRegisterProperty && (
                <button
                  onClick={onOpenRegisterProperty}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Building size={14} />
                  <span>+ Register Hotel</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {owners.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400">
          <Users size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
          <p className="font-bold text-gray-700 text-sm">No hotel owners found matching search criteria</p>
        </div>
      ) : (
        owners.map((owner) => {
          let ownerProps = hostels.filter(h => (h.owner?._id || h.owner) === owner._id);
          const totalPropsCount = ownerProps.length;
          
          if (quickFilter !== 'all') {
            ownerProps = ownerProps.filter(filterHotel);
            if (ownerProps.length === 0) return null; // Hide owner if none of their hotels match the filter
          }

          const totalRevenueForOwner = ownerProps.reduce((sum, h) => sum + (Number(h.planPrice) || 0), 0);
          const propContact = ownerProps.find(p => p.contactNumber && p.contactNumber !== 'N/A' && p.contactNumber.trim() !== '')?.contactNumber;
          const displayPhone = owner.phone || propContact || '';

          return (
            <div key={owner._id} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all hover:border-slate-300">
              {/* 👑 OWNER BANNER ROW */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-bold text-base shrink-0">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold tracking-tight truncate">{owner.name}</h3>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                        <Crown size={10} className="text-slate-400" />
                        <span>Hotel Owner</span>
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {totalPropsCount} {totalPropsCount === 1 ? 'Property' : 'Properties'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <Mail size={12} className="text-slate-400" />
                        {owner.email}
                      </span>
                      {displayPhone && (
                        <a href={`tel:${displayPhone}`} className="flex items-center gap-1 text-emerald-400 hover:underline font-mono font-medium">
                          <Phone size={12} />
                          {displayPhone}
                        </a>
                      )}
                      <span className="text-slate-400">
                        • SaaS Collections: <strong className="text-white">₹{totalRevenueForOwner.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={(e) => onImpersonate(owner._id, e)}
                    disabled={impersonating || owner.isActive === false}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                    title={owner.isActive === false ? 'Account is locked' : 'Login directly into this Hotel Owner account'}
                  >
                    <LogIn size={13} />
                    <span>Login As Owner</span>
                  </button>

                  <button
                    onClick={() => onResetPassword(owner._id, owner.name)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
                    title="Reset Password to default (123456)"
                  >
                    <KeyRound size={14} />
                  </button>

                  <button
                    onClick={() => onEditUser(owner, displayPhone)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-all cursor-pointer"
                    title="Edit Owner Phone & Name"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    onClick={() => onOpenAddProperty(owner._id)}
                    className="px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Hotel</span>
                  </button>
                </div>
              </div>

              {/* 🏨 NESTED PROPERTIES */}
              <div className="p-5 sm:p-6 bg-slate-50/50">
                {ownerProps.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-white text-gray-400">
                    <Building size={32} className="mx-auto mb-2 opacity-40 text-gray-400" />
                    <p className="font-bold text-gray-700 text-sm">No properties registered under this owner yet</p>
                    <button
                      onClick={() => onOpenAddProperty(owner._id)}
                      className="mt-3 px-4 py-2 bg-black text-white text-xs font-bold rounded-xl hover:bg-gray-800 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Attach First Hotel</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {ownerProps.map((h) => {
                      const now = new Date();
                      const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
                      const isExpired = h.isExpired !== undefined ? h.isExpired : (h.planStatus === 'expired' || (endDate && endDate < now));
                      const daysRemaining = h.daysRemaining !== undefined ? h.daysRemaining : (endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0);
                      const staffList = h.staffMembers || users.filter(u => u.role === 'receptionist' && (u.assignedHostel?._id || u.assignedHostel) === h._id);
                      const waReminderUrl = getRenewalWhatsAppUrl(owner, h);

                      return (
                        <div key={h._id} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-2xs hover:border-gray-300 transition-all flex flex-col justify-between space-y-4">
                          {/* Property Header */}
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base sm:text-lg">🏨</span>
                                  <h4 className="font-black text-base text-gray-900 truncate">{h.name}</h4>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    h.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}>
                                    {h.isActive !== false ? 'Active' : 'Locked'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">
                                  📍 {h.address || 'Address not recorded'} {h.contactNumber ? `• 📞 ${h.contactNumber}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => onEditProperty(h)}
                                  className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Hotel Info"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => onToggleHostelStatus(h._id, h.isActive)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    h.isActive !== false ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={h.isActive !== false ? 'Lock / Deactivate Hotel' : 'Activate Hotel'}
                                >
                                  {h.isActive !== false ? <Lock size={13} /> : <Unlock size={13} />}
                                </button>
                              </div>
                            </div>

                            {/* SaaS Plan & Billing Card */}
                            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-800">
                                    {h.plan || 'Starter'} Plan
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">
                                    ₹{(h.planPrice || 0).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/{h.billingCycle || 'mo'}</span>
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-1">
                                  {endDate ? `Expires: ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No expiry set'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isExpired 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                    : daysRemaining <= 7 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isExpired ? '⚠️ Expired' : `${daysRemaining}d left`}
                                </span>

                                <button
                                  onClick={() => onOpenPlanModal(h)}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-800 hover:text-black bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  Edit Plan
                                </button>

                                {waReminderUrl && (
                                  <a
                                    href={waReminderUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                    title="Send WhatsApp Renewal Reminder to Owner"
                                  >
                                    <MessageSquare size={10} />
                                    <span>Remind</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* 💼 Sales Representative / Account Manager Assignment */}
                            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Briefcase size={12} className="text-slate-500 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-500">Sales Rep:</span>
                                <span className="text-[11px] font-bold text-slate-900 truncate">
                                  {h.assignedSalesAgent?.name || h.onboardedBy?.name || 'Direct (No Rep)'}
                                </span>
                                {h.assignedSalesAgent && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0">
                                    Assigned
                                  </span>
                                )}
                                {h.onboardedBy && !h.assignedSalesAgent && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0">
                                    Onboarded
                                  </span>
                                )}
                              </div>

                              {onAssignSalesAgent && (
                                <select
                                  value={h.assignedSalesAgent?._id || (typeof h.assignedSalesAgent === 'string' ? h.assignedSalesAgent : '')}
                                  onChange={(e) => onAssignSalesAgent(h._id, e.target.value)}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-800 outline-none focus:ring-1 focus:ring-black cursor-pointer shadow-2xs"
                                  title="Assign or reassign hotel to a Sales Executive"
                                >
                                  <option value="">— Direct / None —</option>
                                  {salesAgents.map(sa => (
                                    <option key={sa._id} value={sa._id}>
                                      {sa.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Live Stats: Rooms & Active Guests */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Total Rooms</span>
                                <span className="font-bold text-slate-900 text-sm">{h.roomCount || 0} Rooms</span>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Active Stays</span>
                                <span className="font-bold text-slate-900 text-sm">{h.activeStaysCount || 0} Checked In</span>
                              </div>
                            </div>

                            {/* Feature Toggles */}
                            <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-slate-100 text-[10px]">
                              <button
                                onClick={() => onToggleAiOcr(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.aiOcrEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                <Sparkles size={11} />
                                <span>AI Scanner: {h.aiOcrEnabled ? 'ON' : 'OFF'}</span>
                              </button>

                              <button
                                onClick={() => onToggleWhatsAppSync(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.whatsappSyncEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                <MessageSquare size={11} />
                                <span>WhatsApp: {h.whatsappSyncEnabled ? 'ON' : 'OFF'}</span>
                              </button>

                              <button
                                onClick={() => onToggleLaundry(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.laundryEnabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                <Shirt size={11} />
                                <span>Laundry: {h.laundryEnabled ? 'ON' : 'OFF'}</span>
                              </button>
                            </div>
                          </div>

                          {/* 👥 FRONT DESK STAFF ASSIGNED TO THIS HOTEL */}
                          <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                                <Users size={12} className="text-indigo-600" />
                                <span>Front Desk Staff ({staffList.length})</span>
                              </span>
                              <button
                                onClick={() => onOpenCreateStaffForHotel(h._id)}
                                className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                              >
                                + Add Receptionist
                              </button>
                            </div>

                            {staffList.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">No receptionists created for this hotel yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {staffList.map((sm) => (
                                  <div key={sm._id} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="truncate max-w-[110px]">{sm.name}</span>
                                    {sm.phone && (
                                      <a href={`tel:${sm.phone}`} className="text-[10px] text-gray-400 hover:text-black font-mono">
                                        📞 {sm.phone}
                                      </a>
                                    )}
                                    <button
                                      onClick={(e) => onImpersonate(sm._id, e)}
                                      disabled={impersonating || sm.isActive === false}
                                      className="text-[9px] font-black text-indigo-600 hover:underline ml-1 cursor-pointer disabled:opacity-40"
                                      title={sm.isActive === false ? 'Account is deactivated' : `Login as ${sm.name}`}
                                    >
                                      Login
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default EcosystemView;
