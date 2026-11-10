import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  X, 
  UserPlus, 
  LogOut, 
  BedDouble, 
  Receipt, 
  BarChart3, 
  Shirt, 
  Users, 
  ShieldCheck, 
  Keyboard, 
  User, 
  ArrowRight, 
  Command, 
  Sparkles,
  Phone,
  Bed,
  CreditCard,
  Globe
} from 'lucide-react';
import { apiCache } from '../../utils/apiCache';
import { useLanguage } from '../../context/LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

export default function CommandPalette({
  isOpen,
  onClose,
  onOpenPoliceReport,
  onOpenShortcuts,
  user,
  globalProperty = 'all'
}) {
  const { toggleLanguage, isHindi } = useLanguage();
  const [query, setQuery] = useState('');
  const [guestResults, setGuestResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const listRef = useRef(null);

  const isMac = typeof window !== 'undefined' && navigator.platform?.toUpperCase().indexOf('MAC') >= 0;

  // Base navigation actions
  const allActions = useMemo(() => [
    {
      id: 'action-checkin',
      type: 'action',
      title: 'New Guest Check-In',
      subtitle: 'Scan ID, Aadhaar QR, or instant mobile entry',
      icon: UserPlus,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      hotkey: 'N',
      keywords: ['checkin', 'new', 'guest', 'aadhaar', 'entry', 'book'],
      perform: () => navigate('/checkin')
    },
    {
      id: 'action-checkouts',
      type: 'action',
      title: 'Checkouts & Vacate',
      subtitle: 'View departures, settle pending balance, and print invoices',
      icon: LogOut,
      color: 'bg-rose-50 text-rose-600 border-rose-100',
      hotkey: 'O',
      keywords: ['checkout', 'vacate', 'leave', 'bill', 'depart'],
      perform: () => navigate('/checkouts')
    },
    {
      id: 'action-rooms',
      type: 'action',
      title: 'Rooms Live Grid',
      subtitle: 'Real-time room occupancy, dirty/clean status, and maintenance',
      icon: BedDouble,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      hotkey: 'R',
      keywords: ['rooms', 'bed', 'available', 'occupied', 'clean', 'dirty'],
      perform: () => navigate('/rooms')
    },
    {
      id: 'action-payments',
      type: 'action',
      title: 'Payments & Cash Drawer',
      subtitle: 'Physical cash in hand, UPI, card, and digital transactions',
      icon: CreditCard,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      hotkey: 'P',
      keywords: ['payment', 'cash', 'drawer', 'upi', 'money', 'collection'],
      perform: () => navigate('/payments')
    },
    {
      id: 'action-reports',
      type: 'action',
      title: 'Financial Reports & Daily Expenses',
      subtitle: 'Profit & loss, drawer reconciliation, and shift handover tally',
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600 border-purple-100',
      hotkey: 'F',
      keywords: ['report', 'finance', 'expense', 'profit', 'revenue', 'tally', 'shift'],
      perform: () => navigate('/admin/reports')
    },
    {
      id: 'action-laundry',
      type: 'action',
      title: 'Laundry & Linen Management',
      subtitle: 'Track dhobi challans, missing items, and vendor payments',
      icon: Shirt,
      color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      hotkey: 'L',
      keywords: ['laundry', 'linen', 'dhobi', 'wash', 'challan'],
      perform: () => navigate('/laundry')
    },
    {
      id: 'action-guests',
      type: 'action',
      title: 'Guest Directory & Khata',
      subtitle: 'All guest history, credit accounts, and advance balance',
      icon: Users,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      hotkey: 'G',
      keywords: ['guest', 'directory', 'khata', 'credit', 'advance', 'phone'],
      perform: () => navigate('/guests')
    },
    {
      id: 'action-police',
      type: 'action',
      title: 'Police Verification Report',
      subtitle: 'Official hotel guest register for local law enforcement',
      icon: ShieldCheck,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      hotkey: 'H',
      keywords: ['police', 'verification', 'form', 'law', 'register'],
      perform: () => {
        if (onOpenPoliceReport) onOpenPoliceReport();
      }
    },
    {
      id: 'action-shortcuts',
      type: 'action',
      title: 'Keyboard Shortcuts Guide',
      subtitle: 'View all quick keys and counter shortcuts',
      icon: Keyboard,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      hotkey: '?',
      keywords: ['shortcuts', 'help', 'keys', 'cheat', 'commands'],
      perform: () => {
        if (onOpenShortcuts) onOpenShortcuts();
      }
    },
    {
      id: 'action-language',
      type: 'action',
      title: isHindi ? 'Switch to English (अंग्रेज़ी)' : 'हिंदी भाषा में बदलें (Switch to Hindi)',
      subtitle: isHindi ? 'Change display language to English' : 'पूरे सॉफ्टवेयर की भाषा हिंदी करें',
      icon: Globe,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      keywords: ['language', 'hindi', 'english', 'bhasha', 'translate', 'हिंदी', 'भाषा'],
      perform: () => toggleLanguage()
    }
  ], [navigate, onOpenPoliceReport, onOpenShortcuts, isHindi, toggleLanguage]);

  // Filter actions by query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allActions;
    return allActions.filter(a => 
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.keywords.some(k => k.includes(q))
    );
  }, [allActions, query]);

  // Search active stays cached locally
  const matchingActiveStays = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const cachedStays = apiCache.get(`stays_active_${globalProperty}`) || [];
    return cachedStays.filter(s => {
      const rNum = String(s.room?.roomNumber || '').toLowerCase();
      const gName = String(s.guest?.fullName || '').toLowerCase();
      const bNum = String(s.bookingNumber || '').toLowerCase();
      const phone = String(s.guest?.mobileNumber || '');
      return rNum.includes(q) || gName.includes(q) || bNum.includes(q) || phone.includes(q);
    }).slice(0, 4);
  }, [query, globalProperty]);

  // Debounced API search for guests
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setGuestResults([]);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/api/guests?search=${encodeURIComponent(q)}&limit=5`);
        if (isMounted && res.data?.data) {
          setGuestResults(res.data.data);
        }
      } catch (_) {
        if (isMounted) setGuestResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Reset index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, guestResults, matchingActiveStays]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setGuestResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Compile full flattened list for keyboard arrow navigation
  const flatItems = useMemo(() => {
    const items = [];

    // 1. Actions
    filteredActions.forEach(a => {
      items.push({
        type: 'action',
        id: a.id,
        raw: a,
        execute: () => {
          onClose();
          a.perform();
        }
      });
    });

    // 2. Active Stays
    matchingActiveStays.forEach(s => {
      items.push({
        type: 'stay',
        id: `stay-${s._id}`,
        raw: s,
        execute: () => {
          onClose();
          navigate('/checkouts');
        }
      });
    });

    // 3. Guests
    guestResults.forEach(g => {
      items.push({
        type: 'guest',
        id: `guest-${g._id}`,
        raw: g,
        execute: () => {
          onClose();
          navigate(`/guests/${g._id}`);
        }
      });
    });

    return items;
  }, [filteredActions, matchingActiveStays, guestResults, onClose, navigate]);

  // Keyboard navigation within command palette
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (flatItems.length || 1)) % (flatItems.length || 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const current = flatItems[selectedIndex];
      if (current) {
        current.execute();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[8vh] sm:pt-[12vh] p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Top Search Input */}
        <div className="relative border-b border-gray-100 px-5 py-4 flex items-center gap-3 bg-gray-50/50">
          <Search className="text-gray-400 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, guest name, phone, or room number..."
            className="w-full bg-transparent text-sm sm:text-base font-bold text-gray-900 placeholder-gray-400 outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition-colors"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-mono font-black text-gray-400 shadow-2xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results & Actions List */}
        <div ref={listRef} className="overflow-y-auto p-3 space-y-4 max-h-[60vh] custom-scrollbar">
          {/* Section 1: Active Stays / In-House Bookings */}
          {matchingActiveStays.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3">
                Current In-House Stays ({matchingActiveStays.length})
              </p>
              <div className="space-y-1">
                {matchingActiveStays.map((stay) => {
                  const globalIdx = flatItems.findIndex(item => item.id === `stay-${stay._id}`);
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <div
                      key={stay._id}
                      onClick={() => {
                        onClose();
                        navigate('/checkouts');
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected ? 'bg-black text-white shadow-md' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          <Bed size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs">Room {stay.room?.roomNumber || 'N/A'}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {stay.bookingNumber ? `#${stay.bookingNumber}` : 'In-House'}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate font-medium ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                            {stay.guest?.fullName} • {stay.guest?.mobileNumber}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={14} className={isSelected ? 'text-white' : 'text-gray-300'} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Guest Database Matches */}
          {guestResults.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3">
                Guest Profiles ({guestResults.length})
              </p>
              <div className="space-y-1">
                {guestResults.map((guest) => {
                  const globalIdx = flatItems.findIndex(item => item.id === `guest-${guest._id}`);
                  const isSelected = selectedIndex === globalIdx;
                  return (
                    <div
                      key={guest._id}
                      onClick={() => {
                        onClose();
                        navigate(`/guests/${guest._id}`);
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected ? 'bg-black text-white shadow-md' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          <User size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs truncate">{guest.fullName}</p>
                          <p className={`text-[11px] truncate font-medium ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                            +{guest.mobileNumber} {guest.idProofNumber ? `• ID: ${guest.idProofNumber}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        View Profile ➔
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 3: Navigation & Fast Actions */}
          {filteredActions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3">
                {query ? 'Matching Quick Actions' : 'Fast Counter Actions'}
              </p>
              <div className="space-y-1">
                {filteredActions.map((action) => {
                  const globalIdx = flatItems.findIndex(item => item.id === action.id);
                  const isSelected = selectedIndex === globalIdx;
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        onClose();
                        action.perform();
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                        isSelected ? 'bg-black text-white shadow-md' : 'hover:bg-gray-50 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 border ${
                          isSelected ? 'bg-white/20 text-white border-transparent' : action.color
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-xs truncate">{action.title}</p>
                          <p className={`text-[11px] truncate font-medium ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                            {action.subtitle}
                          </p>
                        </div>
                      </div>
                      {action.hotkey && (
                        <kbd className={`px-2 py-1 rounded-lg text-[10px] font-mono font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {action.hotkey}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {flatItems.length === 0 && !loading && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm font-black text-gray-700">No matching commands or guests</p>
              <p className="text-xs text-gray-400">
                Try searching by guest name, 10-digit mobile, room number, or press ESC to dismiss.
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-2xs">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-2xs">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-mono shadow-2xs">ESC</kbd> Close
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              if (onOpenShortcuts) onOpenShortcuts();
            }}
            className="text-gray-600 hover:text-black underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <Keyboard size={13} />
            <span>All Shortcuts (?)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
