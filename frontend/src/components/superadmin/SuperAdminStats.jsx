import React from 'react';
import { 
  Crown, Building, IndianRupee, CheckCircle2, 
  Users, BedDouble, AlertTriangle, Clock, Lock
} from 'lucide-react';

const SuperAdminStats = ({ 
  stats, 
  hotelOwnersCount = 0, 
  hostelsCount = 0, 
  activeHostelsCount = 0, 
  lockedHostelsCount = 0, 
  staffCount = 0,
  quickFilter = 'all',
  onQuickFilterChange
}) => {
  const cards = [
    { 
      label: 'Hotel Owners', 
      value: hotelOwnersCount, 
      icon: Crown, 
      sub: 'Verified Clients'
    },
    { 
      label: 'Total Properties', 
      value: hostelsCount, 
      icon: Building, 
      sub: `${activeHostelsCount} Active Properties`
    },
    { 
      label: 'Platform ARR / Revenue', 
      value: `₹${(stats?.totalSaasRevenue || 0).toLocaleString()}`, 
      icon: IndianRupee, 
      sub: 'Subscription Collections'
    },
    { 
      label: 'Active Subscriptions', 
      value: stats?.activeSubscriptions || 0, 
      icon: CheckCircle2, 
      sub: `${stats?.expiringSoonSubscriptions || 0} Expiring in 7 Days`
    },
    { 
      label: 'Reception Staff', 
      value: staffCount, 
      icon: Users, 
      sub: 'Active User Accounts'
    },
    { 
      label: 'Total Hotel Rooms', 
      value: stats?.totalRooms || 0, 
      icon: BedDouble, 
      sub: `${stats?.activeStays || 0} Occupied Stays`
    }
  ];

  return (
    <div className="space-y-3">
      {/* 6 Clean Enterprise Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((s, i) => (
          <div 
            key={i} 
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{s.label}</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <s.icon size={16} />
              </div>
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{s.value}</h3>
              {s.sub && <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">{s.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Status Filter Bar */}
      {onQuickFilterChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Status:
          </span>

          <button
            onClick={() => onQuickFilterChange('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              quickFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All Properties ({hostelsCount})
          </button>

          <button
            onClick={() => onQuickFilterChange('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'active'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Active Paid ({stats?.activeSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('expiringSoon')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'expiringSoon'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50/50 border border-amber-200'
            }`}
          >
            <Clock size={12} className="text-amber-600" />
            <span>Expiring Soon ({stats?.expiringSoonSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('expired')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'expired'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-rose-700 hover:bg-rose-50/50 border border-rose-200'
            }`}
          >
            <AlertTriangle size={12} className="text-rose-600" />
            <span>Expired ({stats?.expiredSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('locked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              quickFilter === 'locked'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Lock size={12} className="text-slate-400" />
            <span>Locked ({lockedHostelsCount})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminStats;
