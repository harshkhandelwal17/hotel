import React, { useState } from 'react';
import { 
  Users, 
  IndianRupee, 
  Building, 
  Trophy, 
  TrendingUp, 
  Plus, 
  Phone, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  KeyRound,
  ShieldAlert,
  Search,
  ExternalLink
} from 'lucide-react';

const SalesTeamView = ({
  salesData,
  onOpenCreateSalesAgent,
  onResetPassword,
  loading
}) => {
  const [search, setSearch] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState(null);

  const leaderboard = salesData?.leaderboard || [];
  const totalAgents = salesData?.totalAgents || 0;
  const totalSalesRevenue = salesData?.totalSalesRevenue || 0;
  const totalHotelsBySales = salesData?.totalHotelsBySales || 0;
  const avgRevenuePerAgent = totalAgents > 0 ? Math.round(totalSalesRevenue / totalAgents) : 0;

  const filteredLeaderboard = leaderboard.filter(item => {
    const q = search.toLowerCase();
    const name = item.agent?.name?.toLowerCase() || '';
    const email = item.agent?.email?.toLowerCase() || '';
    const phone = item.agent?.phone || '';
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  const toggleExpand = (agentId) => {
    setExpandedAgentId(prev => prev === agentId ? null : agentId);
  };

  return (
    <div className="space-y-6">
      {/* 🚀 Top Sales Performance KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Users size={12} className="text-indigo-600" />
            <span>Field Sales Executives</span>
          </span>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalAgents}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Active field agents</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <IndianRupee size={12} className="text-emerald-600" />
            <span>Total Sales Revenue</span>
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalSalesRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Generated via sales team</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Building size={12} className="text-blue-600" />
            <span>Hotels Onboarded</span>
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalHotelsBySales}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Properties registered by sales</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <TrendingUp size={12} className="text-purple-600" />
            <span>Avg Revenue / Agent</span>
          </span>
          <p className="text-2xl font-black text-purple-600 mt-1">₹{avgRevenuePerAgent.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Performance average</p>
        </div>
      </div>

      {/* 🏆 Sales Team Leaderboard Table */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="text-lg font-black text-gray-900">Sales Executives Leaderboard</h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-md">
                Field Team
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Ranked by total SaaS revenue generated. Click any executive to inspect their onboarded hotels.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search agent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <button
              onClick={onOpenCreateSalesAgent}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} className="stroke-[3]" />
              <span>+ Add Sales Executive</span>
            </button>
          </div>
        </div>

        {filteredLeaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={36} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-sm font-black text-gray-700">No Sales Executives Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
              Create a sales person account to empower field reps to onboard hotels and give live demos.
            </p>
            <button
              onClick={onOpenCreateSalesAgent}
              className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-xl hover:bg-indigo-700"
            >
              + Create First Sales Executive
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank & Agent</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Hotels Onboarded</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Active Paid / Trials</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Generated</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLeaderboard.map((item, idx) => {
                  const agent = item.agent;
                  const isExpanded = expandedAgentId === agent._id;
                  const rankBadge = idx === 0 
                    ? 'bg-amber-100 text-amber-800 border-amber-300' 
                    : idx === 1 
                    ? 'bg-slate-200 text-slate-700 border-slate-300' 
                    : idx === 2 
                    ? 'bg-orange-100 text-orange-800 border-orange-300' 
                    : 'bg-gray-100 text-gray-600 border-gray-200';

                  return (
                    <React.Fragment key={agent._id}>
                      <tr className={`hover:bg-gray-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                        {/* Rank & Agent Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border ${rankBadge}`}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <div>
                              <p className="font-black text-gray-900 text-sm">{agent.name}</p>
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                Field Sales
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4 text-xs font-semibold text-gray-600">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-gray-900 font-bold">
                              <Mail size={12} className="text-gray-400" />
                              <span>{agent.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Phone size={12} className="text-gray-400" />
                              <span>{agent.phone || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Hotels Count */}
                        <td className="px-6 py-4 text-center">
                          <span className="font-black text-gray-900 text-base">{item.hotelsCount}</span>
                          <span className="text-[10px] text-gray-400 font-semibold block">hotels</span>
                        </td>

                        {/* Active vs Trials */}
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-black text-xs flex items-center gap-1">
                              <CheckCircle2 size={11} /> {item.activeHotelsCount} Paid
                            </span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-xs flex items-center gap-1">
                              <Clock size={11} /> {item.trialHotelsCount} Trial
                            </span>
                          </div>
                        </td>

                        {/* Revenue Generated */}
                        <td className="px-6 py-4">
                          <div className="font-black text-emerald-600 text-base">
                            ₹{item.totalRevenueGenerated.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">Subscription value</span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${
                            agent.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {agent.isActive !== false ? 'Active' : 'Locked'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(agent._id)}
                              className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all flex items-center gap-1 ${
                                isExpanded 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <span>{item.hotelsCount} Hotels</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <button
                              onClick={() => onResetPassword(agent._id)}
                              title="Reset Password"
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                            >
                              <KeyRound size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View: Hotels Onboarded by this Sales Agent */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 bg-gray-50/70 border-y border-gray-200">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                                  <Building size={14} className="text-indigo-600" />
                                  <span>Properties Onboarded by {agent.name} ({item.hotels.length})</span>
                                </h4>
                                <span className="text-xs font-bold text-gray-500">
                                  Total Revenue from Agent: <strong className="text-emerald-700">₹{item.totalRevenueGenerated.toLocaleString()}</strong>
                                </span>
                              </div>

                              {item.hotels.length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">
                                  No properties onboarded yet. Agent is ready for field demos.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {item.hotels.map(h => (
                                    <div key={h._id} className="p-3 bg-white rounded-2xl border border-gray-200 shadow-xs flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-start gap-2">
                                          <p className="font-black text-gray-900 text-xs truncate">{h.name}</p>
                                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider shrink-0 ${
                                            h.planStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                          }`}>
                                            {h.planStatus || 'trial'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{h.address || 'No address'}</p>
                                      </div>

                                      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                                        <span className="font-black text-gray-800 text-[11px]">
                                          {h.plan ? h.plan.toUpperCase() : 'STARTER'}
                                        </span>
                                        <span className="font-black text-emerald-600 text-xs">
                                          ₹{(h.planPrice || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesTeamView;
