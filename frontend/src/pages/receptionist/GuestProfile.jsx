import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { User, Phone, CheckCircle, Clock, Printer, FileText, Wallet, BookOpen, Share2, PlusCircle, ArrowDownLeft, ArrowUpRight, X, AlertCircle, UserPlus, Sparkles, Building, Bed } from 'lucide-react';
import { printInvoice } from '../../utils/invoice';
import ExtendStayModal from './ExtendStayModal';
import ShiftRoomModal from './ShiftRoomModal';
import GuestRegistrationCardModal from '../../components/reception/GuestRegistrationCardModal';
import { useLanguage } from '../../context/LanguageContext';

const GuestProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, isHindi } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'khata' ? 'khata' : 'history');

  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [selectedStay, setSelectedStay] = useState(null);
  const [selectedGrcStay, setSelectedGrcStay] = useState(null);

  // Ledger / Khata state
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [formAmount, setFormAmount] = useState('');
  const [formMethod, setFormMethod] = useState('Cash');
  const [formNotes, setFormNotes] = useState('');
  const [submittingLedger, setSubmittingLedger] = useState(false);
  const [ledgerActionError, setLedgerActionError] = useState('');

  useEffect(() => {
    if (tabParam && (tabParam === 'khata' || tabParam === 'history')) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  useEffect(() => {
    fetchGuest();
    fetchLedger();
  }, [id]);

  async function fetchGuest() {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${id}`);
      setGuest(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLedger() {
    try {
      setLedgerLoading(true);
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${id}/ledger`);
      if (res.data?.success) {
        setLedgerEntries(res.data.data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    } finally {
      setLedgerLoading(false);
    }
  }

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      setLedgerActionError('Please enter a valid amount');
      return;
    }
    setSubmittingLedger(true);
    setLedgerActionError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${id}/ledger/deposit`, {
        amount: amt,
        paymentMethod: formMethod,
        description: formNotes || 'Advance Deposit (अग्रिम जमा)'
      });
      setDepositModalOpen(false);
      setFormAmount('');
      setFormNotes('');
      fetchGuest();
      fetchLedger();
    } catch (err) {
      setLedgerActionError(err.response?.data?.message || 'Failed to record deposit');
    } finally {
      setSubmittingLedger(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(formAmount);
    if (!amt || amt <= 0) {
      setLedgerActionError('Please enter a valid amount');
      return;
    }
    setSubmittingLedger(true);
    setLedgerActionError('');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/guests/${id}/ledger/payment`, {
        amount: amt,
        paymentMethod: formMethod,
        description: formNotes || 'Khata Payment Received (उधार वसूली)'
      });
      setPaymentModalOpen(false);
      setFormAmount('');
      setFormNotes('');
      fetchGuest();
      fetchLedger();
    } catch (err) {
      setLedgerActionError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingLedger(false);
    }
  };

  const getWhatsAppStatementUrl = () => {
    if (!guest || !guest.mobileNumber) return null;
    const cleanMobile = guest.mobileNumber.replace(/[^0-9]/g, '');
    const phone = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    const bal = Number(guest.ledgerBalance) || 0;
    const statusStr = bal > 0 ? `Advance Balance: ₹${bal.toLocaleString('en-IN')}` : bal < 0 ? `Total Due / Udhaar: ₹${Math.abs(bal).toLocaleString('en-IN')}` : `Balance: ₹0 (Settled)`;
    
    let msg = `*HOTEL KHATA / PASSBOOK STATEMENT*\nGuest: *${guest.fullName}*\nStatus: *${statusStr}*\nDate: ${format(new Date(), 'dd MMM yyyy')}\n\n`;
    msg += `*Recent Transactions:*\n`;
    (ledgerEntries || []).slice(0, 6).forEach((entry, idx) => {
      const isCredit = entry.entryType === 'DEPOSIT' || entry.entryType === 'PAYMENT';
      const sign = isCredit ? '+' : '-';
      msg += `${idx + 1}. ${format(new Date(entry.date), 'dd/MM/yy')} | ${entry.entryType.replace('_', ' ')}: ${sign}₹${entry.amount} (${entry.paymentMethod})\n   Balance: ₹${entry.balanceAfter}\n`;
    });
    msg += `\nThank you for choosing us!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handlePrint = async (stayToPrint) => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}/api/payments?stay=${stayToPrint._id}`);
      printInvoice(stayToPrint, res.data.data);
    } catch (err) {
      console.error('Failed to fetch payments', err);
      printInvoice(stayToPrint, []);
    }
  };

  const handleStartBookingForGuest = () => {
    if (!guest) return;
    // Collect unique past co-guests who accompanied this guest
    const companionsMap = new Map();
    (guest.stays || []).forEach(stay => {
      if (stay.guest && stay.guest._id && stay.guest._id !== guest._id) {
        companionsMap.set(stay.guest._id, stay.guest);
      }
      if (Array.isArray(stay.coGuests)) {
        stay.coGuests.forEach(cg => {
          if (cg && cg._id && cg._id !== guest._id) {
            companionsMap.set(cg._id, cg);
          }
        });
      }
    });

    const prefillPayload = {
      _id: guest._id,
      fullName: guest.fullName,
      mobileNumber: guest.mobileNumber,
      idProofType: guest.idProofType,
      idProofNumber: guest.idProofNumber,
      idProofImage: guest.idProofImage,
      idProofImageBack: guest.idProofImageBack,
      gender: guest.gender,
      dateOfBirth: guest.dateOfBirth,
      address: guest.address,
      frequentCompanions: Array.from(companionsMap.values())
    };

    // Clean any prior pending checkin data so this booking opens at Step 1 with clean room selection
    sessionStorage.removeItem('checkin_stayInfo');
    sessionStorage.removeItem('checkin_guests');
    sessionStorage.setItem('checkin_step', '1');
    sessionStorage.setItem('checkin_prefill_guest', JSON.stringify(prefillPayload));
    navigate('/checkin', { state: { prefillGuest: prefillPayload } });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
    </div>
  );
  if (!guest) return (
    <div className="text-center py-16">
      <h3 className="text-lg font-black text-gray-900">Guest not found</h3>
      <Link to="/guests" className="text-xs font-bold text-black underline mt-2 inline-block">Return to Guest Directory</Link>
    </div>
  );

  const activeStay = guest.stays?.find(s => ['Active', 'Upcoming', 'Checkout Due', 'Overdue'].includes(s.status));
  const historyStays = guest.stays?.filter(s => s._id !== activeStay?._id) || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full mx-auto pb-12">
      
      {/* ─── Profile Header (Clean Executive Standard) ─── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-gray-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-950 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm shrink-0">
            {guest.fullName ? guest.fullName.charAt(0).toUpperCase() : <User size={30} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                {guest.fullName}
              </h1>
              {activeStay ? (
                <span className="px-3 py-1 inline-flex text-[11px] font-black uppercase tracking-wider rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active In Room {activeStay.room?.roomNumber}
                </span>
              ) : (
                <span className="px-2.5 py-1 inline-flex text-[10px] font-black uppercase tracking-widest rounded-xl bg-gray-100 text-gray-600 border border-gray-200">
                  Past Guest
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center text-gray-600 mt-2.5 gap-2 sm:gap-3 text-xs font-bold">
              <span className="flex items-center bg-gray-50 px-3 py-1 rounded-xl border border-gray-200">
                <Phone size={13} className="mr-1.5 text-gray-400" />
                {guest.mobileNumber}
              </span>
              {guest.idProofNumber && (
                <span className="flex items-center bg-gray-50 text-gray-700 px-3 py-1 rounded-xl border border-gray-200">
                  {guest.idProofType}: {guest.idProofNumber}
                </span>
              )}
              {guest.address && (
                <span className="text-gray-400 font-medium truncate max-w-xs">
                  • {guest.address}
                </span>
              )}
            </div>
            
            {(guest.idProofImage || guest.idProofImageBack) && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {guest.idProofImage && (
                  <a 
                    href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] text-gray-700 hover:text-black font-black uppercase tracking-wider bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>ID Front</span>
                  </a>
                )}
                {guest.idProofImageBack && (
                  <a 
                    href={(guest.idProofImageBack?.startsWith('http') ? guest.idProofImageBack : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImageBack}`)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] text-gray-700 hover:text-black font-black uppercase tracking-wider bg-white hover:bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>ID Back</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right Actions & Balance */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          {/* PRIMARY: Book Room for this Guest */}
          <button
            type="button"
            onClick={handleStartBookingForGuest}
            className="w-full sm:w-auto px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            title="Start a new reservation / check-in with this guest auto-filled"
          >
            <UserPlus size={15} />
            <span>Book Room / Check-In</span>
          </button>

          {Number(guest.ledgerBalance) > 0 && (
            <button
              type="button"
              onClick={() => handleTabChange('khata')}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Click to view Advance Wallet Passbook"
            >
              <Wallet size={15} className="text-emerald-600" />
              <span>Wallet: ₹{Number(guest.ledgerBalance).toLocaleString('en-IN')}</span>
            </button>
          )}

          {Number(guest.ledgerBalance) < 0 && (
            <button
              type="button"
              onClick={() => handleTabChange('khata')}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Click to view Khata Passbook & Settle Due"
            >
              <BookOpen size={15} className="text-rose-600" />
              <span>Khata Due: ₹{Math.abs(Number(guest.ledgerBalance)).toLocaleString('en-IN')}</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Active Stay Card (Refined & Clean) ─── */}
      {activeStay && (
        <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden">
          <div className="bg-gray-50/70 px-6 sm:px-8 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center">
                <Bed size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">
                  Current In-House Stay
                </h2>
                <p className="text-[11px] font-bold text-gray-500">
                  Room {activeStay.room?.roomNumber} • Booking #{activeStay.bookingNumber || 'Direct'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider border border-gray-200 rounded-xl transition-all active:scale-95"
              >
                Extend Stay
              </button>
              <button 
                onClick={() => setSelectedGrcStay(activeStay)}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 font-bold text-xs uppercase tracking-wider border border-gray-200 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5"
                title="Print Guest Registration Card (GRC)"
              >
                <FileText size={14} className="text-gray-500" /> Print GRC
              </button>
              <button 
                onClick={() => handlePrint(activeStay)}
                className="px-4 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Bill
              </button>
            </div>
          </div>
          
          <div className="p-6 sm:p-7 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room Occupancy</p>
              <p className="font-black text-gray-900 text-xl">Room {activeStay.room?.roomNumber}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests Accommodated` : `1 Guest`}</p>
            </div>

            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in Time</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.checkInDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.checkInDate), 'hh:mm a')}</p>
            </div>

            <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expected Checkout</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.expectedCheckOutDate), 'hh:mm a')}</p>
            </div>

            <div className={`p-4 rounded-2xl border ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'bg-rose-50/70 border-rose-100' : 'bg-emerald-50/70 border-emerald-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {activeStay.totalAmount - activeStay.paidAmount > 0 ? 'Balance Pending' : 'Paid in Full'}
              </p>
              <p className={`font-black text-2xl ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                ₹{activeStay.totalAmount - activeStay.paidAmount}
              </p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">Total Bill: ₹{activeStay.totalAmount}</p>
            </div>
            
            {activeStay.coGuests && activeStay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && (
              <div className="col-span-2 lg:col-span-4 pt-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Accompanying Co-Guests</p>
                <div className="flex flex-wrap gap-2.5">
                  {activeStay.coGuests.filter(cg => cg._id !== guest._id).map(cg => (
                    <Link 
                      to={`/guests/${cg._id}`} 
                      key={cg._id} 
                      className="bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all px-3.5 py-2 rounded-xl text-xs text-gray-800 font-bold flex items-center gap-2"
                    >
                      <User size={13} className="text-gray-400" />
                      <span>{cg.fullName}</span>
                      {cg.mobileNumber && <span className="text-gray-400 font-normal">({cg.mobileNumber})</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB NAVIGATION (Clean Monochrome Standard) ─── */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <Clock size={15} />
            <span>{t('profile.stayHistory', 'Stay History')}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {historyStays.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('khata')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'khata'
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:text-black hover:bg-gray-100'
            }`}
          >
            <BookOpen size={15} />
            <span>{t('profile.khataPassbook', 'Khata & Passbook')}</span>
            {Number(guest.ledgerBalance) !== 0 ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                Number(guest.ledgerBalance) > 0
                  ? activeTab === 'khata' ? 'bg-emerald-400 text-gray-950' : 'bg-emerald-100 text-emerald-800'
                  : activeTab === 'khata' ? 'bg-rose-400 text-gray-950' : 'bg-rose-100 text-rose-800'
              }`}>
                {Number(guest.ledgerBalance) > 0
                  ? `+₹${Number(guest.ledgerBalance).toLocaleString('en-IN')}`
                  : `-₹${Math.abs(Number(guest.ledgerBalance)).toLocaleString('en-IN')}`}
              </span>
            ) : (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'khata' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {ledgerEntries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Stay History Tab Content ─── */}
      <div className={activeTab === 'history' ? 'block' : 'hidden print:block'}>
        <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden">
          <div className="px-6 sm:px-8 py-4 border-b border-gray-100 bg-gray-50/70 flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-900 flex items-center uppercase tracking-wider">
              <Clock size={16} className="mr-2 text-gray-400" /> Past Stay History
            </h2>
            <span className="text-[11px] font-bold text-gray-500 bg-gray-200/60 px-3 py-1 rounded-full">
              {historyStays.length} {historyStays.length === 1 ? 'Stay' : 'Stays'} Recorded
            </span>
          </div>
          
          {(!historyStays || historyStays.length === 0) ? (
            <div className="p-12 text-center text-gray-400 font-medium">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-bold text-gray-500">No past stays found for this guest.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left whitespace-nowrap">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Checkout</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {historyStays.map((stay) => {
                    const isPrimary = (typeof stay.guest === 'object' ? stay.guest?._id : stay.guest) === guest._id;
                    return (
                    <tr key={stay._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-900 text-sm">{stay.room?.roomNumber || 'N/A'}</p>
                          {!isPrimary && (
                            <span className="bg-gray-100 text-gray-700 text-[9px] px-2 py-0.5 rounded border border-gray-200 font-black uppercase tracking-widest">Co-Guest</span>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5">{stay.occupants} Guests</p>
                        
                        {!isPrimary && stay.guest?._id ? (
                          <Link to={`/guests/${stay.guest._id}`} className="inline-block text-[10px] font-bold text-gray-700 hover:text-black hover:underline mt-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                            Primary: {stay.guest?.fullName || 'Unknown'}
                          </Link>
                        ) : null}
                        
                        {stay.coGuests && stay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">With:</p>
                            <div className="flex flex-wrap gap-1">
                              {stay.coGuests.filter(cg => cg._id !== guest._id).map(cg => (
                                <Link to={`/guests/${cg._id}`} key={cg._id} className="text-[9px] font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-black px-2 py-0.5 rounded border border-gray-200 transition-colors">
                                  {cg.fullName || 'Unknown'}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 text-xs">{format(new Date(stay.checkInDate), 'dd MMM yyyy')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{format(new Date(stay.checkInDate), 'hh:mm a')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900 text-xs">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'dd MMM yyyy') : format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'hh:mm a') : format(new Date(stay.expectedCheckOutDate), 'hh:mm a')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-900 text-sm">₹{stay.totalAmount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 inline-flex text-[10px] font-black uppercase tracking-wider rounded-lg border ${
                          stay.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                          stay.status === 'Cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {stay.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button 
                            onClick={() => handlePrint(stay)}
                            className="text-gray-500 hover:text-black bg-white hover:bg-gray-50 p-2 rounded-xl transition-colors border border-gray-200 cursor-pointer shadow-2xs"
                            title="Print Invoice / Bill"
                          >
                            <Printer size={15} />
                          </button>
                          <button 
                            onClick={() => setSelectedGrcStay(stay)}
                            className="text-gray-700 hover:text-black bg-white hover:bg-gray-50 px-2.5 py-1.5 rounded-xl transition-colors border border-gray-200 flex items-center gap-1 font-bold text-xs shadow-2xs cursor-pointer active:scale-95"
                            title="Print Guest Registration Card (GRC)"
                          >
                            <FileText size={13} />
                            <span className="text-[10px] font-black uppercase tracking-wider">GRC</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ─── Guest Khata & Wallet Passbook Tab Content (Clean Luxury Style) ─── */}
      <div className={activeTab === 'khata' ? 'block' : 'hidden print:block'}>
        <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden print:border-none">
          <div className="bg-gray-950 px-6 sm:px-8 py-5 text-white flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                <BookOpen size={18} />
              </div>
              <div>
                <h2 className="text-base font-black uppercase tracking-wider">
                  {t('profile.khataPassbook', 'Khata & Advance Passbook')}
                </h2>
                <p className="text-xs text-gray-400 font-medium">
                  {t('profile.ledgerTransactions', 'Wallet deposit & credit ledger')} • {guest.fullName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setFormAmount(''); setFormNotes(''); setLedgerActionError(''); setDepositModalOpen(true); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <PlusCircle size={14} /> {t('profile.addAdvance', '+ Advance Jama')}
              </button>
              <button
                type="button"
                onClick={() => { setFormAmount(''); setFormNotes(''); setLedgerActionError(''); setPaymentModalOpen(true); }}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
              >
                <ArrowDownLeft size={14} /> {t('profile.wasoolDue', 'Wasool Karein')}
              </button>
              {getWhatsAppStatementUrl() && (
                <a
                  href={getWhatsAppStatementUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
                  title="Send Khata Statement on WhatsApp"
                >
                  <Share2 size={13} /> WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors print:hidden cursor-pointer"
                title="Print Passbook Statement"
              >
                <Printer size={13} /> {t('common.print', 'Print')}
              </button>
            </div>
          </div>

          {/* Balance KPI Banner */}
          <div className="p-6 bg-gray-50/70 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {isHindi ? 'वर्तमान लेजर स्थिति' : 'Current Ledger Status'}
              </span>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl font-black ${
                  Number(guest.ledgerBalance) > 0 ? 'text-emerald-600' : Number(guest.ledgerBalance) < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {Number(guest.ledgerBalance) > 0
                    ? `+₹${Number(guest.ledgerBalance).toLocaleString('en-IN')}`
                    : Number(guest.ledgerBalance) < 0
                    ? `-₹${Math.abs(Number(guest.ledgerBalance)).toLocaleString('en-IN')}`
                    : '₹0'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  Number(guest.ledgerBalance) > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : Number(guest.ledgerBalance) < 0
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {Number(guest.ledgerBalance) > 0
                    ? (isHindi ? 'अग्रिम जमा (Advance Wallet)' : 'Advance / Wallet (जमा)')
                    : Number(guest.ledgerBalance) < 0
                    ? (isHindi ? 'बकाया उधार (Pending Due)' : 'Pending Due / Udhaar (उधार बाकी)')
                    : (isHindi ? 'खाता चुकता (Cleared)' : 'All Cleared (चुकता)')}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {isHindi ? 'कुल दर्ज लेनदेन' : 'Total Recorded Entries'}
              </span>
              <div className="mt-1 text-2xl font-black text-gray-900">
                {ledgerEntries.length} {isHindi ? 'एंट्रीज' : 'Transactions'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {t('profile.primaryContact', 'Primary Contact')}
              </span>
              <div className="mt-1 text-sm font-bold text-gray-800 truncate">
                {guest.mobileNumber || 'No mobile'} {guest.idProofNumber ? `• ${guest.idProofType}: ${guest.idProofNumber}` : ''}
              </div>
            </div>
          </div>

          {/* Passbook Table with Sticky Header and Scrollable Body */}
          {ledgerLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm font-medium">{t('common.loading', 'Loading passbook entries...')}</div>
          ) : ledgerEntries.length === 0 ? (
            <div className="p-10 text-center text-gray-400 font-medium text-sm">
              <p>{t('profile.noLedgerEntries', 'No ledger transactions recorded yet for this guest.')}</p>
              <p className="text-xs text-gray-400 mt-1">{isHindi ? 'नया डिपॉजिट जोड़ने के लिए "+ एडवांस जमा" पर क्लिक करें।' : 'Use "+ Advance Jama" to add deposit, or record payments with Wallet or Khata.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50/95 backdrop-blur-xs z-10">
                  <tr className="border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-5">{t('common.date', 'Date')}</th>
                    <th className="py-3 px-4">{t('common.status', 'Type')}</th>
                    <th className="py-3 px-4">{isHindi ? 'विवरण' : 'Description / Details'}</th>
                    <th className="py-3 px-4">{isHindi ? 'माध्यम' : 'Mode'}</th>
                    <th className="py-3 px-4 text-right">{t('common.amount', 'Amount')}</th>
                    <th className="py-3 px-5 text-right">{isHindi ? 'शेष खाता' : 'Balance After'}</th>
                    <th className="py-3 px-4">{isHindi ? 'स्टाफ' : 'Staff'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                  {ledgerEntries.map((entry) => {
                    const isCredit = entry.entryType === 'DEPOSIT' || entry.entryType === 'PAYMENT' || entry.entryType === 'REVERSAL' || entry.entryType === 'REFUND';
                    return (
                      <tr key={entry._id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-5 font-mono text-gray-500 whitespace-nowrap">
                          {format(new Date(entry.date || entry.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                            entry.entryType === 'DEPOSIT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.entryType === 'PAYMENT'
                              ? 'bg-blue-100 text-blue-800'
                              : entry.entryType === 'REVERSAL' || entry.entryType === 'REFUND'
                              ? 'bg-teal-100 text-teal-800'
                              : entry.entryType === 'WALLET_DEDUCTION'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {isCredit ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                            {entry.entryType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs text-gray-700">
                          <span className="font-bold">{entry.description || '-'}</span>
                          {entry.stay && (
                            <span className="block text-[10px] text-gray-400 font-normal">
                              Room Stay ({entry.stay.status})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-600 font-bold">
                          {entry.paymentMethod || 'Cash'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap font-black font-mono">
                          <span className={isCredit ? 'text-emerald-600' : 'text-red-600'}>
                            {isCredit ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap font-black font-mono">
                          <span className={entry.balanceAfter > 0 ? 'text-emerald-700' : entry.balanceAfter < 0 ? 'text-red-700' : 'text-gray-900'}>
                            {entry.balanceAfter < 0
                              ? `-₹${Math.abs(entry.balanceAfter).toLocaleString('en-IN')}`
                              : `₹${Number(entry.balanceAfter || 0).toLocaleString('en-IN')}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-gray-400 text-[11px]">
                          {entry.createdBy?.name || 'Staff'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Extend Stay Modal */}
      {extendModalOpen && selectedStay && (
        <ExtendStayModal 
          stay={selectedStay} 
          onClose={() => { setExtendModalOpen(false); setSelectedStay(null); }}
          onSuccess={() => { setExtendModalOpen(false); setSelectedStay(null); fetchGuest(); }}
        />
      )}

      {/* Deposit Advance Modal */}
      {depositModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDepositModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Deposit Advance (जमा करें)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Adds credit to guest advance wallet</p>
                </div>
              </div>
              <button onClick={() => setDepositModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            {ledgerActionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle size={15} /> {ledgerActionError}
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Deposit Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 5000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-base text-gray-900 focus:ring-2 focus:ring-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Payment Mode *
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
                >
                  <option value="Cash">Cash (नकद)</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly corporate advance deposit"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLedger}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingLedger ? 'Saving...' : 'Confirm Deposit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Khata Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPaymentModalOpen(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowDownLeft size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">Receive Payment (उधार वसूली)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">Record payment received against outstanding due</p>
                </div>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={18} />
              </button>
            </div>

            {Number(guest.ledgerBalance) < 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex justify-between items-center">
                <span className="font-bold text-amber-900">Current Outstanding Due:</span>
                <span className="font-black text-red-600 text-sm">₹{Math.abs(Number(guest.ledgerBalance)).toLocaleString('en-IN')}</span>
              </div>
            )}

            {ledgerActionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600 flex items-center gap-2">
                <AlertCircle size={15} /> {ledgerActionError}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500">
                    Received Amount (₹) *
                  </label>
                  {Number(guest.ledgerBalance) < 0 && (
                    <button
                      type="button"
                      onClick={() => setFormAmount(String(Math.abs(Number(guest.ledgerBalance))))}
                      className="text-[10px] font-black text-amber-700 hover:underline cursor-pointer"
                    >
                      Full Due (₹{Math.abs(Number(guest.ledgerBalance))})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-gray-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 2000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-base text-gray-900 focus:ring-2 focus:ring-black outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Payment Mode *
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
                >
                  <option value="Cash">Cash (नकद)</option>
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5">
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared bill for last week visits"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-xs text-gray-900 focus:ring-2 focus:ring-black outline-none"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLedger}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingLedger ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestProfile;
