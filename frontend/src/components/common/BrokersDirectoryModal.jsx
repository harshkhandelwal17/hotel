import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { X, Search, Phone, MessageSquare, Car, DollarSign, Calendar, Users, ChevronRight, Download, RefreshCw, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const BrokersDirectoryModal = ({ isOpen, onClose, defaultHostel = 'all', onSelectBroker }) => {
  const { t, isHindi } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalBrokers: 0, totalCommissionPaid: 0, totalBookingsReferred: 0, brokers: [] });
  const [search, setSearch] = useState('');
  const [selectedBroker, setSelectedBroker] = useState(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      fetchBrokers();
    } else {
      document.body.style.overflow = 'unset';
      setSelectedBroker(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, defaultHostel]);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const propQuery = defaultHostel && defaultHostel !== 'all' ? `?hostel=${defaultHostel}` : '';
      const res = await axios.get(`${API}/api/stays/brokers/summary${propQuery}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredBrokers = (data.brokers || []).filter(b => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });

  const exportCSV = () => {
    const headers = ['Broker / Driver Name', 'Mobile Number', 'Total Bookings', 'Total Commission (INR)', 'Total Hotel Revenue (INR)', 'Last Active Date'];
    const rows = filteredBrokers.map(b => [
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.phone || 'N/A'}"`,
      b.totalStays,
      b.totalCommission,
      b.totalRevenue,
      b.lastActive ? format(new Date(b.lastActive), 'dd MMM yyyy') : 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brokers_commission_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gray-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
              <Car size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
                  {isHindi ? 'दलाल व ऑटो चालक डायरेक्टरी' : 'Brokers & Auto Drivers Directory'}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full">
                  {data.totalBrokers} {isHindi ? 'दर्ज' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {isHindi ? 'सभी ऑटो वाले, ट्रैवल एजेंट व दलालों के फोन नंबर और कमीशन का संपूर्ण रिकॉर्ड' : 'Directory of all referral agents, auto drivers, contact numbers & commission logs'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredBrokers.length === 0}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              title="Export Brokers to CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={fetchBrokers}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 bg-gray-50/80 border-b border-gray-100 shrink-0">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Users size={12} className="text-indigo-600" />
              <span>{isHindi ? 'कुल दलाल / एजेंट्स' : 'Total Brokers'}</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-gray-950 mt-1">{data.totalBrokers}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Car size={12} className="text-blue-600" />
              <span>{isHindi ? 'कुल लाए गए मेहमान' : 'Bookings Referred'}</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-gray-950 mt-1">{data.totalBookingsReferred}</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <DollarSign size={12} className="text-amber-600" />
              <span>{isHindi ? 'कुल दिया गया कमीशन' : 'Total Commission'}</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1">₹{data.totalCommissionPaid.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3.5 sm:p-4 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isHindi ? "दलाल का नाम या मोबाइल नंबर खोजें..." : "Search by broker name, auto driver name or mobile number..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black transition-all"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-3 py-2 text-xs font-bold text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="p-12 text-center text-gray-400 font-bold text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Loading brokers directory...</span>
            </div>
          ) : filteredBrokers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Car size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-sm font-bold text-gray-600">
                {search ? (isHindi ? 'कोई दलाल या नंबर नहीं मिला' : 'No matching broker found') : (isHindi ? 'अभी तक कोई दलाल या कमीशन रिकॉर्ड नहीं है' : 'No brokers recorded yet')}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isHindi ? 'चेक-इन करते समय Auto / Broker का नाम व नंबर भरें।' : 'Enter Broker Name & Phone during guest check-in to track them here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredBrokers.map((b, idx) => {
                const cleanPhone = b.phone ? b.phone.replace(/\D/g, '').slice(-10) : '';
                return (
                  <div 
                    key={idx}
                    className="p-4 bg-white rounded-2xl border border-gray-200/90 shadow-2xs hover:border-gray-400 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Name & Commission Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-black text-gray-950 truncate flex items-center gap-1.5">
                            <span>{b.name}</span>
                          </h3>
                          <p className="text-[11px] font-bold text-gray-500 mt-0.5 flex items-center gap-2">
                            <span>{b.totalStays} {b.totalStays > 1 ? 'Bookings' : 'Booking'} Referred</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">₹{b.totalRevenue.toLocaleString('en-IN')} Room Sales</span>
                          </p>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs shrink-0">
                          ₹{b.totalCommission.toLocaleString('en-IN')} Comm
                        </span>
                      </div>

                      {/* Phone & Direct Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {b.phone ? (
                            <span className="text-xs font-mono font-bold text-gray-800 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/80">
                              📞 {b.phone}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 italic">
                              No phone recorded
                            </span>
                          )}
                        </div>

                        {/* 1-Click Call & WhatsApp Buttons */}
                        <div className="flex items-center gap-1.5">
                          {cleanPhone && (
                            <>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title={`Call ${b.name} (${cleanPhone})`}
                              >
                                <Phone size={12} />
                                <span>Call</span>
                              </a>
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title={`Message ${b.name} on WhatsApp`}
                              >
                                <MessageSquare size={12} />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          )}

                          {onSelectBroker && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectBroker(b);
                                onClose();
                              }}
                              className="px-2.5 py-1 bg-black text-white hover:bg-gray-800 rounded-lg text-xs font-bold transition-all cursor-pointer"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent Referred Stays */}
                    {b.recentStays && b.recentStays.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-50 text-[10px] text-gray-500">
                        <span className="font-bold text-gray-400 uppercase tracking-wider block mb-1">
                          Recent:
                        </span>
                        <div className="space-y-0.5">
                          {b.recentStays.slice(0, 2).map((s, sIdx) => (
                            <div key={sIdx} className="flex justify-between items-center text-gray-600">
                              <span className="truncate max-w-[170px]">
                                Room {s.roomNumber} ({s.guestName})
                              </span>
                              <span className="font-bold text-gray-900 font-mono">
                                ₹{s.commission}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500 shrink-0">
          <span>{isHindi ? `कुल ${filteredBrokers.length} दलाल दिखाए जा रहे हैं` : `Showing ${filteredBrokers.length} of ${data.totalBrokers} brokers`}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-sm transition-all cursor-pointer"
          >
            {isHindi ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BrokersDirectoryModal;
