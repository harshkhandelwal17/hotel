import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowRight, Hexagon, ShieldCheck } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      const role = res?.data?.role || res?.role || res?.data?.user?.role;
      if (role === 'superadmin') {
         navigate('/superadmin');
      } else if (role === 'sales') {
         navigate('/sales');
      } else {
         navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-950 flex-col justify-between p-14 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo.png" alt="NXHotel Logo" className="w-11 h-11 rounded-2xl object-contain bg-white shadow-md p-1 shrink-0" />
          <div className="text-white text-2xl font-extrabold tracking-tight">NX<span className="text-emerald-400">Hotel</span></div>
        </div>
        
        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-1.5 bg-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/10 mb-8 backdrop-blur-xs">
            <ShieldCheck size={13} className="text-emerald-400" /> Hotel Management OS
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-[1.15] mb-6 tracking-tight">
            Run your hotel operations with clarity.
          </h1>
          <p className="text-slate-400 text-base font-medium leading-relaxed">
            Fast check-ins, guest khata passbook, automated billing, and live occupancy across all your properties.
          </p>
        </div>
        
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-slate-800">
          {[
            { stat: '< 30s', label: 'Check-in time' },
            { stat: '1-Click', label: 'WhatsApp bills' },
            { stat: '100%', label: 'Cloud synced' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-white text-xl font-black font-mono">{stat}</div>
              <div className="text-slate-400 text-xs font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="NXHotel Logo" className="w-9 h-9 rounded-xl object-contain bg-white shadow-xs p-0.5 border border-slate-100 shrink-0" />
            <div className="text-slate-950 text-xl font-extrabold tracking-tight">
              NX<span className="text-emerald-600">Hotel</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1.5 font-medium">Enter your credentials to access your hotel panel</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200/60 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address / Username</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-sm text-slate-900 placeholder-slate-300 shadow-2xs"
                placeholder="you@hotel.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-semibold text-sm text-slate-900 placeholder-slate-300 shadow-2xs"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-xs disabled:opacity-50 mt-2 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
              ) : (
                <>Enter Portal <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-10 font-medium">
            NXHotel Enterprise SaaS • Secure Access
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
