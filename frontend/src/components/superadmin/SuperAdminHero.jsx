import React from 'react';
import { ShieldAlert, Plus, Building, RefreshCw, IndianRupee } from 'lucide-react';

const SuperAdminHero = ({ 
  onOpenCreateOwner, 
  onOpenRegisterProperty, 
  onRefresh, 
  loading,
  stats 
}) => {
  return (
    <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-gray-800">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-red-600/20 border border-red-500/30 rounded-2xl backdrop-blur-sm text-red-400 shrink-0">
            <ShieldAlert size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                Master Control Portal
              </span>
              <span className="text-[10px] font-bold text-gray-400 bg-white/10 px-2.5 py-0.5 rounded-full">
                Multi-Tenant Enterprise SaaS
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5">
              Super Admin Headquarters
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 max-w-xl">
              Complete oversight of Hotel Owners, multi-branch property networks, subscription billing & front desk staff.
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh System Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={onOpenCreateOwner}
            className="px-4 sm:px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>+ Create Owner</span>
          </button>

          <button
            onClick={onOpenRegisterProperty}
            className="px-4 sm:px-5 py-3 bg-white text-gray-950 hover:bg-gray-100 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Building size={16} />
            <span>+ Register Hotel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminHero;
