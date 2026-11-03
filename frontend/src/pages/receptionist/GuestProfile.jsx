import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { User, Phone, CheckCircle, Clock, Printer, FileText, Wallet, BookOpen, Share2, PlusCircle, ArrowDownLeft, ArrowUpRight, X, AlertCircle } from 'lucide-react';
import { printInvoice } from '../../utils/invoice';
import ExtendStayModal from './ExtendStayModal';
import ShiftRoomModal from './ShiftRoomModal';
import GuestRegistrationCardModal from '../../components/reception/GuestRegistrationCardModal';

const GuestProfile = () => {
  const { id } = useParams();
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

  if (loading) return <div>Loading...</div>;
  if (!guest) return <div>Guest not found</div>;


  const activeStay = guest.stays?.find(s => ['Active', 'Upcoming', 'Checkout Due', 'Overdue'].includes(s.status));
  const historyStays = guest.stays?.filter(s => s._id !== activeStay?._id);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-10">
      
      {/* ─── Profile Header ─── */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="w-20 h-20 bg-gradient-to-tr from-gray-900 to-black rounded-2xl flex items-center justify-center text-white shadow-lg">
            <User size={36} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">{guest.fullName}</h1>
            <div className="flex flex-wrap items-center text-gray-500 mt-2 gap-3">
              <span className="flex items-center text-sm font-bold bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
                <Phone size={16} className="mr-2 text-gray-400" />
                {guest.mobileNumber}
              </span>
              {guest.idProofNumber && (
                <span className="flex items-center text-xs font-black uppercase tracking-widest bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200">
                  {guest.idProofType}: {guest.idProofNumber}
                </span>
              )}
            </div>
            
            {(guest.idProofImage || guest.idProofImageBack) && (
              <div className="mt-4 flex flex-wrap gap-3">
                {guest.idProofImage && (
                  <a href={(guest.idProofImage?.startsWith('http') ? guest.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImage}`)} target="_blank" rel="noreferrer" 
                     className="text-[10px] text-indigo-700 font-black uppercase tracking-widest hover:text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 transition-colors flex items-center gap-2">
                    <span className="text-sm">🔍</span> VIEW ID FRONT
                  </a>
                )}
                {guest.idProofImageBack && (
                  <a href={(guest.idProofImageBack?.startsWith('http') ? guest.idProofImageBack : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${guest.idProofImageBack}`)} target="_blank" rel="noreferrer" 
                     className="text-[10px] text-indigo-700 font-black uppercase tracking-widest hover:text-indigo-900 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 transition-colors flex items-center gap-2">
                    <span className="text-sm">🔍</span> VIEW ID BACK
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0 flex flex-wrap items-center gap-2">
          {Number(guest.ledgerBalance) > 0 && (
            <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Wallet size={15} className="text-emerald-600" />
              <span>Wallet: ₹{Number(guest.ledgerBalance).toLocaleString('en-IN')}</span>
            </div>
          )}
          {Number(guest.ledgerBalance) < 0 && (
            <div className="px-4 py-2 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <BookOpen size={15} className="text-red-600" />
              <span>Khata Due: ₹{Math.abs(Number(guest.ledgerBalance)).toLocaleString('en-IN')}</span>
            </div>
          )}
          {activeStay ? (
            <span className="px-4 py-2 inline-flex text-xs uppercase tracking-widest font-black rounded-xl bg-green-500 text-white shadow-md items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> Active Guest
            </span>
          ) : (
            <span className="px-4 py-2 inline-flex text-xs uppercase tracking-widest font-black rounded-xl bg-gray-100 text-gray-500 border border-gray-200">
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* ─── Active Stay ─── */}
      {activeStay && (
        <div className="bg-white rounded-3xl shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 sm:px-8 py-5 border-b border-blue-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <h2 className="text-xl font-black text-blue-900 flex items-center uppercase tracking-tight">
              <CheckCircle size={24} className="mr-3 text-blue-600" /> Current Stay
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button 
                onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }}
                className="w-full sm:w-auto bg-white text-blue-700 font-black uppercase tracking-widest text-xs border-2 border-blue-200 px-5 py-2.5 rounded-xl hover:bg-blue-100 transition-all active:scale-95"
              >
                Extend Stay
              </button>
              <button 
                onClick={() => setSelectedGrcStay(activeStay)}
                className="w-full sm:w-auto bg-indigo-600 text-white font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                title="Print Guest Registration Card (GRC)"
              >
                <FileText size={16} /> Print GRC
              </button>
              <button 
                onClick={() => handlePrint(activeStay)}
                className="w-full sm:w-auto bg-blue-600 text-white font-black uppercase tracking-widest text-xs px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Print Bill
              </button>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room</p>
              <div className="flex items-center gap-2">
                <p className="font-black text-gray-900 text-xl">{activeStay.room?.roomNumber}</p>
                {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-purple-200">Co-Guest</span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests` : `1 Guest`}</p>
              {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                 <Link to={`/guests/${typeof activeStay.guest === 'object' ? activeStay.guest._id : activeStay.guest}`} className="inline-block text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline mt-1 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 transition-colors">
                   Primary: {activeStay.guest?.fullName || 'Unknown'}
                 </Link>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.checkInDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.checkInDate), 'hh:mm a')}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Expected Checkout</p>
              <p className="font-bold text-gray-900 text-sm leading-tight">{format(new Date(activeStay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{format(new Date(activeStay.expectedCheckOutDate), 'hh:mm a')}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-red-500' : 'text-green-600'}`}>Balance Due</p>
              <p className={`font-black text-2xl ${activeStay.totalAmount - activeStay.paidAmount > 0 ? 'text-red-600' : 'text-green-700'}`}>
                ₹{activeStay.totalAmount - activeStay.paidAmount}
              </p>
              <p className="text-xs font-bold text-gray-500 mt-1">Total: ₹{activeStay.totalAmount}</p>
            </div>
            
            {activeStay.coGuests && activeStay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && (
              <div className="col-span-2 lg:col-span-4 mt-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Co-Guests</p>
                <div className="flex flex-wrap gap-3">
                  {activeStay.coGuests.filter(cg => cg._id !== guest._id).map(cg => (
                    <Link to={`/guests/${cg._id}`} key={cg._id} className="bg-white border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 transition-all px-4 py-2 rounded-xl text-sm text-gray-800 font-bold flex flex-col sm:flex-row sm:items-center gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center"><User size={12} className="text-indigo-600"/></div>
                        {cg.fullName} <span className="text-gray-400 font-medium">({cg.mobileNumber})</span>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-2">
                        {cg.idProofType && cg.idProofNumber && (
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                             {cg.idProofType}: {cg.idProofNumber}
                           </span>
                        )}
                        {cg.idProofImage && (
                          <a href={(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImage}`)} target="_blank" rel="noreferrer" 
                             onClick={(e) => e.stopPropagation()}
                             className="text-[10px] uppercase tracking-wider font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-200 border border-indigo-200 transition-colors">
                            View Front
                          </a>
                        )}
                        {cg.idProofImageBack && (
                          <a href={(cg.idProofImageBack?.startsWith('http') ? cg.idProofImageBack : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImageBack}`)} target="_blank" rel="noreferrer" 
                             onClick={(e) => e.stopPropagation()}
                             className="text-[10px] uppercase tracking-wider font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-200 border border-indigo-200 transition-colors">
                            View Back
                          </a>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Guest Khata & Wallet Passbook ─── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden print:border-none">
        <div className="bg-gradient-to-r from-gray-900 to-black px-6 sm:px-8 py-5 text-white flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Khata & Advance Passbook (खाता लेजर)
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Wallet deposit & credit ledger transactions for {guest.fullName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => { setFormAmount(''); setFormNotes(''); setLedgerActionError(''); setDepositModalOpen(true); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <PlusCircle size={15} /> + Advance Jama Karein
            </button>
            <button
              onClick={() => { setFormAmount(''); setFormNotes(''); setLedgerActionError(''); setPaymentModalOpen(true); }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <ArrowDownLeft size={15} /> 💰 Wasool Karein
            </button>
            {getWhatsAppStatementUrl() && (
              <a
                href={getWhatsAppStatementUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
                title="Send Khata Statement on WhatsApp"
              >
                <Share2 size={14} /> WhatsApp
              </a>
            )}
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors print:hidden cursor-pointer"
              title="Print Passbook Statement"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Balance KPI Banner */}
        <div className="p-6 bg-gray-50/70 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Ledger Status</span>
            <div className="mt-1 flex items-baseline gap-2">
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
                  ? 'Advance / Wallet (जमा)'
                  : Number(guest.ledgerBalance) < 0
                  ? 'Pending Due / Udhaar (उधार बाकी)'
                  : 'All Cleared (चुकता)'}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Recorded Entries</span>
            <div className="mt-1 text-2xl font-black text-gray-900">
              {ledgerEntries.length} Transactions
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Contact</span>
            <div className="mt-1 text-sm font-bold text-gray-800 truncate">
              {guest.mobileNumber || 'No mobile'} {guest.idProofNumber ? `• ${guest.idProofType}: ${guest.idProofNumber}` : ''}
            </div>
          </div>
        </div>

        {/* Passbook Table */}
        {ledgerLoading ? (
          <div className="p-8 text-center text-gray-400 text-sm font-medium">Loading passbook entries...</div>
        ) : ledgerEntries.length === 0 ? (
          <div className="p-10 text-center text-gray-400 font-medium text-sm">
            <p>No ledger transactions recorded yet for this guest.</p>
            <p className="text-xs text-gray-400 mt-1">Use "+ Advance Jama Karein" to add deposit, or check in/out with Wallet or Khata.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description / Details</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Balance After</th>
                  <th className="py-3 px-4">Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                {ledgerEntries.map((entry) => {
                  const isCredit = entry.entryType === 'DEPOSIT' || entry.entryType === 'PAYMENT';
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
                          ₹{entry.balanceAfter.toLocaleString('en-IN')}
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

      {/* ─── Stay History ─── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 sm:px-8 py-6 border-b border-gray-100 bg-gray-50">
          <h2 className="text-xl font-black text-gray-900 flex items-center uppercase tracking-tight">
            <Clock size={24} className="mr-3 text-gray-400" /> Stay History
          </h2>
        </div>
        
        {(!historyStays || historyStays.length === 0) ? (
          <div className="p-12 text-center text-gray-500 font-medium">No past stays found for this guest.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left whitespace-nowrap">
              <thead className="bg-white border-b-2 border-gray-100">
                <tr>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Room</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check-in</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Checkout</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Bill</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {historyStays.map((stay) => {
                  const isPrimary = (typeof stay.guest === 'object' ? stay.guest?._id : stay.guest) === guest._id;
                  return (
                  <tr key={stay._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 text-base">{stay.room?.roomNumber || 'N/A'}</p>
                        {!isPrimary && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded border border-purple-200 font-black uppercase tracking-widest">Co-Guest</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.occupants} Guests</p>
                      
                      {!isPrimary && stay.guest?._id ? (
                        <Link to={`/guests/${stay.guest._id}`} className="inline-block text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline mt-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          Primary: {stay.guest?.fullName || 'Unknown'}
                        </Link>
                      ) : !isPrimary && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: Unknown</p>
                      )}
                      
                      {stay.coGuests && stay.coGuests.filter(cg => cg._id !== guest._id).length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">With:</p>
                          <div className="flex flex-wrap gap-1">
                            {stay.coGuests.filter(cg => cg._id !== guest._id).map(cg => (
                              <Link to={`/guests/${cg._id}`} key={cg._id} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 px-2 py-1 rounded-md border border-indigo-100 transition-colors">
                                {cg.fullName || 'Unknown'}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 text-sm">{format(new Date(stay.checkInDate), 'dd MMM yyyy')}</p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5">{format(new Date(stay.checkInDate), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-gray-900 text-sm">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'dd MMM yyyy') : format(new Date(stay.expectedCheckOutDate), 'dd MMM yyyy')}</p>
                      <p className="text-xs font-bold text-gray-400 mt-0.5">{stay.actualCheckOutDate ? format(new Date(stay.actualCheckOutDate), 'hh:mm a') : format(new Date(stay.expectedCheckOutDate), 'hh:mm a')}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-black text-gray-900 text-base">₹{stay.totalAmount}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-black uppercase tracking-widest rounded-lg border ${
                        stay.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                        stay.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {stay.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handlePrint(stay)}
                          className="text-gray-500 hover:text-black bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl transition-colors border border-gray-200"
                          title="Print Invoice / Bill"
                        >
                          <Printer size={16} />
                        </button>
                        <button 
                          onClick={() => setSelectedGrcStay(stay)}
                          className="text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-colors border border-indigo-200 flex items-center gap-1.5 font-black text-xs shadow-2xs cursor-pointer active:scale-95"
                          title="Print Guest Registration Card (GRC)"
                        >
                          <FileText size={15} />
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
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
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
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
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
