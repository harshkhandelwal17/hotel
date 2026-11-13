import React from 'react';
import { 
  IndianRupee, CheckCircle2, Clock, AlertTriangle, 
  MessageSquare, Calendar, Building, Crown, ExternalLink
} from 'lucide-react';

const SubscriptionsView = ({ 
  stats, 
  hostels = [], 
  onOpenPlanModal 
}) => {

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
      `💰 *Billing:* ₹${(hotel.planPrice || 0).toLocaleString()} / ${hotel.billingCycle || 'monthly'}`,
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
    <div className="space-y-6">
      {/* Top Revenue Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <IndianRupee size={12} className="text-emerald-600" />
            <span>Total SaaS Revenue</span>
          </span>
          <p className="text-2xl font-black text-gray-900 mt-1">₹{(stats?.totalSaasRevenue || 0).toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Platform subscription collections</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-600" />
            <span>Active Paid Plans</span>
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats?.activeSubscriptions || 0}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Hotels on live paid billing</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Clock size={12} className="text-amber-600" />
            <span>Expiring in 7 Days</span>
          </span>
          <p className="text-2xl font-black text-amber-600 mt-1">{stats?.expiringSoonSubscriptions || 0}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Immediate renewal needed</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <AlertTriangle size={12} className="text-red-600" />
            <span>Expired Subscriptions</span>
          </span>
          <p className="text-2xl font-black text-red-600 mt-1">{stats?.expiredSubscriptions || 0}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Blocked / Trial ended</p>
        </div>
      </div>

      {/* Subscriptions Ledger Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Hotel Subscription Ledger</h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Complete record of plan tiers, renewal dates, prices charged, and payment status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Hotel Property</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Client / Owner</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan Tier</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount Charged</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Validity Period</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {hostels.map((h) => {
                const now = new Date();
                const endDate = h.planEndDate ? new Date(h.planEndDate) : null;
                const startDate = h.planStartDate ? new Date(h.planStartDate) : null;
                const isExpired = h.isExpired !== undefined ? h.isExpired : (h.planStatus === 'expired' || (endDate && endDate < now));
                const daysRemaining = h.daysRemaining !== undefined ? h.daysRemaining : (endDate ? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)) : 0);
                const waReminderUrl = getRenewalWhatsAppUrl(h);

                return (
                  <tr key={h._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                          🏨
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{h.name}</p>
                          <p className="text-xs text-gray-500 font-medium">📍 {h.address || 'Location N/A'}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {h.owner ? (
                        <div>
                          <p className="font-bold text-gray-900 text-xs">{h.owner.name}</p>
                          {h.owner.phone && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <a href={`tel:${h.owner.phone}`} className="text-[11px] text-emerald-600 hover:underline font-mono font-bold">
                                📞 {h.owner.phone}
                              </a>
                              {waReminderUrl && (
                                <a 
                                  href={waReminderUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-green-600 hover:text-green-700 text-[10px] font-bold"
                                  title="Send WhatsApp Reminder"
                                >
                                  💬
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Owner Attached</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {h.plan || 'Starter'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <span className="font-black text-gray-900 text-sm font-mono">
                          ₹{(h.planPrice || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-400 block uppercase font-bold">
                          /{h.billingCycle || 'monthly'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-gray-600">
                      {startDate && endDate ? (
                        <div>
                          <span>{startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-gray-400 mx-1">➔</span>
                          <span className="font-bold text-gray-900">{endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Dates not set</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-black rounded-full inline-flex items-center gap-1 ${
                        isExpired 
                          ? 'bg-red-50 text-red-700 border border-red-200' 
                          : daysRemaining <= 7 
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isExpired ? 'bg-red-500' : daysRemaining <= 7 ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                        <span>{isExpired ? 'Expired' : `${daysRemaining} days remaining`}</span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenPlanModal(h)}
                          className="px-3.5 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                          Renew / Edit Plan
                        </button>
                        {waReminderUrl && (
                          <a
                            href={waReminderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageSquare size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {hostels.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    <Building size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-gray-600">No properties found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsView;
