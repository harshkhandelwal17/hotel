import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';
import { 
  BookOpen, Calendar, Plus, RefreshCw, Printer, Download, 
  Edit3, Trash2, ChevronLeft, ChevronRight, Check, X, 
  Wallet, Building, CornerDownLeft, Sparkles, Eye, FileText, Lock
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { printDailyRegister, exportDailyRegisterToCSV } from '../../utils/dailyRegisterPrint';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

// Helper for today's date in YYYY-MM-DD (IST safe)
function getTodayDateString() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  return istDate.toISOString().split('T')[0];
}

export default function DailyRegister() {
  const { user } = useAuth();
  const toast = useToast();

  const [currentDate, setCurrentDate] = useState(getTodayDateString());
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState('');
  const [registerData, setRegisterData] = useState(null);
  const [summary, setSummary] = useState(null);

  // Modals & Popups
  const [openingBalModalOpen, setOpeningBalModalOpen] = useState(false);
  const [mantrasModalOpen, setMantrasModalOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [tempOpeningBal, setTempOpeningBal] = useState('');
  const [tempMantras, setTempMantras] = useState({ left: 'जय श्री श्याम', center: 'श्री गणेशाय नम:', right: 'सीता राम' });

  // ⚡ SUPER-FAST INLINE QUICK ENTRY FORM (ZERO POPUPS NEEDED FOR 20+ ENTRIES)
  const [quickRow, setQuickRow] = useState({
    roomNo: '',
    bid: '',
    guestName: '',
    cashAmount: '',
    cardAmount: '',
    onlineAmount: '',
    foodCashAmount: '',
    expenseTitle: '',
    expenseAmount: '',
    expenseCategory: 'General',
    paymentMode: 'Cash'
  });

  const roomInputRef = useRef(null);

  const activeHostelId = useMemo(() => {
    if (!selectedHostel) return '';
    if (typeof selectedHostel === 'object') return selectedHostel._id || '';
    return String(selectedHostel);
  }, [selectedHostel]);

  // Fetch Hostels for property selector
  useEffect(() => {
    axios.get(`${API}/api/hostels`)
      .then(res => {
        const list = res.data?.data || [];
        setHostels(list);
        if (list.length > 0) {
          const userH = user?.assignedHostel;
          const userHostelId = typeof userH === 'object' ? userH?._id : userH;
          const defaultH = (userHostelId && list.some(h => h._id === userHostelId)) ? userHostelId : list[0]._id;
          setSelectedHostel(defaultH);
        }
      })
      .catch(() => {});
  }, [user]);

  // Fetch Daily Register
  const fetchRegister = async (date = currentDate, hostelId = activeHostelId) => {
    const cleanId = typeof hostelId === 'object' ? hostelId?._id : hostelId;
    if (!cleanId || cleanId === '[object Object]') return;
    setLoading(true);
    setIsAccessDenied(false);
    try {
      const res = await axios.get(`${API}/api/daily-register?hostel=${cleanId}&date=${date}`);
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        setTempMantras({
          left: res.data.data.headerMantraLeft || 'जय श्री श्याम',
          center: res.data.data.headerMantraCenter || 'श्री गणेशाय नम:',
          right: res.data.data.headerMantraRight || 'सीता राम'
        });
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setIsAccessDenied(true);
        setAccessDeniedMessage(err.response?.data?.message || 'Daily Register (रोकड़ बही) module is disabled for this property. Only Super Admin can activate it.');
      } else {
        toast({ message: 'Failed to load daily register: ' + (err.response?.data?.message || err.message), type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeHostelId && activeHostelId !== '[object Object]') {
      fetchRegister(currentDate, activeHostelId);
    }
  }, [currentDate, activeHostelId]);

  // Date Navigation
  const handlePrevDay = () => {
    const cur = new Date(currentDate + 'T12:00:00Z');
    setCurrentDate(subDays(cur, 1).toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(currentDate + 'T12:00:00Z');
    setCurrentDate(addDays(cur, 1).toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setCurrentDate(getTodayDateString());
  };

  // Sync System Stays & Expenses into Register
  const handleSyncSystem = async () => {
    if (!activeHostelId) return;
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/api/daily-register/sync`, {
        hostel: activeHostelId,
        date: currentDate
      });
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        toast({ message: res.data.message || 'Auto-synced stays & expenses successfully!', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Sync failed: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  // Save Opening Balance
  const handleSaveOpeningBal = async () => {
    if (!activeHostelId) return;
    try {
      const res = await axios.put(`${API}/api/daily-register/opening-balance`, {
        hostel: activeHostelId,
        date: currentDate,
        openingBalance: Number(tempOpeningBal) || 0
      });
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        setOpeningBalModalOpen(false);
        toast({ message: 'Opening balance updated!', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Failed to update opening balance', type: 'error' });
    }
  };

  // Save Header Mantras
  const handleSaveMantras = async () => {
    if (!activeHostelId) return;
    try {
      const res = await axios.put(`${API}/api/daily-register/mantras`, {
        hostel: activeHostelId,
        date: currentDate,
        headerMantraLeft: tempMantras.left,
        headerMantraCenter: tempMantras.center,
        headerMantraRight: tempMantras.right
      });
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setMantrasModalOpen(false);
        toast({ message: 'Header text updated!', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Failed to update header', type: 'error' });
    }
  };

  // ⚡ SUBMIT QUICK INLINE ROW (LIGHTNING FAST — ADDS 20+ ROWS IN 2 MINUTES)
  const handleQuickAddRow = async (e) => {
    if (e) e.preventDefault();

    // Determine guest/particular name fallback
    const gName = quickRow.guestName.trim() || 
      (quickRow.expenseTitle ? `EXP: ${quickRow.expenseTitle}` : 
      (quickRow.roomNo ? `Room ${quickRow.roomNo} Guest` : 'Cash Receipt'));

    const hasAnyValue = quickRow.roomNo || quickRow.guestName || quickRow.cashAmount || 
      quickRow.cardAmount || quickRow.onlineAmount || quickRow.foodCashAmount || 
      quickRow.expenseTitle || quickRow.expenseAmount;

    if (!hasAnyValue) {
      toast({ message: 'Please enter details for the row', type: 'error' });
      return;
    }

    try {
      const payload = {
        hostel: activeHostelId,
        date: currentDate,
        roomNo: quickRow.roomNo,
        bid: quickRow.bid,
        guestName: gName,
        cashAmount: Number(quickRow.cashAmount) || 0,
        cardAmount: Number(quickRow.cardAmount) || 0,
        onlineAmount: Number(quickRow.onlineAmount) || 0,
        foodCashAmount: Number(quickRow.foodCashAmount) || 0,
        expenseTitle: quickRow.expenseTitle,
        expenseAmount: Number(quickRow.expenseAmount) || 0,
        expenseCategory: quickRow.expenseCategory || 'General',
        paymentMode: quickRow.paymentMode || 'Cash',
        source: 'manual'
      };

      let res;
      if (editingEntry) {
        res = await axios.put(`${API}/api/daily-register/entry/${editingEntry._id}`, payload);
      } else {
        res = await axios.post(`${API}/api/daily-register/entry`, payload);
      }

      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        
        // Reset row and keep focus on room input for immediate next entry!
        setQuickRow({
          roomNo: '',
          bid: '',
          guestName: '',
          cashAmount: '',
          cardAmount: '',
          onlineAmount: '',
          foodCashAmount: '',
          expenseTitle: '',
          expenseAmount: '',
          expenseCategory: 'General',
          paymentMode: 'Cash'
        });
        setEditingEntry(null);
        toast({ message: editingEntry ? 'Row updated!' : '⚡ Row added to register!', type: 'success' });
        
        if (roomInputRef.current) {
          roomInputRef.current.focus();
        }
      }
    } catch (err) {
      toast({ message: 'Error adding row: ' + (err.response?.data?.message || err.message), type: 'error' });
    }
  };

  // Populate row for inline edit
  const handleStartEdit = (entry) => {
    setEditingEntry(entry);
    setQuickRow({
      roomNo: entry.roomNo || '',
      bid: entry.bid || '',
      guestName: entry.guestName || '',
      cashAmount: entry.cashAmount ? String(entry.cashAmount) : '',
      cardAmount: entry.cardAmount ? String(entry.cardAmount) : '',
      onlineAmount: entry.onlineAmount ? String(entry.onlineAmount) : '',
      foodCashAmount: entry.foodCashAmount ? String(entry.foodCashAmount) : '',
      expenseTitle: entry.expenseTitle || '',
      expenseAmount: entry.expenseAmount ? String(entry.expenseAmount) : '',
      expenseCategory: entry.expenseCategory || 'General',
      paymentMode: entry.paymentMode || 'Cash'
    });
    if (roomInputRef.current) roomInputRef.current.focus();
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setQuickRow({
      roomNo: '',
      bid: '',
      guestName: '',
      cashAmount: '',
      cardAmount: '',
      onlineAmount: '',
      foodCashAmount: '',
      expenseTitle: '',
      expenseAmount: '',
      expenseCategory: 'General',
      paymentMode: 'Cash'
    });
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Delete this register entry?')) return;
    try {
      const res = await axios.delete(`${API}/api/daily-register/entry/${entryId}?hostel=${activeHostelId}&date=${currentDate}`);
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        toast({ message: 'Entry removed', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Failed to delete entry', type: 'error' });
    }
  };

  // Print & PDF Handler
  const handlePrint = () => {
    printDailyRegister(registerData, summary, activeHostelName, currentDate);
  };

  // Export CSV / Excel Handler
  const handleExportCSV = () => {
    exportDailyRegisterToCSV(registerData, summary, activeHostelName, currentDate);
  };

  const activeHostelName = useMemo(() => {
    return hostels.find(h => h._id === selectedHostel)?.name || 'Hotel Front Desk';
  }, [hostels, selectedHostel]);

  const entriesList = registerData?.entries || [];

  if (isAccessDenied && user?.role !== 'superadmin') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Lock size={30} />
          </div>
          <h2 className="text-xl font-black text-gray-900">Module Access Restricted</h2>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {accessDeniedMessage || 'Daily Register (रोकड़ बही) module is disabled for this property. Only Super Admin can activate it.'}
          </p>
          <div className="pt-2">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-5 space-y-3.5 max-w-[1450px] mx-auto min-h-screen">
      {/* 1. TRADITIONAL AUSPICIOUS HEADER BAR */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-amber-500/15 border border-amber-300/80 rounded-2xl px-3 py-1.5 flex items-center justify-between text-amber-950 font-bold text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-serif tracking-widest text-amber-900 text-sm font-black">
            "{registerData?.headerMantraLeft || 'जय श्री श्याम'}"
          </span>
          <span className="text-amber-400 font-black">•</span>
          <span className="font-serif tracking-wider text-amber-950 font-black text-sm">
            {registerData?.headerMantraCenter || 'श्री गणेशाय नम:'}
          </span>
          <span className="text-amber-400 font-black">•</span>
          <span className="font-serif tracking-widest text-amber-900 text-sm font-black">
            "{registerData?.headerMantraRight || 'सीता राम'}"
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMantrasModalOpen(true)}
          className="text-[10px] text-amber-800 hover:text-amber-950 underline font-medium cursor-pointer"
        >
          Edit Header
        </button>
      </div>

      {/* 2. TOP TOOLBAR & CONTROLS */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Property & Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hostel Selector */}
          {hostels.length > 1 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800">
              <Building size={14} className="text-gray-500" />
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="bg-transparent outline-none cursor-pointer pr-1"
              >
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Navigator */}
          <div className="flex items-center bg-gray-900 text-white p-0.5 rounded-xl shadow-xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <Calendar size={13} className="text-emerald-400" />
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent text-white text-xs font-black outline-none cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ⚡ Auto-Sync from Software */}
          <button
            type="button"
            onClick={handleSyncSystem}
            disabled={syncing}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Auto-fetch today's check-ins, payments & expenses from system"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Auto-Sync Stays'}</span>
          </button>

          {/* 🖨️ Direct Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Open Clean A4 Printable Sheet & Save as PDF"
          >
            <Printer size={13} />
            <span>Print / PDF (A4)</span>
          </button>

          {/* 👁️ Preview On-Screen */}
          <button
            type="button"
            onClick={() => setPrintPreviewOpen(true)}
            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            title="Preview Ledger Sheet On-Screen"
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>

          {/* 📥 Excel / CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer flex items-center gap-1"
            title="Download Excel / CSV Sheet"
          >
            <Download size={14} />
            <span>Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* 3. KEY METRICS RIBBON (REGISTER HIGHLIGHTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {/* 1. Opening Balance */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 relative group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">Opening Bal.</span>
            <button
              type="button"
              onClick={() => {
                setTempOpeningBal(String(summary?.openingBalance || 0));
                setOpeningBalModalOpen(true);
              }}
              className="text-amber-700 hover:text-amber-950 p-0.5 cursor-pointer"
              title="Edit Opening Balance"
            >
              <Edit3 size={11} />
            </button>
          </div>
          <p className="text-sm sm:text-base font-black text-amber-950 font-mono mt-0.5">
            ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-amber-700 font-semibold block">कल का गल्ला / Cash</span>
        </div>

        {/* 2. Room Cash */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">CASH</span>
          <p className="text-sm sm:text-base font-black text-emerald-950 font-mono mt-0.5">
            ₹{(summary?.totalCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-emerald-700 font-semibold block">Room Rent Cash</span>
        </div>

        {/* 3. Card */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">CARD</span>
          <p className="text-sm sm:text-base font-black text-blue-950 font-mono mt-0.5">
            ₹{(summary?.totalCard || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-blue-700 font-semibold block">POS Swipes</span>
        </div>

        {/* 4. Fab / Online / UPI */}
        <div className="bg-purple-50/80 border border-purple-200 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-black text-purple-800 tracking-wider">Fab / UPI</span>
          <p className="text-sm sm:text-base font-black text-purple-950 font-mono mt-0.5">
            ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-purple-700 font-semibold block">Online / OTA</span>
        </div>

        {/* 5. Food Cash */}
        <div className="bg-orange-50/80 border border-orange-200 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-black text-orange-800 tracking-wider">Food CASH</span>
          <p className="text-sm sm:text-base font-black text-orange-950 font-mono mt-0.5">
            ₹{(summary?.totalFoodCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-orange-700 font-semibold block">Room Service</span>
        </div>

        {/* 6. Total Expenses */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5">
          <span className="text-[10px] uppercase font-black text-rose-800 tracking-wider">E X P (Out)</span>
          <p className="text-sm sm:text-base font-black text-rose-950 font-mono mt-0.5">
            -₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-rose-700 font-semibold block">Din ke Kharche</span>
        </div>

        {/* 7. Closing Cash in Hand */}
        <div className="bg-gray-900 border border-gray-800 text-white rounded-xl p-2.5 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Closing Cash</span>
          <p className="text-sm sm:text-base font-black text-white font-mono mt-0.5">
            ₹{(summary?.closingCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-gray-400 font-semibold block">आज रात का गल्ला</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. ⚡ LIGHTNING FAST INLINE ENTRY BAR (ENTER 20+ ROWS IN 2 MINUTES) */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-gray-900 to-emerald-950/90 text-white rounded-2xl p-3 border border-emerald-500/30 shadow-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-black uppercase tracking-wider text-emerald-300">
              {editingEntry ? '✏️ Edit Row' : '⚡ Fast Entry Bar (Tab se aage badho, Enter ↵ dabakar add karo)'}
            </span>
          </div>
          {editingEntry && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleQuickAddRow} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-10 gap-1.5 items-end">
          {/* 1. Room N. */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Room N.</label>
            <input
              ref={roomInputRef}
              type="text"
              placeholder="101"
              value={quickRow.roomNo}
              onChange={e => setQuickRow(r => ({ ...r, roomNo: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-800/90 border border-gray-700 rounded-lg text-xs font-bold text-white focus:border-emerald-400 outline-none"
            />
          </div>

          {/* 2. B. I. D */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-gray-400 block mb-0.5">B. I. D</label>
            <input
              type="text"
              placeholder="BK-12"
              value={quickRow.bid}
              onChange={e => setQuickRow(r => ({ ...r, bid: e.target.value }))}
              className="w-full px-2 py-1.5 bg-gray-800/90 border border-gray-700 rounded-lg text-xs font-mono text-white focus:border-emerald-400 outline-none"
            />
          </div>

          {/* 3. Guest Name / Particulars */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-2">
            <label className="text-[10px] font-bold text-gray-400 block mb-0.5">Guest Name / Particulars *</label>
            <input
              type="text"
              placeholder="Guest Name or Item"
              value={quickRow.guestName}
              onChange={e => setQuickRow(r => ({ ...r, guestName: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-gray-800/90 border border-gray-700 rounded-lg text-xs font-bold text-white focus:border-emerald-400 outline-none"
            />
          </div>

          {/* 4. CASH */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-emerald-400 block mb-0.5">CASH (₹)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={quickRow.cashAmount}
              onChange={e => setQuickRow(r => ({ ...r, cashAmount: e.target.value }))}
              className="w-full px-2 py-1.5 bg-emerald-950/60 border border-emerald-500/50 rounded-lg text-xs font-mono font-bold text-emerald-300 focus:border-emerald-400 outline-none"
            />
          </div>

          {/* 5. CARD */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-blue-400 block mb-0.5">CARD (₹)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={quickRow.cardAmount}
              onChange={e => setQuickRow(r => ({ ...r, cardAmount: e.target.value }))}
              className="w-full px-2 py-1.5 bg-blue-950/60 border border-blue-500/50 rounded-lg text-xs font-mono font-bold text-blue-300 focus:border-blue-400 outline-none"
            />
          </div>

          {/* 6. Fab / Online */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-purple-400 block mb-0.5">Fab/Online (₹)</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={quickRow.onlineAmount}
              onChange={e => setQuickRow(r => ({ ...r, onlineAmount: e.target.value }))}
              className="w-full px-2 py-1.5 bg-purple-950/60 border border-purple-500/50 rounded-lg text-xs font-mono font-bold text-purple-300 focus:border-purple-400 outline-none"
            />
          </div>

          {/* 7. Food CASH */}
          <div className="col-span-1">
            <label className="text-[10px] font-bold text-orange-400 block mb-0.5">Food CASH</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={quickRow.foodCashAmount}
              onChange={e => setQuickRow(r => ({ ...r, foodCashAmount: e.target.value }))}
              className="w-full px-2 py-1.5 bg-orange-950/60 border border-orange-500/50 rounded-lg text-xs font-mono font-bold text-orange-300 focus:border-orange-400 outline-none"
            />
          </div>

          {/* 8. E X P & Amt (Combined on desktop) */}
          <div className="col-span-2 sm:col-span-2 lg:col-span-1 flex gap-1">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-rose-400 block mb-0.5">E X P Reason</label>
              <input
                type="text"
                placeholder="Reason"
                value={quickRow.expenseTitle}
                onChange={e => setQuickRow(r => ({ ...r, expenseTitle: e.target.value }))}
                className="w-full px-2 py-1.5 bg-rose-950/60 border border-rose-500/50 rounded-lg text-xs font-bold text-rose-300 focus:border-rose-400 outline-none"
              />
            </div>
            <div className="w-16">
              <label className="text-[10px] font-bold text-rose-400 block mb-0.5">Amt</label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={quickRow.expenseAmount}
                onChange={e => setQuickRow(r => ({ ...r, expenseAmount: e.target.value }))}
                className="w-full px-2 py-1.5 bg-rose-950/60 border border-rose-500/50 rounded-lg text-xs font-mono font-bold text-rose-300 focus:border-rose-400 outline-none"
              />
            </div>
          </div>

          {/* 9. Action Submit Button */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <button
              type="submit"
              className="w-full py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <span>{editingEntry ? 'Update' : '+ Add'}</span>
              <CornerDownLeft size={12} />
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* 5. THE MAIN REGISTER LEDGER TABLE (MATCHING PHOTO) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white uppercase text-[11px] font-black tracking-wider border-b border-gray-800">
                <th className="py-2.5 px-2.5 border-r border-gray-800 text-center w-10">#</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-center w-20">Room N.</th>
                <th className="py-2.5 px-3 border-r border-gray-800 w-24">B. I. D</th>
                <th className="py-2.5 px-4 border-r border-gray-800 min-w-[220px]">Guest Name / Particulars</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-emerald-950/60 text-emerald-300">CASH</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-blue-950/60 text-blue-300">CARD</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-28 bg-purple-950/60 text-purple-300">Fab / Online</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-orange-950/60 text-orange-300">Food CASH</th>
                <th className="py-2.5 px-4 border-r border-gray-800 min-w-[170px] bg-rose-950/60 text-rose-300">E X P</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-rose-950/60 text-rose-300">Amt</th>
                <th className="py-2.5 px-2 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-900">
              {/* 🌟 ROW 1: OPENING BALANCE (PROMINENT AT TOP) */}
              <tr className="bg-amber-50/90 font-black text-amber-950 border-b-2 border-amber-300">
                <td className="py-2 px-2.5 text-center border-r border-amber-200 text-amber-800 font-mono">1</td>
                <td className="py-2 px-3 text-center border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-3 border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-4 border-r border-amber-200 flex items-center justify-between">
                  <span className="uppercase tracking-wide text-amber-900">Opening Bal. (कल का बचा हुआ गल्ला)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempOpeningBal(String(summary?.openingBalance || 0));
                      setOpeningBalModalOpen(true);
                    }}
                    className="p-1 hover:bg-amber-200 rounded text-amber-800 cursor-pointer"
                    title="Change Opening Balance"
                  >
                    <Edit3 size={11} />
                  </button>
                </td>
                <td className="py-2 px-3 text-right border-r border-amber-200 font-mono text-emerald-800 text-sm">
                  ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-4 border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2 px-2 text-center text-gray-400">—</td>
              </tr>

              {/* DATA ROWS */}
              {entriesList.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-10 text-center text-gray-400">
                    <p className="text-xs font-bold text-gray-600">No entries recorded for this date yet.</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Upar Fast Entry Bar me type karke <strong>Enter ↵</strong> dabayein, ya <strong>"Auto-Sync Stays"</strong> dabayein.
                    </p>
                  </td>
                </tr>
              ) : (
                entriesList.map((entry, idx) => (
                  <tr 
                    key={entry._id || idx} 
                    className="hover:bg-gray-50/80 transition-colors group border-b border-gray-200"
                  >
                    <td className="py-2 px-2.5 text-center border-r border-gray-200 text-gray-500 font-mono text-[11px]">
                      {idx + 2}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-200 font-bold font-mono">
                      {entry.roomNo ? (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800 font-bold">
                          {entry.roomNo}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 px-3 border-r border-gray-200 font-mono text-gray-600 text-[11px]">
                      {entry.bid || '—'}
                    </td>
                    <td className="py-2 px-4 border-r border-gray-200 font-bold text-gray-900">
                      <div className="flex items-center justify-between">
                        <span>{entry.guestName}</span>
                        {entry.source !== 'manual' && (
                          <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                            auto
                          </span>
                        )}
                      </div>
                      {entry.notes && (
                        <span className="block text-[10px] text-gray-400 font-normal">
                          {entry.notes}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-emerald-700 bg-emerald-50/20">
                      {entry.cashAmount > 0 ? `₹${entry.cashAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-blue-700 bg-blue-50/20">
                      {entry.cardAmount > 0 ? `₹${entry.cardAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-purple-700 bg-purple-50/20">
                      {entry.onlineAmount > 0 ? `₹${entry.onlineAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-orange-700 bg-orange-50/20">
                      {entry.foodCashAmount > 0 ? `₹${entry.foodCashAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-4 border-r border-gray-200 font-medium text-rose-900 bg-rose-50/20">
                      {entry.expenseTitle || (entry.expenseAmount > 0 ? 'Expense' : '—')}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-rose-700 bg-rose-50/20">
                      {entry.expenseAmount > 0 ? `₹${entry.expenseAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(entry)}
                          className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded cursor-pointer"
                          title="Edit Row"
                        >
                          <Edit3 size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {/* GRAND TOTALS FOOTER */}
              <tr className="bg-gray-100 text-gray-950 font-black border-t-2 border-gray-900 text-xs">
                <td className="py-2.5 px-3 text-center border-r border-gray-300 font-black" colSpan="4">
                  <div className="flex items-center justify-between px-2">
                    <span className="uppercase tracking-widest font-black text-xs">TOTALS:</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      (Total In: ₹{(summary?.totalIncome || 0).toLocaleString('en-IN')} | Total Out: ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')})
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right border-r border-gray-300 font-mono font-black text-emerald-800 text-xs bg-emerald-100/60">
                  ₹{(summary?.totalCash || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-gray-300 font-mono font-black text-blue-800 text-xs bg-blue-100/60">
                  ₹{(summary?.totalCard || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-gray-300 font-mono font-black text-purple-800 text-xs bg-purple-100/60">
                  ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-gray-300 font-mono font-black text-orange-800 text-xs bg-orange-100/60">
                  ₹{(summary?.totalFoodCash || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-4 border-r border-gray-300 text-right text-rose-900 uppercase font-bold text-[10px]">
                  Total Expenses:
                </td>
                <td className="py-2.5 px-3 text-right border-r border-gray-300 font-mono font-black text-rose-800 text-xs bg-rose-100/60">
                  ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-2"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* BOTTOM FORMULA & CASH SUMMARY BAR */}
        <div className="p-3 bg-gray-50 border-t border-gray-300 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-700 font-bold">💵 रात का गल्ला (Closing Cash):</span>
            <span className="font-mono font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-3 py-1 rounded-lg text-sm">
              ₹{(summary?.closingCash || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              (Opening ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')} + Cash In ₹{((summary?.totalCash || 0) + (summary?.totalFoodCash || 0)).toLocaleString('en-IN')} - Cash Expenses ₹{(summary?.cashExpense !== undefined ? summary.cashExpense : (summary?.totalExpense || 0)).toLocaleString('en-IN')})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 font-semibold">कुल कलेक्शन:</span>
              <span className="font-mono font-black text-gray-900 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                ₹{(summary?.totalIncome || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 font-semibold">कुल खर्चे:</span>
              <span className="font-mono font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                -₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-indigo-950 font-bold">शुद्ध बैलेंस (Net):</span>
              <span className="font-mono font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg text-sm">
                ₹{(summary?.netDayProfit || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 6. 🖨️ CLEAN A4 LANDSCAPE PRINT & PDF PREVIEW MODAL */}
      {/* ========================================================= */}
      {printPreviewOpen && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[10000] flex items-center justify-center p-2 sm:p-4"
          onClick={() => setPrintPreviewOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-gray-300 flex flex-col max-h-[94vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 shrink-0">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <Printer size={16} className="text-emerald-600" />
                  <span>A4 Daily Register Print Preview</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Ready to print on standard A4 Landscape sheet or save as PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Excel / CSV</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setPrintPreviewOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-black rounded-full cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* THE PRINTABLE SHEET (EXACT LEDGER FORMAT) */}
            <div id="printable-register-sheet" className="p-4 bg-white border border-gray-400 rounded-xl mt-3 space-y-3 font-serif">
              {/* Auspicious Header */}
              <div className="flex items-center justify-between text-xs font-black text-gray-800 border-b border-gray-400 pb-1">
                <span>"{registerData?.headerMantraLeft || 'जय श्री श्याम'}"</span>
                <span className="text-sm">श्री गणेशाय नम:</span>
                <span>"{registerData?.headerMantraRight || 'सीता राम'}"</span>
              </div>

              {/* Title & Date */}
              <div className="flex items-center justify-between text-xs border-b-2 border-black pb-2">
                <div>
                  <h1 className="text-xl font-black uppercase text-black tracking-wide font-sans">
                    {activeHostelName}
                  </h1>
                  <p className="text-xs text-gray-600 font-sans">
                    DAILY FRONT DESK CASH & ROOM REGISTER (दैनिक रोकड़ बही)
                  </p>
                </div>
                <div className="text-right font-sans">
                  <p className="text-xs font-bold text-gray-700">
                    DATE: <strong className="text-black font-mono text-sm">{format(new Date(currentDate + 'T12:00:00Z'), 'dd-MM-yyyy')}</strong>
                  </p>
                  <p className="text-[11px] text-gray-500">
                    DAY: {format(new Date(currentDate + 'T12:00:00Z'), 'EEEE')}
                  </p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-[11px] border border-black border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-100 text-black uppercase font-black border-b border-black text-[10px]">
                    <th className="py-1 px-1.5 border-r border-black text-center w-8">#</th>
                    <th className="py-1 px-2 border-r border-black text-center w-14">Room N.</th>
                    <th className="py-1 px-2 border-r border-black w-20">B. I. D</th>
                    <th className="py-1 px-2 border-r border-black">Guest Name / Particulars</th>
                    <th className="py-1 px-2 border-r border-black text-right w-20">CASH</th>
                    <th className="py-1 px-2 border-r border-black text-right w-20">CARD</th>
                    <th className="py-1 px-2 border-r border-black text-right w-24">Fab / Online</th>
                    <th className="py-1 px-2 border-r border-black text-right w-20">Food CASH</th>
                    <th className="py-1 px-2 border-r border-black">E X P</th>
                    <th className="py-1 px-2 text-right w-20">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {/* Row 1 Opening Bal */}
                  <tr className="font-bold bg-gray-50 border-b border-black">
                    <td className="py-1 px-1.5 text-center border-r border-black">1</td>
                    <td className="py-1 px-2 text-center border-r border-black">—</td>
                    <td className="py-1 px-2 border-r border-black">—</td>
                    <td className="py-1 px-2 border-r border-black uppercase">Opening Bal.</td>
                    <td className="py-1 px-2 text-right border-r border-black font-mono font-black">
                      ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1 px-2 text-right border-r border-black">—</td>
                    <td className="py-1 px-2 text-right border-r border-black">—</td>
                    <td className="py-1 px-2 text-right border-r border-black">—</td>
                    <td className="py-1 px-2 border-r border-black">—</td>
                    <td className="py-1 px-2 text-right">—</td>
                  </tr>

                  {/* Rows */}
                  {entriesList.map((entry, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="py-1 px-1.5 text-center border-r border-black font-mono">{idx + 2}</td>
                      <td className="py-1 px-2 text-center border-r border-black font-bold font-mono">{entry.roomNo || '—'}</td>
                      <td className="py-1 px-2 border-r border-black font-mono text-[10px]">{entry.bid || '—'}</td>
                      <td className="py-1 px-2 border-r border-black font-semibold">{entry.guestName}</td>
                      <td className="py-1 px-2 text-right border-r border-black font-mono">
                        {entry.cashAmount > 0 ? `₹${entry.cashAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-black font-mono">
                        {entry.cardAmount > 0 ? `₹${entry.cardAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-black font-mono">
                        {entry.onlineAmount > 0 ? `₹${entry.onlineAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1 px-2 text-right border-r border-black font-mono">
                        {entry.foodCashAmount > 0 ? `₹${entry.foodCashAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-1 px-2 border-r border-black">{entry.expenseTitle || '—'}</td>
                      <td className="py-1 px-2 text-right font-mono">
                        {entry.expenseAmount > 0 ? `₹${entry.expenseAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Totals Row */}
                  <tr className="bg-gray-100 font-black border-t-2 border-black text-[11px]">
                    <td colSpan="4" className="py-1.5 px-2 text-right border-r border-black uppercase tracking-wider">
                      TOTALS:
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                      ₹{(summary?.totalCash || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                      ₹{(summary?.totalCard || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                      ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black font-mono">
                      ₹{(summary?.totalFoodCash || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-1.5 px-2 text-right border-r border-black uppercase text-[10px]">
                      Expenses:
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Bottom Clean Day Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t-2 border-black font-sans text-xs">
                {/* Box 1: Cash in Drawer / रात का गल्ला */}
                <div className="p-2.5 bg-gray-50 border border-gray-400 rounded-lg space-y-1">
                  <div className="font-black text-gray-900 border-b border-gray-300 pb-1 uppercase tracking-wider text-[11px]">
                    💵 रोकड़ मिलान (Cash in Drawer / रात का गल्ला)
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>पिछला रोकड़ (Opening Cash):</span>
                    <strong className="font-mono">₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>(+) कैश कलेक्शन (Room + Food):</span>
                    <strong className="font-mono text-emerald-800">+₹{((summary?.totalCash || 0) + (summary?.totalFoodCash || 0)).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>(-) कैश खर्चे (Cash Expenses):</span>
                    <strong className="font-mono text-rose-700">-₹{(summary?.cashExpense !== undefined ? summary.cashExpense : (summary?.totalExpense || 0)).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-400 font-black text-emerald-950 text-sm">
                    <span>(=) रात का गल्ला (Closing Cash):</span>
                    <span className="font-mono text-base font-black">₹{(summary?.closingCash || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Box 2: आज का कुल हिसाब / Day Collection */}
                <div className="p-2.5 bg-gray-50 border border-gray-400 rounded-lg space-y-1">
                  <div className="font-black text-gray-900 border-b border-gray-300 pb-1 uppercase tracking-wider text-[11px]">
                    📊 आज का कुल हिसाब (Day Collection & Balance)
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>आज की कुल आमदनी (Total Collection):</span>
                    <strong className="font-mono">₹{(summary?.totalIncome || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span>(-) आज के कुल खर्चे (Total Expenses):</span>
                    <strong className="font-mono text-rose-700">-₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-[10px] text-gray-500 py-0.5">
                    (Cash: ₹{((summary?.totalCash || 0) + (summary?.totalFoodCash || 0)).toLocaleString('en-IN')} • Card: ₹{(summary?.totalCard || 0).toLocaleString('en-IN')} • Online: ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')})
                  </div>
                  <div className="flex justify-between py-1 border-t border-gray-400 font-black text-indigo-950 text-sm">
                    <span>(=) शुद्ध बैलेंस (Net Balance / आज की बचत):</span>
                    <span className="font-mono text-base font-black text-indigo-700">₹{(summary?.netDayProfit || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex items-center justify-around text-center text-xs pt-6 pb-2 font-sans font-bold">
                <div className="w-44 border-t border-black pt-1">
                  Duty Receptionist Signature
                </div>
                <div className="w-44 border-t border-black pt-1">
                  Verified by Manager / Owner
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 7: EDIT OPENING BALANCE */}
      {/* ========================================================= */}
      {openingBalModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[10000] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setOpeningBalModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Edit Opening Balance</h3>
              <button 
                type="button" 
                onClick={() => setOpeningBalModalOpen(false)}
                className="p-1 text-gray-400 hover:text-black rounded-full cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Kal raat ka closing cash hi subah ka Opening Balance banta hai. Agar bank me deposit ya personal drawing ki wajah se cash kam/zyada hua hai to amount update karein:
            </p>

            <div>
              <label className="text-[11px] font-black uppercase text-gray-500 block mb-1">
                Opening Cash Balance (₹)
              </label>
              <input
                type="number"
                min="0"
                value={tempOpeningBal}
                onChange={e => setTempOpeningBal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-amber-50 border border-amber-300 rounded-xl font-mono font-black text-lg text-amber-950 focus:border-amber-600 outline-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOpeningBalModalOpen(false)}
                className="px-3.5 py-1.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveOpeningBal}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl shadow-sm cursor-pointer"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 8: EDIT HEADER MANTRAS */}
      {/* ========================================================= */}
      {mantrasModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[10000] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setMantrasModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Custom Header Mantras</h3>
              <button 
                type="button" 
                onClick={() => setMantrasModalOpen(false)}
                className="p-1 text-gray-400 hover:text-black rounded-full cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Left Mantra</label>
                <input
                  type="text"
                  value={tempMantras.left}
                  onChange={e => setTempMantras(m => ({ ...m, left: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Center Text</label>
                <input
                  type="text"
                  value={tempMantras.center}
                  onChange={e => setTempMantras(m => ({ ...m, center: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 block mb-0.5">Right Mantra</label>
                <input
                  type="text"
                  value={tempMantras.right}
                  onChange={e => setTempMantras(m => ({ ...m, right: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setMantrasModalOpen(false)}
                className="px-3.5 py-1.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMantras}
                className="px-5 py-1.5 bg-black text-white font-black text-xs uppercase rounded-xl"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
