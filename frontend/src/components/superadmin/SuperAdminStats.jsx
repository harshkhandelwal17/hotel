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
      color: 'text-purple-600', 
      bg: 'bg-purple-50', 
      sub: 'Admins / Clients',
      filterKey: 'all'
    },
    { 
      label: 'Properties', 
      value: hostelsCount, 
      icon: Building, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      sub: `${activeHostelsCount} Active`,
      filterKey: 'all'
    },
    { 
      label: 'SaaS Plan Revenue', 
      value: `₹${(stats?.totalSaasRevenue || 0).toLocaleString()}`, 
      icon: IndianRupee, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      sub: 'Platform Earnings',
      filterKey: 'all'
    },
    { 
      label: 'Active Subscriptions', 
      value: stats?.activeSubscriptions || 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      sub: `${stats?.expiringSoonSubscriptions || 0} Expiring in 7d`,
      filterKey: 'active'
    },
    { 
      label: 'Reception Staff', 
      value: staffCount, 
      icon: Users, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50', 
      sub: 'Assigned Users',
      filterKey: 'all'
    },
    { 
      label: 'Total Rooms', 
      value: stats?.totalRooms || 0, 
      icon: BedDouble, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50', 
      sub: `${stats?.activeStays || 0} Occupied`,
      filterKey: 'all'
    }
  ];

  return (
    <div className="space-y-3">
      {/* 6 High Impact Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((s, i) => (
          <div 
            key={i} 
            className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform"
          >
            <div className={`p-3 rounded-2xl ${s.bg} ${s.color} mb-2`}>
              <s.icon size={22} />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{s.value}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
            {s.sub && <p className="text-[9px] font-bold text-gray-500 mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Quick Status Filter Bar (Instant Focus for SaaS Super Admins) */}
      {onQuickFilterChange && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1 shrink-0">
            Quick Filter:
          </span>

          <button
            onClick={() => onQuickFilterChange('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              quickFilter === 'all'
                ? 'bg-black text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({hostelsCount})
          </button>

          <button
            onClick={() => onQuickFilterChange('expiringSoon')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              quickFilter === 'expiringSoon'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock size={12} />
            <span>Expiring in 7 Days ({stats?.expiringSoonSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('expired')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              quickFilter === 'expired'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
            }`}
          >
            <AlertTriangle size={12} />
            <span>Expired ({stats?.expiredSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('active')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              quickFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 size={12} />
            <span>Active Paid ({stats?.activeSubscriptions || 0})</span>
          </button>

          <button
            onClick={() => onQuickFilterChange('locked')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              quickFilter === 'locked'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Lock size={12} />
            <span>Locked / Inactive ({lockedHostelsCount})</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminStats;
