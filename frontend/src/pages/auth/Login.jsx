import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

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
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F9FAFB]">
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-14 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full" />
        
        <div className="relative z-10">
          <div className="text-white text-2xl font-black tracking-tight">NX<span className="text-gray-500">Hotel</span></div>
        </div>
        
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/80 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full border border-white/10 mb-8">
            ✦ Hotel Management OS
          </div>
          <h1 className="text-5xl font-black text-white leading-[1.1] mb-6">
            Run your hotel<br />like a pro.
          </h1>
          <p className="text-gray-400 text-lg font-medium leading-relaxed">
            Fast check-ins. Smart billing.<br />Real-time visibility. All in one.
          </p>
        </div>
        
        <div className="relative z-10 grid grid-cols-3 gap-8">
          {[
            { stat: '< 30s', label: 'Check-in time' },
            { stat: '24/7', label: 'Front desk ready' },
            { stat: '100%', label: 'Web-based' },
          ].map(({ stat, label }) => (
            <div key={label}>
              <div className="text-white text-2xl font-black">{stat}</div>
              <div className="text-gray-500 text-sm font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          
          {/* Mobile Logo */}
          <div className="text-black text-xl font-black tracking-tight mb-8 lg:hidden">
            NX<span className="text-gray-400">Hotel</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 mt-2 font-medium">Sign in to your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-2">
              <span className="text-base">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:ring-0 focus:border-black outline-none transition-all font-bold text-gray-900 placeholder-gray-300"
                placeholder="you@hotel.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-4 pr-12 bg-white border-2 border-gray-200 rounded-2xl focus:ring-0 focus:border-black outline-none transition-all font-bold text-gray-900 placeholder-gray-300"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-gray-800 transition-all shadow-lg shadow-black/20 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-10 font-medium">
            NXHotel Management System • Secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
