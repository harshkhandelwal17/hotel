import React, { useState } from 'react';
import axios from 'axios';
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
  ExternalLink,
  Target,
  Settings,
  MessageSquare,
  Sparkles,
  LogIn,
  History,
  Calendar,
  Flame,
  Filter,
  X
} from 'lucide-react';

const SalesTeamView = ({
  salesData,
  onOpenCreateSalesAgent,
  onResetPassword,
  onRefresh,
  loading,
  onImpersonate,
  impersonating
}) => {
  const [viewMode, setViewMode] = useState('leaderboard'); // 'leaderboard' | 'leads'
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('all');
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedHistoryLead, setSelectedHistoryLead] = useState(null);

  const [search, setSearch] = useState('');
  const [expandedAgentId, setExpandedAgentId] = useState(null);

  // Settings Modal State
  const [editingAgent, setEditingAgent] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    monthlyTargetHotels: 10,
    commissionRate: 15,
    isActive: true
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const leaderboard = salesData?.leaderboard || [];
  const agents = leaderboard.map(item => item.agent).filter(Boolean);
  const totalAgents = salesData?.totalAgents || agents.length;
  const totalSalesRevenue = salesData?.totalSalesRevenue || 0;
  const totalHotelsBySales = salesData?.totalHotelsBySales || 0;
  const totalCommissionPayout = salesData?.totalCommissionPayout || 0;
  const totalLeads = salesData?.pipeline?.totalTeamLeads || 0;
  const overallConversion = salesData?.pipeline?.overallConversion || 0;

  const filteredLeaderboard = leaderboard.filter(item => {
    const q = search.toLowerCase();
    const name = item.agent?.name?.toLowerCase() || '';
    const email = item.agent?.email?.toLowerCase() || '';
    const phone = item.agent?.phone || '';
    return name.includes(q) || email.includes(q) || phone.includes(q);
  });

  const allLeads = salesData?.allLeads || [];

  const filteredTeamLeads = allLeads.filter(lead => {
    if (selectedAgentFilter !== 'all' && (lead.salesAgent?._id || lead.salesAgent)?.toString() !== selectedAgentFilter) {
      return false;
    }
    if (leadStatusFilter === 'today') {
      if (!lead.nextFollowUpDate) return false;
      const d = new Date(lead.nextFollowUpDate);
      const now = new Date();
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return d >= s && d <= e && lead.status !== 'won' && lead.status !== 'lost';
    }
    if (leadStatusFilter === 'hot') {
      return lead.priority === 'hot' && lead.status !== 'won' && lead.status !== 'lost';
    }
    if (leadStatusFilter === 'demo') {
      return lead.status === 'demo_scheduled' || lead.status === 'demo_completed';
    }
    if (leadStatusFilter === 'won') {
      return lead.status === 'won';
    }
    if (leadStatusFilter === 'lost') {
      return lead.status === 'lost';
    }

    if (leadSearch.trim()) {
      const q = leadSearch.toLowerCase();
      const hotel = lead.hotelName?.toLowerCase() || '';
      const person = lead.contactPerson?.toLowerCase() || '';
      const phone = lead.phone || '';
      const city = lead.city?.toLowerCase() || '';
      const agent = lead.salesAgent?.name?.toLowerCase() || '';
      return hotel.includes(q) || person.includes(q) || phone.includes(q) || city.includes(q) || agent.includes(q);
    }
    return true;
  });

  const toggleExpand = (agentId) => {
    setExpandedAgentId(prev => prev === agentId ? null : agentId);
  };

  const openSettingsModal = (item) => {
    setEditingAgent(item.agent);
    setSettingsForm({
      monthlyTargetHotels: item.monthlyTarget || 10,
      commissionRate: item.commissionRate || 15,
      isActive: item.agent?.isActive !== false
    });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!editingAgent) return;
    try {
      setSavingSettings(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/superadmin/sales-team/${editingAgent._id}/settings`, settingsForm);
      alert(`✅ Settings updated for ${editingAgent.name}`);
      setEditingAgent(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const getAgentWhatsAppUrl = (item) => {
    const phone = item.agent?.phone ? item.agent.phone.replace(/\D/g, '').slice(-10) : '';
    if (!phone) return null;
    const msg = [
      `💼 *NexisParkX Sales Command - Performance Update*`,
      `Namaste *${item.agent.name}* ji,`,
      `Here is your current performance snapshot:`,
      `🏨 *Onboarded Hotels:* ${item.hotelsCount} properties`,
      `💰 *Total Sales Value:* ₹${(item.totalRevenueGenerated || 0).toLocaleString()}`,
      `💸 *Earned Commission:* ₹${(item.commissionEarned || 0).toLocaleString()} (${item.commissionRate}% tier)`,
      `🎯 *Monthly Target:* ${item.hotelsCount} / ${item.monthlyTarget} Hotels`,
      `Keep up the great work! 🚀`
    ].join('\n');
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* 🚀 Top Sales Performance KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Users size={12} className="text-indigo-600" />
            <span>Field Executives</span>
          </span>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalAgents}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Active team members</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <IndianRupee size={12} className="text-emerald-600" />
            <span>Team Sales Revenue</span>
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">₹{totalSalesRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Total subscription collections</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <Building size={12} className="text-blue-600" />
            <span>Hotels Onboarded</span>
          </span>
          <p className="text-2xl font-black text-blue-600 mt-1">{totalHotelsBySales}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Properties brought by sales</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
            <TrendingUp size={12} className="text-purple-600" />
            <span>Est. Commission Payout</span>
          </span>
          <p className="text-2xl font-black text-purple-600 mt-1">₹{totalCommissionPayout.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 font-medium mt-0.5">{overallConversion}% lead conversion rate</p>
        </div>
      </div>

      {/* 🧭 VIEW MODE SWITCHER: Leaderboard vs Prospects & Follow-up History */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('leaderboard')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'leaderboard'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy size={14} className={viewMode === 'leaderboard' ? 'text-amber-500' : 'text-slate-400'} />
            <span>Sales Leaderboard & Reps</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
              {agents.length}
            </span>
          </button>

          <button
            onClick={() => setViewMode('leads')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'leads'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} className={viewMode === 'leads' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Team Prospects & Follow-ups</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold">
              {allLeads.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <a
            href="/sales"
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
            title="Open Field Sales Operations Portal as Super Admin"
          >
            <ExternalLink size={13} />
            <span>Open Sales Console</span>
          </a>
          <button
            onClick={onOpenCreateSalesAgent}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>+ Add Sales Rep</span>
          </button>
        </div>
      </div>

      {/* 🏆 Sales Team Leaderboard Table */}
      {viewMode === 'leaderboard' && (
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
              Ranked by total SaaS revenue generated. Set individual targets, commission rates, and track performance.
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
            <table className="w-full min-w-[750px] text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank & Agent</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Target Progress</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Active Paid / Trials</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue Generated</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Commission Earned</th>
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

                  const progressPct = Math.min(100, Math.round((item.hotelsCount / (item.monthlyTarget || 10)) * 100));
                  const waUrl = getAgentWhatsAppUrl(item);

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

                        {/* Target Progress */}
                        <td className="px-6 py-4 text-center">
                          <div className="w-28 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-gray-600">
                              <span>{item.hotelsCount} Hotels</span>
                              <span>Target: {item.monthlyTarget}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 rounded-full" 
                                style={{ width: `${progressPct}%` }}
                              ></div>
                            </div>
                          </div>
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
                          <span className="text-[10px] text-gray-400 font-medium">Subscription collections</span>
                        </td>

                        {/* Commission Earned */}
                        <td className="px-6 py-4">
                          <div className="font-black text-purple-600 text-sm">
                            ₹{item.commissionEarned.toLocaleString()}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">({item.commissionRate}% tier)</span>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {onImpersonate && (
                              <button
                                onClick={(e) => onImpersonate(agent._id, e)}
                                disabled={impersonating || agent.isActive === false}
                                title={`Login directly as ${agent.name} (Field Sales)`}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                              >
                                <LogIn size={13} />
                                <span>Login As</span>
                              </button>
                            )}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Send WhatsApp Update to Agent"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              >
                                <MessageSquare size={15} />
                              </a>
                            )}
                            <button
                              onClick={() => openSettingsModal(item)}
                              title="Set Target & Commission Rate"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Settings size={15} />
                            </button>
                            <button
                              onClick={() => toggleExpand(agent._id)}
                              className={`px-3 py-1.5 text-xs font-black rounded-xl border transition-all flex items-center gap-1 ${
                                isExpanded 
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <span>{item.hotelsCount} Properties</span>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
                          <td colSpan={8} className="px-6 py-4 bg-gray-50/70 border-y border-gray-200">
                            <div className="space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <Building size={14} className="text-slate-700" />
                                    <span>Managed Portfolio ({item.hotels.length})</span>
                                  </h4>
                                  <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 rounded-md">
                                    {item.onboardedCount || 0} Closed · {item.assignedCount || 0} Assigned
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-500">
                                  Active Subscriptions: <strong className="text-emerald-700">₹{item.totalRevenueGenerated.toLocaleString()}</strong>
                                </span>
                              </div>

                              {item.hotels.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-2">
                                  No properties in portfolio yet. Ready for assignments or field demos.
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {item.hotels.map(h => (
                                    <div key={h._id} className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
                                      <div>
                                        <div className="flex justify-between items-start gap-2">
                                          <p className="font-bold text-slate-900 text-xs truncate">{h.name}</p>
                                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 ${
                                            h.planStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                          }`}>
                                            {h.planStatus || 'trial'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          {h.isAssignedByAdmin ? (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-700 rounded border border-purple-200">
                                              👑 Assigned by Admin
                                            </span>
                                          ) : (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                                              ✨ Closed by Agent
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate mt-1">{h.address || 'No address'}</p>
                                      </div>

                                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-700 text-[11px]">
                                          {h.plan ? h.plan.toUpperCase() : 'STARTER'}
                                        </span>
                                        <span className="font-bold text-emerald-700 text-xs">
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
      )}

      {/* 🎯 Team Prospects & Lead Follow-ups Pipeline (Super Admin Surveillance View) */}
      {viewMode === 'leads' && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header & Filters */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <h2 className="text-lg font-black text-gray-900">Team Prospect Pipeline & Follow-up History</h2>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 rounded-md">
                    Surveillance
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Full visibility into all hotel leads, sales rep touchpoints, scheduled calls, and follow-up interaction history.
                </p>
              </div>

              {/* Agent Filter Dropdown */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 hidden sm:inline">Rep:</span>
                <select
                  value={selectedAgentFilter}
                  onChange={e => setSelectedAgentFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="all">All Sales Reps ({agents.length})</option>
                  {agents.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub-Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[
                  { id: 'all', label: `All Prospects (${allLeads.length})` },
                  { id: 'today', label: `⏰ Today's Calls` },
                  { id: 'hot', label: `🔥 Hot Leads` },
                  { id: 'demo', label: `⚡ Demos` },
                  { id: 'won', label: `🏆 Converted` },
                  { id: 'lost', label: `❌ Lost` },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setLeadStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      leadStatusFilter === f.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search hotel, owner, city, rep..."
                  value={leadSearch}
                  onChange={e => setLeadSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>
          </div>

          {/* Leads Table */}
          {filteredTeamLeads.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Calendar size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="font-bold text-gray-700 text-sm">No prospect leads match this filter</p>
              <p className="text-xs text-gray-400 mt-1">Try switching rep or status filter to see other pipeline stages.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-5">Hotel / Prospect</th>
                    <th className="py-3 px-4">Decision Maker / Contact</th>
                    <th className="py-3 px-4">Assigned Sales Rep</th>
                    <th className="py-3 px-4">Stage & Priority</th>
                    <th className="py-3 px-4">Follow-up Schedule & Notes</th>
                    <th className="py-3 px-5 text-right">Audit Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {filteredTeamLeads.map(lead => {
                    const historyCount = lead.followUpHistory?.length || 0;
                    const cleanPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
                    return (
                      <tr key={lead._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900 text-sm">{lead.hotelName}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {lead.city && <span>📍 {lead.city}</span>}
                            {lead.roomCount > 0 && <span>• 🛏️ {lead.roomCount} Rooms</span>}
                            {lead.currentSoftware && <span>• Using: {lead.currentSoftware}</span>}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{lead.contactPerson || 'N/A'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {lead.phone && (
                              <a
                                href={`tel:${lead.phone}`}
                                className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                              >
                                <Phone size={11} />
                                <span>{lead.phone}</span>
                              </a>
                            )}
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                                title="Chat on WhatsApp"
                              >
                                WA
                              </a>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {lead.salesAgent?.name?.charAt(0) || 'S'}
                            </span>
                            <span>{lead.salesAgent?.name || 'Unassigned'}</span>
                          </div>
                          {lead.salesAgent?.phone && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{lead.salesAgent.phone}</div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              lead.status === 'won' ? 'bg-emerald-100 text-emerald-800' :
                              lead.status === 'lost' ? 'bg-rose-100 text-rose-700' :
                              lead.status.includes('demo') ? 'bg-indigo-100 text-indigo-700' :
                              lead.status === 'negotiation' || lead.status === 'proposal_sent' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {lead.status?.replace('_', ' ')}
                            </span>

                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              lead.priority === 'hot' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                              lead.priority === 'warm' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-50 text-slate-600 border border-slate-200'
                            }`}>
                              {lead.priority || 'warm'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {lead.nextFollowUpDate ? (
                            <div className="font-bold text-indigo-600 flex items-center gap-1">
                              <Clock size={11} />
                              <span>{new Date(lead.nextFollowUpDate).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No follow-up set</span>
                          )}
                          {lead.notes && (
                            <p className="text-[11px] text-slate-600 truncate mt-0.5" title={lead.notes}>
                              "{lead.notes}"
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <button
                            onClick={() => setSelectedHistoryLead(lead)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <History size={12} className="text-indigo-600" />
                            <span>Timeline ({historyCount})</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 📜 LEAD INTERACTION HISTORY AUDIT TRAIL MODAL (Super Admin) */}
      {selectedHistoryLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-left">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <History size={20} className="text-indigo-600" />
                  <h3 className="text-base font-black text-gray-900">
                    Lead Follow-up History & Surveillance
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Prospect: <strong className="text-gray-900">{selectedHistoryLead.hotelName}</strong> ({selectedHistoryLead.contactPerson || 'Owner'})
                  {selectedHistoryLead.salesAgent?.name && (
                    <span> • Rep: <strong className="text-indigo-600">{selectedHistoryLead.salesAgent.name}</strong></span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedHistoryLead(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(!selectedHistoryLead.followUpHistory || selectedHistoryLead.followUpHistory.length === 0) ? (
                <div className="p-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                  <History size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-bold text-gray-600">No previous follow-up logs recorded yet.</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">When the sales rep logs calls, notes or visits, the full audit trail will display here.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-indigo-200 ml-3 pl-4 space-y-4 py-2">
                  {selectedHistoryLead.followUpHistory.slice().reverse().map((entry, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 shadow-xs"></div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{entry.by || selectedHistoryLead.salesAgent?.name || 'Sales Rep'}</span>
                            {entry.stage && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 uppercase">
                                {entry.stage.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(entry.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                          {entry.notes || 'No note left.'}
                        </p>
                        {entry.nextFollowUpDate && (
                          <div className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1 pt-1 border-t border-slate-200/60">
                            <Clock size={10} />
                            <span>Scheduled Next Follow-up: {new Date(entry.nextFollowUpDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedHistoryLead(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ EDIT SALES AGENT SETTINGS MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <Settings size={18} className="text-indigo-600" />
              <span>Configure Sales Agent Settings</span>
            </h3>
            <p className="text-xs text-gray-500">
              Customize targets and incentive commission for <strong>{editingAgent.name}</strong>.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-gray-700 uppercase mb-1">Monthly Hotel Onboarding Target</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={settingsForm.monthlyTargetHotels}
                  onChange={e => setSettingsForm({ ...settingsForm, monthlyTargetHotels: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
                <span className="text-[10px] text-gray-400 font-normal">Number of new hotels expected per month.</span>
              </div>

              <div>
                <label className="block text-gray-700 uppercase mb-1">Commission Rate Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={settingsForm.commissionRate}
                  onChange={e => setSettingsForm({ ...settingsForm, commissionRate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                />
                <span className="text-[10px] text-gray-400 font-normal">Percentage of active subscription revenue paid as incentive.</span>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={settingsForm.isActive}
                  onChange={e => setSettingsForm({ ...settingsForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-gray-700">
                  Account Active & Enabled
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2 bg-indigo-600 text-white font-black rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTeamView;
