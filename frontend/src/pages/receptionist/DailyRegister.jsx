import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';
import { 
  BookOpen, Calendar, Plus, RefreshCw, Printer, Download, 
  Edit3, Trash2, ChevronLeft, ChevronRight, Check, X, 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, 
  UtensilsCrossed, CreditCard, Smartphone, DollarSign, Building, Sparkles 
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { apiCache } from '../../utils/apiCache';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

// Helper to get today's date in YYYY-MM-DD (India timezone safe)
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
  const [registerData, setRegisterData] = useState(null);
  const [summary, setSummary] = useState(null);

  // Modals
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [openingBalModalOpen, setOpeningBalModalOpen] = useState(false);
  const [mantrasModalOpen, setMantrasModalOpen] = useState(false);
  const [tempOpeningBal, setTempOpeningBal] = useState('');
  const [tempMantras, setTempMantras] = useState({ left: 'जय श्री श्याम', center: 'श्री गणेशाय नम:', right: 'सीता राम' });

  // Entry Form state
  const [entryForm, setEntryForm] = useState({
    entryType: 'room', // 'room' | 'food' | 'expense' | 'other'
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
    paymentMode: 'Cash',
    notes: ''
  });

  // Fetch Hostels for property selector
  useEffect(() => {
    axios.get(`${API}/api/hostels`)
      .then(res => {
        const list = res.data?.data || [];
        setHostels(list);
        if (list.length > 0) {
          const defaultH = user?.assignedHostel || list[0]._id;
          setSelectedHostel(defaultH);
        }
      })
      .catch(() => {});
  }, [user]);

  // Fetch Daily Register for selected date & hostel
  const fetchRegister = async (date = currentDate, hostelId = selectedHostel) => {
    if (!hostelId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/daily-register?hostel=${hostelId}&date=${date}`);
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
      toast({ message: 'Failed to load daily register: ' + (err.response?.data?.message || err.message), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHostel) {
      fetchRegister(currentDate, selectedHostel);
    }
  }, [currentDate, selectedHostel]);

  // Date Navigation
  const handlePrevDay = () => {
    const cur = new Date(currentDate + 'T12:00:00Z');
    const prev = subDays(cur, 1).toISOString().split('T')[0];
    setCurrentDate(prev);
  };

  const handleNextDay = () => {
    const cur = new Date(currentDate + 'T12:00:00Z');
    const next = addDays(cur, 1).toISOString().split('T')[0];
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(getTodayDateString());
  };

  // Sync System Stays & Expenses into Register
  const handleSyncSystem = async () => {
    if (!selectedHostel) return;
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/api/daily-register/sync`, {
        hostel: selectedHostel,
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
    try {
      const res = await axios.put(`${API}/api/daily-register/opening-balance`, {
        hostel: selectedHostel,
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
    try {
      const res = await axios.put(`${API}/api/daily-register/mantras`, {
        hostel: selectedHostel,
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

  // Open Add Entry Modal
  const handleOpenAddEntry = (type = 'room') => {
    setEditingEntry(null);
    setEntryForm({
      entryType: type,
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
      paymentMode: 'Cash',
      notes: ''
    });
    setEntryModalOpen(true);
  };

  // Open Edit Entry Modal
  const handleOpenEditEntry = (entry) => {
    setEditingEntry(entry);
    const isExp = (entry.expenseAmount > 0 || !!entry.expenseTitle);
    const isFood = (entry.foodCashAmount > 0 && !entry.cashAmount);
    setEntryForm({
      entryType: isExp ? 'expense' : (isFood ? 'food' : 'room'),
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
      paymentMode: entry.paymentMode || 'Cash',
      notes: entry.notes || ''
    });
    setEntryModalOpen(true);
  };

  // Submit Entry (Add or Update)
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    try {
      let payload = {
        hostel: selectedHostel,
        date: currentDate,
        roomNo: entryForm.roomNo,
        bid: entryForm.bid,
        guestName: entryForm.guestName || (entryForm.entryType === 'expense' ? `EXP: ${entryForm.expenseTitle}` : 'Cash Received'),
        cashAmount: Number(entryForm.cashAmount) || 0,
        cardAmount: Number(entryForm.cardAmount) || 0,
        onlineAmount: Number(entryForm.onlineAmount) || 0,
        foodCashAmount: Number(entryForm.foodCashAmount) || 0,
        expenseTitle: entryForm.expenseTitle,
        expenseAmount: Number(entryForm.expenseAmount) || 0,
        expenseCategory: entryForm.expenseCategory,
        paymentMode: entryForm.paymentMode,
        notes: entryForm.notes
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
        setEntryModalOpen(false);
        toast({ message: editingEntry ? 'Entry updated!' : 'Entry added to register!', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Error saving entry: ' + (err.response?.data?.message || err.message), type: 'error' });
    }
  };

  // Delete Entry
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this register row?')) return;
    try {
      const res = await axios.delete(`${API}/api/daily-register/entry/${entryId}?hostel=${selectedHostel}&date=${currentDate}`);
      if (res.data?.success) {
        setRegisterData(res.data.data);
        setSummary(res.data.summary);
        toast({ message: 'Entry removed', type: 'success' });
      }
    } catch (err) {
      toast({ message: 'Failed to delete entry', type: 'error' });
    }
  };

  // Print Register
  const handlePrint = () => {
    window.print();
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!registerData) return;
    const entries = registerData.entries || [];
    let csv = `Date,Room No,B.I.D,Guest Name / Particulars,CASH,CARD,Fab / Online / UPI,Food CASH,EXP (Expense Reason),Amt (Expense)\n`;

    // Row 1: Opening Bal
    csv += `${currentDate},—,—,Opening Bal.,${summary?.openingBalance || 0},0,0,0,—,0\n`;

    entries.forEach(e => {
      const r = (e.roomNo || '').replace(/,/g, ' ');
      const b = (e.bid || '').replace(/,/g, ' ');
      const g = (e.guestName || '').replace(/,/g, ' ');
      const expT = (e.expenseTitle || '').replace(/,/g, ' ');
      csv += `${currentDate},${r},${b},"${g}",${e.cashAmount || 0},${e.cardAmount || 0},${e.onlineAmount || 0},${e.foodCashAmount || 0},"${expT}",${e.expenseAmount || 0}\n`;
    });

    // Totals
    csv += `TOTALS,—,—,—,${summary?.totalCash || 0},${summary?.totalCard || 0},${summary?.totalOnline || 0},${summary?.totalFoodCash || 0},—,${summary?.totalExpense || 0}\n`;
    csv += `CLOSING CASH IN HAND,—,—,—,${summary?.closingCash || 0},—,—,—,—,—\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Daily_Register_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeHostelName = useMemo(() => {
    return hostels.find(h => h._id === selectedHostel)?.name || 'Hotel Front Desk';
  }, [hostels, selectedHostel]);

  const entriesList = registerData?.entries || [];

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto min-h-screen">
      {/* 1. TRADITIONAL AUSPICIOUS BANNER (MATCHING PHYSICAL REGISTER) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-500/10 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-amber-950 font-bold text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="font-serif tracking-widest text-amber-900 text-sm">
            "{registerData?.headerMantraLeft || 'जय श्री श्याम'}"
          </span>
          <span className="text-amber-400">•</span>
          <span className="font-serif tracking-wider text-amber-950 font-black text-sm">
            {registerData?.headerMantraCenter || 'श्री गणेशाय नम:'}
          </span>
          <span className="text-amber-400">•</span>
          <span className="font-serif tracking-widest text-amber-900 text-sm">
            "{registerData?.headerMantraRight || 'सीता राम'}"
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMantrasModalOpen(true)}
          className="text-[10px] text-amber-800 hover:text-amber-950 underline cursor-pointer"
          title="Edit Header Mantras"
        >
          Edit Header
        </button>
      </div>

      {/* 2. TOP TOOLBAR & CONTROLS */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Property & Date Selector */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Hostel Selector */}
          {hostels.length > 1 && (
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-800">
              <Building size={14} className="text-gray-500" />
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                className="bg-transparent outline-none cursor-pointer pr-2"
              >
                {hostels.map(h => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-gray-900 text-white p-1 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
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
              className="p-1.5 hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ⚡ Auto-Sync from Software */}
          <button
            type="button"
            onClick={handleSyncSystem}
            disabled={syncing}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            title="Auto-fetch today's check-ins, payments & expenses from system"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Auto-Sync Stays'}</span>
          </button>

          {/* ➕ Add Entry Button */}
          <button
            type="button"
            onClick={() => handleOpenAddEntry('room')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>+ Add Entry</span>
          </button>

          {/* 🖨️ Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="Print Physical Daily Register (A4 Landscape)"
          >
            <Printer size={15} />
          </button>

          {/* 📥 Excel / CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
            title="Download Excel / CSV Sheet"
          >
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* 3. KEY METRICS RIBBON (REGISTER HIGHLIGHTS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
        {/* 1. Opening Balance */}
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 relative group">
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
          <p className="text-base sm:text-lg font-black text-amber-950 font-mono mt-1">
            ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-amber-700 font-bold block">कल का गल्ला / Cash</span>
        </div>

        {/* 2. Room Cash */}
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">CASH</span>
          <p className="text-base sm:text-lg font-black text-emerald-950 font-mono mt-1">
            ₹{(summary?.totalCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-emerald-700 font-bold block">Room Rent Cash</span>
        </div>

        {/* 3. Card */}
        <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-black text-blue-800 tracking-wider">CARD</span>
          <p className="text-base sm:text-lg font-black text-blue-950 font-mono mt-1">
            ₹{(summary?.totalCard || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-blue-700 font-bold block">POS Swipes</span>
        </div>

        {/* 4. Fab / Online / UPI */}
        <div className="bg-purple-50/80 border border-purple-200/90 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-black text-purple-800 tracking-wider">Fab / UPI</span>
          <p className="text-base sm:text-lg font-black text-purple-950 font-mono mt-1">
            ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-purple-700 font-bold block">Online / OTA</span>
        </div>

        {/* 5. Food Cash */}
        <div className="bg-orange-50/80 border border-orange-200/90 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-black text-orange-800 tracking-wider">Food CASH</span>
          <p className="text-base sm:text-lg font-black text-orange-950 font-mono mt-1">
            ₹{(summary?.totalFoodCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-orange-700 font-bold block">Room Service</span>
        </div>

        {/* 6. Total Expenses */}
        <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-3">
          <span className="text-[10px] uppercase font-black text-rose-800 tracking-wider">E X P (Out)</span>
          <p className="text-base sm:text-lg font-black text-rose-950 font-mono mt-1">
            -₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-rose-700 font-bold block">Din ke Kharche</span>
        </div>

        {/* 7. Closing Cash in Hand */}
        <div className="bg-gray-900 border border-gray-800 text-white rounded-2xl p-3 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Closing Cash</span>
          <p className="text-base sm:text-lg font-black text-white font-mono mt-1">
            ₹{(summary?.closingCash || 0).toLocaleString('en-IN')}
          </p>
          <span className="text-[9px] text-gray-400 font-bold block">आज रात का गल्ला</span>
        </div>
      </div>

      {/* 4. THE PHYSICAL REGISTER LEDGER SHEET */}
      <div className="bg-white rounded-3xl border border-gray-300 shadow-md overflow-hidden print:border-black print:rounded-none">
        {/* Printable Register Sheet Header */}
        <div className="border-b-2 border-gray-800 p-4 bg-gray-50/60 print:bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-black text-gray-950 tracking-wide uppercase flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-600 print:text-black" />
              <span>{activeHostelName} — Daily Front Desk Register</span>
            </h2>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">
              रोकड़ बही / Cash & Collection Register • Date: <span className="font-mono font-bold text-gray-900">{format(new Date(currentDate + 'T12:00:00Z'), 'dd MMMM yyyy (EEEE)')}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 text-right">
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-black uppercase rounded-lg border border-amber-300">
              Page: {registerData?.entries?.length ? Math.ceil(registerData.entries.length / 25) : 1}
            </span>
          </div>
        </div>

        {/* Register Table (Identical Columns to Photo) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white uppercase text-[11px] font-black tracking-wider border-b border-gray-800 print:bg-gray-200 print:text-black">
                <th className="py-2.5 px-3 border-r border-gray-800 text-center w-12">#</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-center w-20">Room N.</th>
                <th className="py-2.5 px-3 border-r border-gray-800 w-24">B. I. D</th>
                <th className="py-2.5 px-4 border-r border-gray-800 min-w-[200px]">Guest Name / Particulars</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-emerald-950/40 print:bg-transparent">CASH</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-blue-950/40 print:bg-transparent">CARD</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-28 bg-purple-950/40 print:bg-transparent">Fab / Online</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-orange-950/40 print:bg-transparent">Food CASH</th>
                <th className="py-2.5 px-4 border-r border-gray-800 min-w-[180px] bg-rose-950/40 print:bg-transparent">E X P</th>
                <th className="py-2.5 px-3 border-r border-gray-800 text-right w-24 bg-rose-950/40 print:bg-transparent">Amt</th>
                <th className="py-2.5 px-2 text-center w-16 print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-medium text-gray-900">
              {/* 🌟 ROW 1: OPENING BALANCE (PROMINENT AT TOP LIKE REGISTER PHOTO) */}
              <tr className="bg-amber-50/90 font-black text-amber-950 border-b-2 border-amber-300">
                <td className="py-2.5 px-3 text-center border-r border-amber-200 text-amber-700">1</td>
                <td className="py-2.5 px-3 text-center border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-3 border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-4 border-r border-amber-200 flex items-center justify-between">
                  <span className="uppercase tracking-wide text-amber-900">Opening Bal. (कल का बचा हुआ गल्ला)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempOpeningBal(String(summary?.openingBalance || 0));
                      setOpeningBalModalOpen(true);
                    }}
                    className="p-1 hover:bg-amber-200 rounded text-amber-800 print:hidden cursor-pointer"
                    title="Change Opening Balance"
                  >
                    <Edit3 size={12} />
                  </button>
                </td>
                <td className="py-2.5 px-3 text-right border-r border-amber-200 font-mono text-emerald-800 text-sm">
                  ₹{(summary?.openingBalance || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-4 border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-3 text-right border-r border-amber-200 text-gray-400">—</td>
                <td className="py-2.5 px-2 text-center text-gray-400 print:hidden">—</td>
              </tr>

              {/* DATA ROWS */}
              {entriesList.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-gray-400">
                    <p className="text-sm font-bold">No entries recorded for this date yet.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click <strong>"+ Add Entry"</strong> to add manual room/expense rows, or click <strong>"Auto-Sync Stays"</strong> to import today's check-ins.
                    </p>
                  </td>
                </tr>
              ) : (
                entriesList.map((entry, idx) => (
                  <tr 
                    key={entry._id || idx} 
                    className="hover:bg-gray-50/80 transition-colors group border-b border-gray-200"
                  >
                    <td className="py-2 px-3 text-center border-r border-gray-200 text-gray-500 font-mono text-[11px]">
                      {idx + 2}
                    </td>
                    <td className="py-2 px-3 text-center border-r border-gray-200 font-bold font-mono">
                      {entry.roomNo ? (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">
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
                          <span className="text-[9px] px-1 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 print:hidden">
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
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-emerald-700 bg-emerald-50/30">
                      {entry.cashAmount > 0 ? `₹${entry.cashAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-blue-700 bg-blue-50/30">
                      {entry.cardAmount > 0 ? `₹${entry.cardAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-purple-700 bg-purple-50/30">
                      {entry.onlineAmount > 0 ? `₹${entry.onlineAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-orange-700 bg-orange-50/30">
                      {entry.foodCashAmount > 0 ? `₹${entry.foodCashAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-4 border-r border-gray-200 font-medium text-rose-900 bg-rose-50/30">
                      {entry.expenseTitle || (entry.expenseAmount > 0 ? 'Expense' : '—')}
                    </td>
                    <td className="py-2 px-3 text-right border-r border-gray-200 font-mono font-bold text-rose-700 bg-rose-50/30">
                      {entry.expenseAmount > 0 ? `₹${entry.expenseAmount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEntry(entry)}
                          className="p-1 text-gray-500 hover:text-black hover:bg-gray-200 rounded cursor-pointer"
                          title="Edit Row"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry._id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}

              {/* 5. GRAND TOTALS FOOTER (MATCHING REGISTER BOTTOM) */}
              <tr className="bg-gray-100 text-gray-950 font-black border-t-2 border-gray-900 text-xs">
                <td className="py-3 px-3 text-center border-r border-gray-300 font-black" colSpan="4">
                  <div className="flex items-center justify-between px-2">
                    <span className="uppercase tracking-widest font-black text-sm">TOTALS:</span>
                    <span className="text-[10px] text-gray-500 font-normal">
                      (Total In: ₹{(summary?.totalIncome || 0).toLocaleString('en-IN')} | Total Out: ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')})
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right border-r border-gray-300 font-mono font-black text-emerald-800 text-sm bg-emerald-100/60">
                  ₹{(summary?.totalCash || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right border-r border-gray-300 font-mono font-black text-blue-800 text-sm bg-blue-100/60">
                  ₹{(summary?.totalCard || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right border-r border-gray-300 font-mono font-black text-purple-800 text-sm bg-purple-100/60">
                  ₹{(summary?.totalOnline || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-3 text-right border-r border-gray-300 font-mono font-black text-orange-800 text-sm bg-orange-100/60">
                  ₹{(summary?.totalFoodCash || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 border-r border-gray-300 text-right text-rose-900 uppercase font-bold text-[11px]">
                  Total Expenses:
                </td>
                <td className="py-3 px-3 text-right border-r border-gray-300 font-mono font-black text-rose-800 text-sm bg-rose-100/60">
                  ₹{(summary?.totalExpense || 0).toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-2 print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 6. DAILY RECONCILIATION SUMMARY BOX (BOTTOM OF SHEET) */}
        <div className="p-4 bg-gray-50 border-t border-gray-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-700">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-gray-500 mr-1.5 font-normal">Day's Net Revenue:</span>
              <span className="text-emerald-700 font-black font-mono">
                ₹{(summary?.totalIncome || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-gray-500 mr-1.5 font-normal">Day's Net Profit:</span>
              <span className="text-indigo-700 font-black font-mono">
                ₹{(summary?.netDayProfit || 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200">
              <span className="text-gray-500 mr-1.5 font-normal">Closing Cash in Hand Formula:</span>
              <span className="font-mono text-gray-900 text-[11px]">
                ₹{summary?.openingBalance || 0} + ₹{(summary?.totalCash || 0) + (summary?.totalFoodCash || 0)} - ₹{summary?.cashExpense || 0} = <strong className="text-emerald-700">₹{(summary?.closingCash || 0).toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          {/* Official Signatures for A4 Print */}
          <div className="hidden print:flex items-center gap-12 text-center text-xs pt-8">
            <div className="w-48 border-t border-black pt-1 font-bold">
              Receptionist Signature
            </div>
            <div className="w-48 border-t border-black pt-1 font-bold">
              Manager / Proprietor Signature
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT REGISTER ENTRY */}
      {/* ========================================================= */}
      {entryModalOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[10000] flex items-center justify-center p-3 sm:p-4"
          onClick={() => setEntryModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  {editingEntry ? 'Edit Register Row' : 'Add New Entry to Register'}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Date: {format(new Date(currentDate + 'T12:00:00Z'), 'dd MMMM yyyy')}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEntryModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Entry Type Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setEntryForm(f => ({ ...f, entryType: 'room' }))}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  entryForm.entryType === 'room' ? 'bg-white text-gray-950 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🏨 Room Rent
              </button>
              <button
                type="button"
                onClick={() => setEntryForm(f => ({ ...f, entryType: 'food' }))}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  entryForm.entryType === 'food' ? 'bg-white text-gray-950 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🍽️ Food Cash
              </button>
              <button
                type="button"
                onClick={() => setEntryForm(f => ({ ...f, entryType: 'expense' }))}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  entryForm.entryType === 'expense' ? 'bg-white text-gray-950 shadow-xs font-black' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                🔴 EXP (Expense)
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3.5">
              {/* Common Top: Room No & Booking ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                    Room N. {entryForm.entryType === 'room' && '*'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 101, 204"
                    value={entryForm.roomNo}
                    onChange={e => setEntryForm(f => ({ ...f, roomNo: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:border-black outline-none"
                    required={entryForm.entryType === 'room'}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                    B. I. D (Booking ID)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BK-1029"
                    value={entryForm.bid}
                    onChange={e => setEntryForm(f => ({ ...f, bid: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:border-black outline-none font-mono"
                  />
                </div>
              </div>

              {/* Guest Name / Particulars */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                  {entryForm.entryType === 'expense' ? 'Paid To / Vendor / Item *' : 'Guest Name / Particulars *'}
                </label>
                <input
                  type="text"
                  placeholder={entryForm.entryType === 'expense' ? 'e.g. Doodh Chai, Diesel, Laundry, Staff Advance' : 'e.g. Rohit Verma'}
                  value={entryForm.guestName}
                  onChange={e => setEntryForm(f => ({ ...f, guestName: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm focus:border-black outline-none"
                  required
                />
              </div>

              {/* Amounts section depends on entryType */}
              {entryForm.entryType === 'room' && (
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block">
                    Room Rent Payment Mode Breakdown:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-emerald-800 block mb-0.5">CASH (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={entryForm.cashAmount}
                        onChange={e => setEntryForm(f => ({ ...f, cashAmount: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg font-mono font-bold text-sm focus:border-emerald-600 outline-none text-emerald-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-blue-800 block mb-0.5">CARD (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={entryForm.cardAmount}
                        onChange={e => setEntryForm(f => ({ ...f, cardAmount: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg font-mono font-bold text-sm focus:border-blue-600 outline-none text-blue-900"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-purple-800 block mb-0.5">Fab / UPI (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={entryForm.onlineAmount}
                        onChange={e => setEntryForm(f => ({ ...f, onlineAmount: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-purple-300 rounded-lg font-mono font-bold text-sm focus:border-purple-600 outline-none text-purple-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {entryForm.entryType === 'food' && (
                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-200 space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-orange-900 block">
                    Food / Room Service CASH (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 350"
                    min="0"
                    value={entryForm.foodCashAmount}
                    onChange={e => setEntryForm(f => ({ ...f, foodCashAmount: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-orange-300 rounded-xl font-mono font-bold text-base focus:border-orange-600 outline-none text-orange-950"
                    required
                  />
                </div>
              )}

              {entryForm.entryType === 'expense' && (
                <div className="p-3 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-rose-800 block mb-0.5">
                        E X P Reason / Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Milk & Tea, Diesel"
                        value={entryForm.expenseTitle}
                        onChange={e => setEntryForm(f => ({ ...f, expenseTitle: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg font-bold text-xs focus:border-rose-600 outline-none text-rose-950"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-rose-800 block mb-0.5">
                        Amt (₹ Expense) *
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={entryForm.expenseAmount}
                        onChange={e => setEntryForm(f => ({ ...f, expenseAmount: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded-lg font-mono font-bold text-sm focus:border-rose-600 outline-none text-rose-950"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-600 block mb-0.5">Category</label>
                      <select
                        value={entryForm.expenseCategory}
                        onChange={e => setEntryForm(f => ({ ...f, expenseCategory: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Food & Groceries">Food & Groceries</option>
                        <option value="Cleaning & Housekeeping">Cleaning & Housekeeping</option>
                        <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                        <option value="Electricity & Utility">Electricity & Utility</option>
                        <option value="Staff Salary / Advance">Staff Salary / Advance</option>
                        <option value="Laundry Expense">Laundry Expense</option>
                        <option value="Owner Drawing / Transfer">Owner Drawing / Transfer</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-600 block mb-0.5">Paid Via</label>
                      <select
                        value={entryForm.paymentMode}
                        onChange={e => setEntryForm(f => ({ ...f, paymentMode: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Cash">Counter Cash (गल्ला से)</option>
                        <option value="UPI">UPI / Online QR</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                  Notes / Voucher Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid to Ramu bhaiya, Bill #42"
                  value={entryForm.notes}
                  onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs focus:border-black outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEntryModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{editingEntry ? 'Update Entry' : 'Add to Register'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: EDIT OPENING BALANCE */}
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
              By default, kal raat ka closing cash hi subah ka Opening Balance banta hai. Agar aapne bank deposit ya cash drawing kiya hai, to yahan amount change karein:
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
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase rounded-xl shadow-sm"
              >
                Save Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: EDIT HEADER MANTRAS */}
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
