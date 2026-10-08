import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, Users, Building, BedDouble, IndianRupee, LogIn, Activity, AlertCircle } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SuperAdminDashboard = () => {
  const { user, login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonating, setImpersonating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const [statsRes, usersRes, hostelsRes] = await Promise.all([
        axios.get(`${API}/api/superadmin/stats`),
        axios.get(`${API}/api/superadmin/users`),
        axios.get(`${API}/api/superadmin/hostels`)
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data);
      setHostels(hostelsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load superadmin data');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (targetUserId, e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to log in as this user? You will need to log out to return to Super Admin.')) return;
    
    try {
      setImpersonating(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/superadmin/impersonate`, { userId: targetUserId });
      
      const { token, user: targetUser } = res.data;
      
      // Update local storage and context
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));
      
      // Force reload to reset all states and contexts with new user
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.message || 'Impersonation failed');
      setImpersonating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div></div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold">{error}</div>;
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = async (userId) => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/superadmin/users/${userId}/toggle-status`);
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: res.data.data.isActive } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = window.prompt("Enter new password for this user:", "123456");
    if (!newPassword) return; // User cancelled
    
    if (!window.confirm(`Are you sure you want to change the password to "${newPassword}"?`)) return;
    
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      await axios.put(`${API}/api/superadmin/users/${userId}/reset-password`, { password: newPassword });
      alert(`Password reset successfully to: ${newPassword}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-red-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><ShieldAlert size={40} className="text-white" /></div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Super Admin Headquarters</h1>
            <p className="text-red-100 mt-1 font-medium">System-wide surveillance and access controls.</p>
          </div>
        </div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Properties', value: stats?.totalHostels, icon: Building, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Rooms', value: stats?.totalRooms, icon: BedDouble, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Total Stays', value: stats?.totalStays, icon: Activity, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Today Bookings', value: stats?.todayStays || 0, icon: Activity, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'System Revenue', value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: IndianRupee, color: 'text-green-600', bg: 'bg-green-50' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:-translate-y-1 transition-transform">
            <div className={`p-3 rounded-xl ${s.bg} ${s.color} mb-3`}><s.icon size={24} /></div>
            <h3 className="text-2xl font-black text-gray-900">{s.value}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit mt-8">
        <button onClick={() => setActiveTab('users')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
          System Users
        </button>
        <button onClick={() => setActiveTab('hostels')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'hostels' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
          Properties / Hostels
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden mt-4">
        {activeTab === 'users' ? (
        <>
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">System Users (Imposter Mode)</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage users, reset passwords, or login as them.</p>
          </div>
          <div className="relative w-full sm:w-64">
             <input type="text" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-black outline-none transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">User Details</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Role & Access</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 font-black text-[10px] text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u._id} className={`hover:bg-gray-50 transition-colors ${u.isActive === false ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${
                      u.role === 'superadmin' ? 'bg-red-100 text-red-700' :
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                    {u.assignedHostel && (
                      <p className="text-[10px] font-bold text-gray-500 mt-1.5 flex items-center gap-1">
                        <Building size={10} /> {u.assignedHostel.name}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.isActive !== false ? (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-gray-200 text-gray-600">Disabled</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {u._id !== user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleToggleStatus(u._id)} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 shadow-sm ${u.isActive !== false ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {u.isActive !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button onClick={() => handleResetPassword(u._id)} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-all active:scale-95 shadow-sm">
                          Reset Pass
                        </button>
                        <button 
                          onClick={(e) => handleImpersonate(u._id, e)}
                          disabled={impersonating || u.isActive === false}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-800 transition-all active:scale-95 shadow-sm disabled:opacity-50"
                        >
                          <LogIn size={12} /> Log In As
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 py-2">You (Active)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        ) : (
        <>
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Registered Properties</h2>
            <p className="text-xs text-gray-500 font-medium mt-1">List of all unique hotels/hostels in the system.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Property Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Address</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {hostels.map(h => (
                <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                        <Building size={20} />
                      </div>
                      <p className="font-bold text-gray-900">{h.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold text-gray-500 max-w-[200px] truncate">{h.address}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{h.owner?.name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{h.owner?.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg bg-green-100 text-green-700">Active</span>
                  </td>
                </tr>
              ))}
              {hostels.length === 0 && (
                <tr><td colSpan="4" className="text-center py-8 text-gray-500 font-bold">No properties found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
