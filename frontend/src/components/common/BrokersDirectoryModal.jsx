import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  X, Search, Phone, MessageSquare, Car, DollarSign, 
  Users, Download, RefreshCw, Building2, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '../../context/LanguageContext';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const BrokersDirectoryModal = ({ 
  isOpen, 
  onClose, 
  defaultHostel = 'all', 
  hostels = [], 
  onSelectBroker 
}) => {
  const { t, isHindi } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ totalBrokers: 0, totalCommissionPaid: 0, totalBookingsReferred: 0, brokers: [] });
  const [search, setSearch] = useState('');
  const [selectedHostel, setSelectedHostel] = useState(defaultHostel || 'all');
  const [propertyList, setPropertyList] = useState(hostels || []);

  // Update selectedHostel when defaultHostel changes or modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const initial = defaultHostel && defaultHostel !== 'undefined' ? defaultHostel : 'all';
      setSelectedHostel(initial);
      fetchBrokers(initial);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, defaultHostel]);

  // Fetch hostels list for property tabs if not already provided
  useEffect(() => {
    if (hostels && hostels.length > 0) {
      setPropertyList(hostels);
    } else if (isOpen) {
      axios.get(`${API}/api/hostels`)
        .then(res => {
          if (res.data?.data) {
            setPropertyList(res.data.data);
          }
        })
        .catch(() => {});
    }
  }, [hostels, isOpen]);

  const fetchBrokers = async (hostelId = selectedHostel) => {
    setLoading(true);
    try {
      const propQuery = hostelId && hostelId !== 'all' ? `?hostel=${hostelId}` : '';
      const res = await axios.get(`${API}/api/stays/brokers/summary${propQuery}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (hId) => {
    setSelectedHostel(hId);
    fetchBrokers(hId);
  };

  if (!isOpen) return null;

  const filteredBrokers = (data.brokers || []).filter(b => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      (b.hostelNames && b.hostelNames.some(hn => hn.toLowerCase().includes(q)))
    );
  });

  const exportCSV = () => {
    const headers = ['Broker / Driver Name', 'Mobile Number', 'Properties', 'Total Bookings', 'Total Commission (INR)', 'Total Hotel Revenue (INR)', 'Last Active Date'];
    const rows = filteredBrokers.map(b => [
      `"${b.name.replace(/"/g, '""')}"`,
      `"${b.phone || 'N/A'}"`,
      `"${(b.hostelNames || []).join('; ') || 'All'}"`,
      b.totalStays,
      b.totalCommission,
      b.totalRevenue,
      b.lastActive ? format(new Date(b.lastActive), 'dd MMM yyyy') : 'N/A'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `brokers_directory_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeHostelObj = propertyList.find(p => p._id === selectedHostel);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gray-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <Car size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight truncate">
                  {isHindi ? 'दलाल व ऑटो डायरेक्टरी' : 'Brokers & Auto Directory'}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950 px-2 py-0.5 rounded-full shrink-0">
                  {data.totalBrokers || 0} {isHindi ? 'दर्ज' : 'Active'}
                </span>
                {activeHostelObj && (
                  <span className="text-[10px] font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded-full truncate max-w-[160px]">
                    🏨 {activeHostelObj.name}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">
                {isHindi ? 'ऑटो वाले, ट्रैवल एजेंट व दलालों के फोन नंबर और कमीशन का सटीक रिकॉर्ड' : 'Verified contact numbers & commission logs for referral agents & auto drivers'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={exportCSV}
              disabled={filteredBrokers.length === 0}
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
              title="Export to CSV"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fetchBrokers()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Refresh"
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

        {/* Property Selector Tabs (Filter strictly by hotel so brokers from different properties never get mixed up!) */}
        {propertyList.length > 1 && (
          <div className="px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1 shrink-0 flex items-center gap-1">
              <Building2 size={12} className="text-amber-400" />
              <span>{isHindi ? 'प्रॉपर्टी:' : 'Property:'}</span>
            </span>
            <button
              type="button"
              onClick={() => handlePropertyChange('all')}
              className={`px-3 py-1 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedHostel === 'all'
                  ? 'bg-amber-400 text-gray-950 shadow-sm'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {isHindi ? 'सभी प्रॉपर्टी (All)' : 'All Properties'}
            </button>
            {propertyList.map((h) => {
              const isSelected = selectedHostel === h._id;
              return (
                <button
                  key={h._id}
                  type="button"
                  onClick={() => handlePropertyChange(h._id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  <span>🏨</span>
                  <span className="truncate max-w-[140px]">{h.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-3 gap-2.5 p-3.5 sm:p-4 bg-gray-50/90 border-b border-gray-100 shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Users size={12} className="text-indigo-600" />
              <span>{isHindi ? 'कुल दलाल' : 'Brokers'}</span>
            </span>
            <p className="text-lg sm:text-xl font-black text-gray-950 mt-0.5">{data.totalBrokers || 0}</p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <Car size={12} className="text-blue-600" />
              <span>{isHindi ? 'लाए गए कमरे' : 'Referred'}</span>
            </span>
            <p className="text-lg sm:text-xl font-black text-gray-950 mt-0.5">{data.totalBookingsReferred || 0}</p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
              <DollarSign size={12} className="text-amber-600" />
              <span>{isHindi ? 'कुल कमीशन' : 'Commission'}</span>
            </span>
            <p className="text-lg sm:text-xl font-black text-amber-600 mt-0.5">₹{(data.totalCommissionPaid || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 bg-white border-b border-gray-100 flex items-center gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={isHindi ? "दलाल का नाम या मोबाइल नंबर खोजें..." : "Search by broker name, driver name or mobile number..."}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-black transition-all"
            />
          </div>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5">
          {loading ? (
            <div className="p-12 text-center text-gray-400 font-bold text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              <span>Loading brokers directory...</span>
            </div>
          ) : filteredBrokers.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <Car size={36} className="mx-auto mb-2 opacity-30 text-gray-400" />
              <p className="text-sm font-bold text-gray-700">
                {search 
                  ? (isHindi ? 'कोई दलाल या नंबर नहीं मिला' : 'No matching broker found') 
                  : (isHindi ? 'इस प्रॉपर्टी के लिए अभी तक कोई दलाल दर्ज नहीं है' : 'No brokers recorded yet for this property')}
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {isHindi ? 'चेक-इन करते समय Auto / Broker का नाम व नंबर भरें।' : 'Enter Broker Name & Phone during guest check-in to track them here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBrokers.map((b, idx) => {
                const cleanPhone = b.phone ? b.phone.replace(/\D/g, '').slice(-10) : '';
                return (
                  <div 
                    key={idx}
                    className="p-3.5 bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-gray-300 hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Name & Commission Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-gray-950 truncate flex items-center gap-1.5">
                            <span>{b.name}</span>
                          </h3>
                          <p className="text-[11px] font-bold text-gray-500 mt-0.5 flex items-center gap-2">
                            <span>{b.totalStays} {b.totalStays > 1 ? 'Bookings' : 'Booking'}</span>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">₹{b.totalRevenue.toLocaleString('en-IN')} Sales</span>
                          </p>

                          {/* Property Badges (Visible so user knows which hotel this broker works with) */}
                          {b.hostelNames && b.hostelNames.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {b.hostelNames.map((hName, hIdx) => (
                                <span 
                                  key={hIdx} 
                                  className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                                >
                                  🏨 {hName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <span className="px-2 py-0.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs shrink-0">
                          ₹{b.totalCommission.toLocaleString('en-IN')} Comm
                        </span>
                      </div>

                      {/* Phone & Direct Action Buttons */}
                      <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {b.phone ? (
                            <span className="text-xs font-mono font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200">
                              📞 {b.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">
                              No phone
                            </span>
                          )}
                        </div>

                        {/* 1-Click Call, WhatsApp & Select */}
                        <div className="flex items-center gap-1.5">
                          {cleanPhone && (
                            <>
                              <a
                                href={`tel:${cleanPhone}`}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                                title={`Call ${b.name}`}
                              >
                                <Phone size={11} />
                                <span>Call</span>
                              </a>
                              <a
                                href={`https://wa.me/91${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                                title={`WhatsApp ${b.name}`}
                              >
                                <MessageSquare size={11} />
                                <span>WA</span>
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
                      <div className="mt-2.5 pt-2 border-t border-gray-50 text-[10px] text-gray-500">
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
        <div className="p-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500 shrink-0">
          <span>{isHindi ? `कुल ${filteredBrokers.length} दलाल दिखाए जा रहे हैं` : `Showing ${filteredBrokers.length} of ${data.totalBrokers || 0} brokers`}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white rounded-xl font-black uppercase tracking-wider text-xs shadow-sm transition-all cursor-pointer"
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
