import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { 
  X, Globe, Calendar, Mail, CheckCircle2, Copy, RefreshCw, 
  ExternalLink, AlertTriangle, ShieldCheck, Play, ArrowRight, 
  Layers, Check, Sparkles, MessageCircle, Info
} from 'lucide-react';
import { useToast } from './ui/Toast';

const OtaSyncModal = ({ hostel, isOpen, onClose }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('ical'); // 'ical' | 'email' | 'mapping' | 'test'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polling, setPolling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const [otaData, setOtaData] = useState(null);
  const [config, setConfig] = useState({
    enabled: false,
    channels: [],
    roomMappings: [],
    autoWhatsAppWelcome: true,
    autoAssignRooms: true,
    secretToken: '',
    inboundEmailKey: '',
    logs: []
  });

  // Test Parser state
  const [testEmailText, setTestEmailText] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen && hostel?._id) {
      document.body.style.overflow = 'hidden';
      fetchOtaConfig();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, hostel?._id]);

  const fetchOtaConfig = async () => {
    try {
      setLoading(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.get(`${API}/api/ota/config?hostelId=${hostel._id}`);
      if (res.data?.data) {
        setOtaData(res.data.data);
        setConfig(res.data.data.config || {});
      }
    } catch (err) {
      console.error('Failed to load OTA config:', err);
      toast.error('Could not load OTA settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (overridePayload = null) => {
    try {
      setSaving(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const payload = overridePayload || {
        hostelId: hostel._id,
        enabled: config.enabled,
        channels: config.channels,
        roomMappings: config.roomMappings,
        autoWhatsAppWelcome: config.autoWhatsAppWelcome,
        autoAssignRooms: config.autoAssignRooms
      };

      const res = await axios.put(`${API}/api/ota/config?hostelId=${hostel._id}`, payload);
      if (res.data?.data) {
        setConfig(res.data.data);
        toast.success('OTA Settings saved successfully!');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.message || 'Failed to save OTA configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleChannel = (index) => {
    const updated = [...(config.channels || [])];
    updated[index].enabled = !updated[index].enabled;
    setConfig(prev => ({ ...prev, channels: updated }));
  };

  const handleChannelUrlChange = (index, url) => {
    const updated = [...(config.channels || [])];
    updated[index].externalIcalUrl = url;
    setConfig(prev => ({ ...prev, channels: updated }));
  };

  const handleAddMapping = () => {
    const defaultCat = otaData?.availableCategories?.[0] || 'Standard';
    const newMapping = {
      otaCategoryName: 'Deluxe Room',
      category: defaultCat,
      assignedRooms: []
    };
    setConfig(prev => ({
      ...prev,
      roomMappings: [...(prev.roomMappings || []), newMapping]
    }));
  };

  const handleRemoveMapping = (idx) => {
    const updated = [...(config.roomMappings || [])];
    updated.splice(idx, 1);
    setConfig(prev => ({ ...prev, roomMappings: updated }));
  };

  const handleMappingChange = (idx, field, value) => {
    const updated = [...(config.roomMappings || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setConfig(prev => ({ ...prev, roomMappings: updated }));
  };

  const handleCopyLink = (text, type = 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
    toast.success('Copied to clipboard!');
  };

  const handleSyncIncoming = async () => {
    try {
      setPolling(true);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/ota/sync-incoming?hostelId=${hostel._id}`);
      toast.success(res.data?.message || 'External OTA calendars synced!');
      fetchOtaConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sync failed');
    } finally {
      setPolling(false);
    }
  };

  const handleTestParse = async () => {
    if (!testEmailText.trim()) {
      toast.error('Please paste email text to test');
      return;
    }
    try {
      setTesting(true);
      setTestResult(null);
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.post(`${API}/api/ota/test-parse`, {
        emailText: testEmailText,
        subject: 'Hotel Booking Confirmation'
      });
      setTestResult(res.data?.data);
      toast.success('Email parsed successfully!');
    } catch (err) {
      toast.error('Failed to parse email');
    } finally {
      setTesting(false);
    }
  };

  const loadSampleEmail = (type) => {
    if (type === 'mmt') {
      setTestEmailText(`Booking ID: NH28492048291
Primary Guest: Amit Sharma
Contact: +91 9876543210
Check-in: 05 Dec 2026
Check-out: 07 Dec 2026
Room Type: Deluxe AC Room
Total Amount: INR 3,600.00
Payment Status: Prepaid Online
MakeMyTrip Hotel Booking Confirmation for Hotel Taj`);
    } else {
      setTestEmailText(`Booking.com New Reservation
Booking number: 3829104821
Guest name: Rohit Verma
Telephone: +91 9988776655
Check-in: 10 Dec 2026
Check-out: 12 Dec 2026
Accommodation: Standard Room
Total price: ₹ 2,800
Payment: Payments by Booking.com (Prepaid)`);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Globe size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  OTA Channel & Calendar Sync
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-[10px] font-black uppercase">
                  Zero Cost (₹0/mo)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                {hostel.name} &bull; MakeMyTrip, Booking.com, Goibibo, Agoda, Airbnb 2-Way Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Master Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
              <span className="text-[11px] font-bold text-slate-300 uppercase">
                {config.enabled ? 'Sync Active' : 'Sync Disabled'}
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.enabled)}
                  onChange={e => {
                    const newStatus = e.target.checked;
                    setConfig(prev => ({ ...prev, enabled: newStatus }));
                    handleSaveConfig({ ...config, enabled: newStatus, hostelId: hostel._id });
                  }}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto no-scrollbar gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('ical')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ical'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={15} /> iCal Calendar Sync (MakeMyTrip / OTAs)
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'email'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail size={15} /> Instant Email Webhook (Auto Booking)
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'mapping'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={15} /> Room Category Mapping ({config.roomMappings?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play size={15} /> Test Parser & Sync Logs
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
            </div>
          ) : activeTab === 'ical' ? (
            /* ─── TAB 1: iCAL EXPORT & IMPORT ─── */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Public iCal URL Box */}
              <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Calendar size={16} className="text-indigo-600" />
                    Your Hotel's Public iCal Feed URL (.ics)
                  </span>
                  <span className="text-[10px] bg-white border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded-md">
                    RFC 5545 Certified &bull; No Passwords Required
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={otaData?.publicIcalUrl || ''}
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopyLink(otaData?.publicIcalUrl || '')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLink ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>

                <p className="text-[11px] text-indigo-950 font-medium">
                  इस लिंक को MakeMyTrip (IngoMMT), Booking.com Extranet, या Airbnb के <b>"Calendar Sync / Import iCal"</b> में पेस्ट करें। जैसे ही आपके होटल में कोई कमरा बुक होगा, MakeMyTrip उस कमरे को ऑनलाइन ऑटोमैटिक बंद कर देगा!
                </p>
              </div>

              {/* Supported OTA Channels Setup Guide */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    OTA Channels & 2-Way Syncing
                  </h4>
                  <button
                    onClick={handleSyncIncoming}
                    disabled={polling}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={polling ? 'animate-spin' : ''} />
                    {polling ? 'Syncing...' : 'Poll External Calendars Now'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {(config.channels || []).map((ch, idx) => (
                    <div key={ch.name || idx} className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${ch.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          <span className="font-black text-sm text-slate-900">{ch.name}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(ch.enabled)}
                            onChange={() => handleToggleChannel(idx)}
                            className="sr-only peer"
                          />
                          <div className="w-7 h-3.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                          {ch.name} External iCal URL (Optional for 2-way import):
                        </label>
                        <input
                          type="url"
                          placeholder={`Paste ${ch.name} export calendar link...`}
                          value={ch.externalIcalUrl || ''}
                          onChange={e => handleChannelUrlChange(idx, e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-600"
                        />
                      </div>

                      {ch.lastSyncAt && (
                        <p className="text-[10px] text-slate-400 font-medium">
                          Last polled: {new Date(ch.lastSyncAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} &bull; Status: {ch.syncStatus}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions Banner */}
              <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700 space-y-2">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info size={14} className="text-slate-600" />
                  MakeMyTrip IngoMMT में iCal कैसे जोड़ें?
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] font-medium">
                  <li>अपने <b>ingommt.makemytrip.com</b> पोर्टल पर लॉगिन करें।</li>
                  <li><b>Rates & Inventory ➔ Calendar Sync</b> पर जाएँ।</li>
                  <li><b>"Add External Calendar"</b> पर क्लिक करें और ऊपर दिया गया iCal लिंक पेस्ट कर दें।</li>
                  <li>सेव करें। अब वॉक-इन गेस्ट आते ही MMT पर वो तारीखें अपने आप बंद हो जाएँगी!</li>
                </ol>
              </div>
            </div>
          ) : activeTab === 'email' ? (
            /* ─── TAB 2: INBOUND EMAIL WEBHOOK ─── */
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <Mail size={16} className="text-emerald-700" />
                    Dedicated Booking Forwarding Email Address
                  </span>
                  <span className="text-[10px] bg-white border border-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                    Instant 2-Second AI Parser
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={otaData?.inboundForwardingEmail || ''}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 select-all outline-none"
                  />
                  <button
                    onClick={() => handleCopyLink(otaData?.inboundForwardingEmail || '', 'email')}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    {copiedEmail ? <Check size={14} /> : <Copy size={14} />}
                    {copiedEmail ? 'Copied!' : 'Copy Email'}
                  </button>
                </div>

                <p className="text-[11px] text-emerald-950 font-medium">
                  अपने होटल के Gmail में एक साधारण ऑटो-फॉरवर्ड फ़िल्टर सेट करें: <b>MakeMyTrip, Goibibo और Booking.com</b> से आने वाले कन्फर्मेशन ईमेल इस ईमेल पर ऑटो-फॉरवर्ड हो जाएँ। सॉफ्टवेयर अपने आप गेस्ट का नाम, फोन नंबर और तारीखें निकालकर कमरा बुक कर देगा!
                </p>
              </div>

              {/* Automation Toggles */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Instant Automation Rules
                </h4>

                <div className="space-y-3 pt-1">
                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                        <MessageCircle size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Send Instant WhatsApp Welcome Card to Guest</p>
                        <p className="text-[11px] text-slate-500">MMT/Booking.com से बुकिंग आते ही गेस्ट के फोन पर होटल का वॉट्सऐप वेलकम व होटल लोकेशन चली जाएगी।</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(config.autoWhatsAppWelcome)}
                      onChange={e => setConfig(prev => ({ ...prev, autoWhatsAppWelcome: e.target.checked }))}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                        <Layers size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Auto-Assign Room in Category</p>
                        <p className="text-[11px] text-slate-500">बुक किए गए कमरे के टाइप (जैसे Deluxe) के अनुसार खाली कमरे को तुरंत ऑटोमैटिक रिजर्व कर लें।</p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(config.autoAssignRooms)}
                      onChange={e => setConfig(prev => ({ ...prev, autoAssignRooms: e.target.checked }))}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : activeTab === 'mapping' ? (
            /* ─── TAB 3: ROOM CATEGORY MAPPING ─── */
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Room Category & Inventory Pool Mapping
                  </h4>
                  <p className="text-xs text-slate-500">
                    MakeMyTrip पर जिस नाम से कमरा बिकता है, उसे अपने सॉफ्टवेयर के कमरा नंबरों से लिंक करें।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMapping}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  Add Room Mapping
                </button>
              </div>

              {(!config.roomMappings || config.roomMappings.length === 0) ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                  <Layers size={28} className="mx-auto text-slate-400" />
                  <p className="text-sm font-bold text-slate-700">No room mappings added yet</p>
                  <p className="text-xs text-slate-500">Click "Add Room Mapping" to link MMT room names with your rooms.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.roomMappings.map((map, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          OTA Room Name (e.g. MMT Title)
                        </label>
                        <input
                          type="text"
                          value={map.otaCategoryName || ''}
                          onChange={e => handleMappingChange(idx, 'otaCategoryName', e.target.value)}
                          placeholder="e.g. Deluxe AC Room"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          PMS Category
                        </label>
                        <select
                          value={map.category || 'Standard'}
                          onChange={e => handleMappingChange(idx, 'category', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-slate-900"
                        >
                          {(otaData?.availableCategories || ['Standard', 'Deluxe', 'Executive', 'Suite']).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center justify-end pt-4 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveMapping(idx)}
                          className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─── TAB 4: TEST PARSER & LIVE LOGS ─── */
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Test Parser Simulator */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Play size={15} className="text-indigo-600" /> Live Email Parser Simulator
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Paste any MakeMyTrip or Booking.com email text below to see live extraction.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadSampleEmail('mmt')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Sample MMT Email
                    </button>
                    <button
                      type="button"
                      onClick={() => loadSampleEmail('bcom')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      Sample Booking.com
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={testEmailText}
                  onChange={e => setTestEmailText(e.target.value)}
                  placeholder="Paste raw email body or voucher text here..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-900"
                ></textarea>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleTestParse}
                    disabled={testing}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Play size={13} className="text-indigo-400" />
                    {testing ? 'Parsing...' : 'Test Parse Email'}
                  </button>
                </div>

                {/* Parsed Result Box */}
                {testResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in">
                    <p className="text-xs font-black text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle2 size={16} className="text-emerald-600" /> Extracted Booking Data:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Channel</span>
                        <strong className="text-slate-900">{testResult.channel}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Booking #</span>
                        <strong className="font-mono text-slate-900">{testResult.bookingNumber}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Guest Name</span>
                        <strong className="text-slate-900">{testResult.guestName}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Mobile Number</span>
                        <strong className="text-slate-900">{testResult.guestPhone || 'N/A'}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Check-In</span>
                        <strong className="text-slate-900">{testResult.checkInDate ? new Date(testResult.checkInDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Check-Out</span>
                        <strong className="text-slate-900">{testResult.checkOutDate ? new Date(testResult.checkOutDate).toLocaleDateString() : 'N/A'}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Room Type</span>
                        <strong className="text-slate-900">{testResult.roomCategory}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-emerald-100">
                        <span className="text-[10px] text-slate-400 block uppercase">Total Amount</span>
                        <strong className="text-emerald-700">₹{testResult.totalAmount} ({testResult.paymentStatus})</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sync Audit Logs */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Recent Sync & Webhook Audit History
                </h4>

                {(!config.logs || config.logs.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No sync activity recorded yet.</p>
                ) : (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                    {config.logs.map((log, idx) => (
                      <div key={idx} className="p-3 text-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            log.status === 'success' ? 'bg-emerald-500' :
                            log.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                          }`}></span>
                          <div className="truncate">
                            <span className="font-bold text-slate-900">{log.source}: </span>
                            <span className="text-slate-600">{log.message}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-slate-500">
            {config.enabled ? '🟢 OTA 2-Way Sync is ON' : '⚪ OTA Sync is currently paused'}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => handleSaveConfig()}
              disabled={saving}
              className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default OtaSyncModal;
