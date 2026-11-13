import React from 'react';
import { 
  Crown, Building, Users, Mail, Phone, LogIn, KeyRound, 
  Pencil, Plus, Lock, Unlock, Sparkles, MessageSquare, 
  Shirt, ArrowRight, ExternalLink, Calendar, CheckCircle2, AlertTriangle, Clock,
  Network
} from 'lucide-react';

const EcosystemView = ({ 
  owners = [], 
  hostels = [], 
  users = [], 
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

  // Filter hostels if a quick filter is active
  const filterHotel = (h) => {
    if (quickFilter === 'all') return true;
    if (quickFilter === 'active') return h.isActive !== false && !h.isExpired && h.planStatus !== 'trial';
    if (quickFilter === 'expiringSoon') return h.daysRemaining >= 0 && h.daysRemaining <= 7 && !h.isExpired;
    if (quickFilter === 'expired') return h.isExpired;
    if (quickFilter === 'locked') return h.isActive === false;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Ecosystem Header Card with Fast Actions */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 shrink-0">
            <Network size={22} />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-900">Hotel Business Ecosystem</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Multi-tenant architecture: Owner (Admin) ➔ Properties Managed ➔ Assigned Front Desk Staff (Receptionists)
            </p>
          </div>
        </div>

        {(onOpenCreateOwner || onOpenRegisterProperty) && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenCreateOwner && (
              <button
                onClick={onOpenCreateOwner}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>+ New Owner</span>
              </button>
            )}
            {onOpenRegisterProperty && (
              <button
                onClick={onOpenRegisterProperty}
                className="px-3.5 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Building size={14} />
                <span>+ Register Hotel</span>
              </button>
            )}
          </div>
        )}
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
            <div key={owner._id} className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden transition-all hover:shadow-md">
              {/* 👑 OWNER BANNER ROW */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-gray-900 via-gray-950 to-black text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center font-black text-lg shrink-0">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black tracking-tight truncate">{owner.name}</h3>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center gap-1">
                        <Crown size={10} />
                        <span>Hotel Owner</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                        {totalPropsCount} {totalPropsCount === 1 ? 'Property' : 'Properties'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-400 font-medium mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-gray-300 font-bold">
                        <Mail size={12} className="text-gray-400" />
                        {owner.email}
                      </span>
                      {displayPhone && (
                        <a href={`tel:${displayPhone}`} className="flex items-center gap-1 text-emerald-400 hover:underline font-mono font-bold">
                          <Phone size={12} />
                          {displayPhone}
                        </a>
                      )}
                      <span className="text-gray-500">
                        • Total SaaS Fee: <strong className="text-amber-400">₹{totalRevenueForOwner.toLocaleString()}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => onImpersonate(owner._id)}
                    disabled={impersonating}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                    title="Login directly into this Hotel Owner account"
                  >
                    <LogIn size={13} />
                    <span>Login As Owner</span>
                  </button>

                  <button
                    onClick={() => onResetPassword(owner._id, owner.name)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Reset Password to default (123456)"
                  >
                    <KeyRound size={15} />
                  </button>

                  <button
                    onClick={() => onEditUser(owner, displayPhone)}
                    className="p-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer"
                    title="Edit Owner Phone & Name"
                  >
                    <Pencil size={15} />
                  </button>

                  <button
                    onClick={() => onOpenAddProperty(owner._id)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Hotel</span>
                  </button>
                </div>
              </div>

              {/* 🏨 NESTED PROPERTIES */}
              <div className="p-5 sm:p-6 bg-gray-50/60">
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
                            <div className="mt-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                                    {h.plan || 'Starter'} Plan
                                  </span>
                                  <span className="text-xs font-black text-gray-900">
                                    ₹{(h.planPrice || 0).toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">/{h.billingCycle || 'mo'}</span>
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium mt-1">
                                  {endDate ? `Expires: ${new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : 'No expiry set'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                  isExpired 
                                    ? 'bg-red-100 text-red-800 border border-red-200' 
                                    : daysRemaining <= 7 
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isExpired ? '⚠️ Expired' : `${daysRemaining}d left`}
                                </span>

                                <button
                                  onClick={() => onOpenPlanModal(h)}
                                  className="px-2.5 py-1 text-[11px] font-black text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                                >
                                  Edit Plan
                                </button>

                                {waReminderUrl && (
                                  <a
                                    href={waReminderUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 px-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                    title="Send WhatsApp Renewal Reminder to Owner"
                                  >
                                    <MessageSquare size={10} />
                                    <span>Remind</span>
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Live Stats: Rooms & Active Guests */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Rooms</span>
                                <span className="font-black text-gray-900 text-sm">{h.roomCount || 0} Rooms</span>
                              </div>
                              <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Stays</span>
                                <span className="font-black text-emerald-600 text-sm">{h.activeStaysCount || 0} Checked In</span>
                              </div>
                            </div>

                            {/* Feature Toggles */}
                            <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-gray-100 text-[10px]">
                              <button
                                onClick={() => onToggleAiOcr(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.aiOcrEnabled ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                <Sparkles size={11} />
                                <span>AI OCR: {h.aiOcrEnabled ? 'ON' : 'OFF'}</span>
                              </button>

                              <button
                                onClick={() => onToggleWhatsAppSync(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.whatsappSyncEnabled ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-400'
                                }`}
                              >
                                <MessageSquare size={11} />
                                <span>WhatsApp: {h.whatsappSyncEnabled ? 'ON' : 'OFF'}</span>
                              </button>

                              <button
                                onClick={() => onToggleLaundry(h._id)}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  h.laundryEnabled ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-400'
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
                                      onClick={() => onImpersonate(sm._id)}
                                      disabled={impersonating}
                                      className="text-[9px] font-black text-indigo-600 hover:underline ml-1 cursor-pointer"
                                      title={`Login as ${sm.name}`}
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
