import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import {
  X, Users, Building2, CheckCircle2, AlertCircle, Plus, Trash2,
  Calendar, Clock, CreditCard, ChevronRight, Share2, Printer,
  FileText, ShieldCheck, Check, Sparkles, Bed, Phone, User, RefreshCw
} from 'lucide-react';
import PaymentMethodSelector, { validateSplitPayment, buildSplitPayments } from '../common/PaymentMethodSelector';
import MergedCorporateInvoiceModal from '../MergedCorporateInvoiceModal';
import { apiCache } from '../../utils/apiCache';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const toDateTimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function GroupCheckInModal({
  isOpen,
  onClose,
  onSuccess,
  defaultHostelId,
  rooms = []
}) {
  if (!isOpen) return null;

  // Active step in modal: 'form' | 'success'
  const [modalView, setModalView] = useState('form');
  const [createdGroupData, setCreatedGroupData] = useState(null);
  const [showMergedInvoice, setShowMergedInvoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setModalView('form');
    setCreatedGroupData(null);
    setSelectedRoomsMap({});
    setGroupName('');
    setBookerName('');
    setBookerMobile('');
    setBookerEmail('');
    setBookerIdNumber('');
    setBookerAddress('');
    setHasCorporateGst(false);
    setCompanyName('');
    setGstin('');
    setAdvanceAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  // 1. Group Meta
  const [groupType, setGroupType] = useState('Corporate'); // 'Corporate' | 'Family' | 'Tour' | 'Other'
  const [groupName, setGroupName] = useState('');
  
  // 2. Dates
  const now = new Date();
  const [checkInDate, setCheckInDate] = useState(() => toDateTimeLocal(now));
  const [checkOutDate, setCheckOutDate] = useState(() => toDateTimeLocal(addDays(now, 1)));
  const [durationNights, setDurationNights] = useState(1);

  // 3. Primary Booker (Master Folio Contact)
  const [bookerName, setBookerName] = useState('');
  const [bookerMobile, setBookerMobile] = useState('');
  const [bookerEmail, setBookerEmail] = useState('');
  const [bookerIdType, setBookerIdType] = useState('Aadhaar');
  const [bookerIdNumber, setBookerIdNumber] = useState('');
  const [bookerAddress, setBookerAddress] = useState('');

  // 4. Corporate Billing / GST Details
  const [hasCorporateGst, setHasCorporateGst] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [gstRate, setGstRate] = useState(12);
  const [gstType, setGstType] = useState('exclusive'); // 'exclusive' | 'inclusive'

  // 5. Room Selection (Multi-Room)
  // Store an object or map for selected rooms: { [roomId]: { rate, occupants, guestName, guestMobile, sameAsBooker } }
  const [selectedRoomsMap, setSelectedRoomsMap] = useState({});
  const [roomFilterFloor, setRoomFilterFloor] = useState('All');
  const [roomSearch, setRoomSearch] = useState('');

  // 6. Billing & Advance Payment
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitBreakdown, setSplitBreakdown] = useState({ cash: '', upi: '', card: '' });
  const [notes, setNotes] = useState('');

  // Auto-search guest when mobile reaches 10 digits
  useEffect(() => {
    const cleanMobile = bookerMobile.trim();
    if (cleanMobile.length === 10) {
      axios.get(`${API}/api/guests?mobile=${cleanMobile}`)
        .then(res => {
          const list = res.data?.data || [];
          if (list.length > 0) {
            const g = list[0];
            if (!bookerName) setBookerName(g.fullName || '');
            if (!bookerEmail && g.email) setBookerEmail(g.email);
            if (!bookerIdNumber && g.idProofNumber) setBookerIdNumber(g.idProofNumber);
            if (!bookerAddress && g.address) setBookerAddress(g.address);
            if (g.companyName) {
              setHasCorporateGst(true);
              setCompanyName(g.companyName);
              if (g.gstin) setGstin(g.gstin);
            }
          }
        })
        .catch(() => {});
    }
  }, [bookerMobile]);

  // Extract available rooms (status === 'Active' and NOT occupied)
  const availableRoomsList = useMemo(() => {
    return rooms.filter(r => r.status === 'Active' && !r.isOccupied);
  }, [rooms]);

  // Distinct floors
  const floors = useMemo(() => {
    const s = new Set();
    availableRoomsList.forEach(r => {
      if (r.floor !== undefined && r.floor !== null) s.add(String(r.floor));
    });
    return ['All', ...Array.from(s).sort()];
  }, [availableRoomsList]);

  // Filtered rooms in grid
  const filteredRooms = useMemo(() => {
    return availableRoomsList.filter(r => {
      const matchFloor = roomFilterFloor === 'All' || String(r.floor) === roomFilterFloor;
      const matchSearch = !roomSearch || r.roomNumber?.toLowerCase().includes(roomSearch.toLowerCase());
      return matchFloor && matchSearch;
    });
  }, [availableRoomsList, roomFilterFloor, roomSearch]);

  // Toggle room selection
  const toggleRoom = (room) => {
    const id = room._id;
    setSelectedRoomsMap(prev => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        const standardRate = Number(room.price24h) || Number(room.price) || 1000;
        next[id] = {
          roomId: id,
          roomNumber: room.roomNumber,
          rate: standardRate * durationNights,
          occupants: Math.min(2, room.capacity || 2),
          sameAsBooker: true,
          guestName: '',
          guestMobile: ''
        };
      }
      return next;
    });
  };

  // Adjust duration quick buttons
  const handleSetDuration = (days) => {
    const count = Math.max(1, Number(days) || 1);
    setDurationNights(count);
    const start = new Date(checkInDate);
    if (!isNaN(start.getTime())) {
      setCheckOutDate(toDateTimeLocal(addDays(start, count)));
    }
    // Update all selected rooms rates
    setSelectedRoomsMap(prev => {
      const next = { ...prev };
      for (const id in next) {
        const rDoc = rooms.find(r => r._id === id);
        const base = Number(rDoc?.price24h) || Number(rDoc?.price) || 1000;
        next[id].rate = base * count;
      }
      return next;
    });
  };

  // Calculations
  const selectedCount = Object.keys(selectedRoomsMap).length;
  const subtotalTariff = useMemo(() => {
    return Object.values(selectedRoomsMap).reduce((acc, r) => acc + (Number(r.rate) || 0), 0);
  }, [selectedRoomsMap]);

  const taxAmount = useMemo(() => {
    if (!hasCorporateGst || !gstRate) return 0;
    if (gstType === 'inclusive') {
      return Math.round((subtotalTariff - (subtotalTariff / (1 + gstRate / 100))) * 100) / 100;
    }
    return Math.round((subtotalTariff * (gstRate / 100)) * 100) / 100;
  }, [hasCorporateGst, gstRate, gstType, subtotalTariff]);

  const grandTotal = useMemo(() => {
    if (hasCorporateGst && gstType === 'exclusive') {
      return subtotalTariff + taxAmount;
    }
    return subtotalTariff;
  }, [hasCorporateGst, gstType, subtotalTariff, taxAmount]);

  const numericAdvance = Math.max(0, Number(advanceAmount) || 0);
  const balanceDue = Math.max(0, grandTotal - numericAdvance);

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedCount === 0) {
      setError('Kripya kam se kam 1 ya zyada rooms select karein.');
      return;
    }

    if (!bookerName.trim()) {
      setError('Primary booker ka Full Name zaroori hai.');
      return;
    }

    if (!bookerMobile.trim() || bookerMobile.trim().length < 10) {
      setError('Valid 10-digit Primary Booker Mobile Number dalein.');
      return;
    }

    if (hasCorporateGst && !companyName.trim()) {
      setError('Corporate GST ke liye Company Name bharna zaroori hai.');
      return;
    }

    // Validate split payment if chosen
    if (paymentMethod === 'Split') {
      const splitErr = validateSplitPayment(numericAdvance, splitBreakdown);
      if (splitErr) {
        setError(splitErr);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Build rooms payload
      const roomsPayload = Object.values(selectedRoomsMap).map(item => {
        const guestData = item.sameAsBooker ? {
          fullName: bookerName.trim(),
          mobileNumber: bookerMobile.trim(),
          idProofType: bookerIdType,
          idProofNumber: bookerIdNumber.trim(),
          address: bookerAddress.trim()
        } : {
          fullName: (item.guestName || bookerName).trim(),
          mobileNumber: (item.guestMobile || bookerMobile).trim(),
          idProofType: 'Other',
          address: bookerAddress.trim()
        };

        return {
          room: item.roomId,
          rate: Number(item.rate) || 0,
          occupants: Number(item.occupants) || 1,
          guest: guestData
        };
      });

      const splitPayments = paymentMethod === 'Split' ? buildSplitPayments(splitBreakdown) : undefined;

      const payload = {
        hostel: defaultHostelId,
        groupName: (groupName && groupName.trim()) || `${bookerName.trim()}'s ${groupType} Group`,
        groupType,
        checkInDate,
        expectedCheckOutDate: checkOutDate,
        durationOption: `${durationNights}N`,
        primaryGuest: {
          fullName: bookerName.trim(),
          mobileNumber: bookerMobile.trim(),
          email: bookerEmail.trim() || undefined,
          idProofType: bookerIdType,
          idProofNumber: bookerIdNumber.trim(),
          address: bookerAddress.trim(),
          companyName: hasCorporateGst ? companyName.trim() : undefined,
          gstin: hasCorporateGst ? gstin.trim().toUpperCase() : undefined,
          billingAddress: hasCorporateGst ? (billingAddress || bookerAddress).trim() : undefined
        },
        rooms: roomsPayload,
        initialPaymentAmount: numericAdvance,
        paymentMethod: paymentMethod === 'Split' ? 'Mixed' : paymentMethod,
        splitPayments,
        gstApplied: hasCorporateGst,
        gstType: hasCorporateGst ? gstType : 'none',
        gstRate: hasCorporateGst ? Number(gstRate) : 0,
        companyName: hasCorporateGst ? companyName.trim() : '',
        gstin: hasCorporateGst ? gstin.trim().toUpperCase() : '',
        billingAddress: hasCorporateGst ? (billingAddress || bookerAddress).trim() : '',
        notes: notes.trim()
      };

      const res = await axios.post(`${API}/api/stays/group-checkin`, payload);
      apiCache.invalidate('rooms');
      window.dispatchEvent(new Event('hotelDataInvalidated'));
      setCreatedGroupData(res.data?.data);
      setModalView('success');
      if (onSuccess) onSuccess(res.data?.data);
    } catch (err) {
      console.error('Group checkin error:', err);
      setError(err.response?.data?.message || err.message || 'Group check-in me error aaya.');
    } finally {
      setSubmitting(false);
    }
  };

  // WhatsApp share link for group confirmation
  const getWhatsAppShareUrl = () => {
    if (!createdGroupData) return '#';
    const roomNums = createdGroupData.stays?.map(s => s.room?.roomNumber).filter(Boolean).join(', ');
    const checkinTime = format(new Date(checkInDate), 'dd MMM yyyy, hh:mm a');
    const checkoutTime = format(new Date(checkOutDate), 'dd MMM yyyy, hh:mm a');
    const propertyName = createdGroupData.stays?.[0]?.hostel?.name || 'Our Hotel';

    const text = `🏨 *${propertyName} - Group Booking Confirmation*\n\n` +
      `Dear *${bookerName}*,\n` +
      `Your group check-in has been successfully completed! Details below:\n\n` +
      `🏷️ *Group:* ${createdGroupData.groupName}\n` +
      `🔑 *Rooms Assigned (${createdGroupData.totalRooms}):* ${roomNums}\n` +
      `📅 *Check-In:* ${checkinTime}\n` +
      `📅 *Check-Out:* ${checkoutTime}\n` +
      `💰 *Total Tariff:* ₹${createdGroupData.groupGrandTotal?.toLocaleString('en-IN')}\n` +
      `💵 *Advance Paid:* ₹${createdGroupData.advancePaid?.toLocaleString('en-IN')}\n` +
      `💳 *Balance Due:* ₹${createdGroupData.balanceDue?.toLocaleString('en-IN')}\n\n` +
      `We wish you and your guests a pleasant stay! Contact reception for any assistance.`;

    const phone = bookerMobile.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('91') && phone.length === 12 ? phone : `91${phone}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-4 sm:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <Building2 className="w-6 h-6 text-purple-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Group & Multi-Room Check-In
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Master Folio
                </span>
              </div>
              <p className="text-xs text-purple-100 font-medium mt-0.5">
                Corporate teams & large families ke liye multiple rooms ek hi click me check-in karein
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {modalView === 'success' ? (
          /* ================= SUCCESS CONFIRMATION VIEW ================= */
          <div className="p-6 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                Group Check-In Successful!
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                <span className="font-bold text-purple-700">{createdGroupData?.groupName}</span> ke {createdGroupData?.totalRooms} rooms ek sath check-in ho chuke hain.
              </p>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-lg mx-auto text-left space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Group ID</span>
                <span className="font-mono font-black text-slate-900">{createdGroupData?.groupId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Assigned Rooms</span>
                <span className="font-black text-purple-700">
                  {createdGroupData?.stays?.map(s => s.room?.roomNumber).filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Primary Booker</span>
                <span className="font-bold text-slate-900">{bookerName} ({bookerMobile})</span>
              </div>
              <div className="flex justify-between items-center pt-1 text-sm">
                <span className="font-bold text-slate-700">Total Group Tariff</span>
                <span className="font-black text-slate-900">₹{createdGroupData?.groupGrandTotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-emerald-700 font-bold">Advance Paid</span>
                <span className="font-black text-emerald-700">₹{createdGroupData?.advancePaid?.toLocaleString('en-IN')}</span>
              </div>
              {createdGroupData?.balanceDue > 0 && (
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 text-rose-600 font-black">
                  <span>Balance Due</span>
                  <span>₹{createdGroupData?.balanceDue?.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={getWhatsAppShareUrl()}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Share2 size={15} /> WhatsApp Confirmation
              </a>
              <button
                type="button"
                onClick={() => setShowMergedInvoice(true)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Printer size={15} /> Print Master Group Invoice
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Done (Go to Rooms)
              </button>
            </div>
          </div>
        ) : (
          /* ================= MAIN FORM VIEW ================= */
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-bold animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* SECTION 1: Group Identity & Duration */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Users size={14} className="text-purple-600" /> 1. Group Identity & Schedule
                </h3>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {['Corporate', 'Family', 'Tour', 'Other'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setGroupType(type)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        groupType === type
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Group Name / Booking Reference
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TCS Project Team, Sharma Wedding"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Check-In Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={checkInDate}
                    onChange={e => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Expected Check-Out
                    </label>
                    <div className="flex gap-1 text-[10px] font-black">
                      {[1, 2, 3].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleSetDuration(d)}
                          className={`px-1.5 py-0.5 rounded cursor-pointer ${
                            durationNights === d ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                          }`}
                        >
                          +{d}N
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    value={checkOutDate}
                    onChange={e => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Primary Booker (Master Folio Contact) & Corporate GST */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <User size={14} className="text-indigo-600" /> 2. Primary Booker / Coordinator Details
                </h3>
                <label className="flex items-center gap-2 text-xs font-bold text-purple-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCorporateGst}
                    onChange={e => setHasCorporateGst(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>Corporate Billing / GSTIN</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Coordinator / Booker Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={bookerName}
                    onChange={e => setBookerName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mobile Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="9876543210"
                    value={bookerMobile}
                    onChange={e => setBookerMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="coordinator@company.com"
                    value={bookerEmail}
                    onChange={e => setBookerEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    ID Proof Type
                  </label>
                  <select
                    value={bookerIdType}
                    onChange={e => setBookerIdType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Other">Other ID</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    ID Proof Number / Address
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="ID Number (Optional)"
                      value={bookerIdNumber}
                      onChange={e => setBookerIdNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                    <input
                      type="text"
                      placeholder="City / Address"
                      value={bookerAddress}
                      onChange={e => setBookerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Corporate GST Sub-Fields */}
              {hasCorporateGst && (
                <div className="pt-3 border-t border-purple-200/80 bg-purple-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-black text-purple-900 mb-1">
                      Company / Organization Name *
                    </label>
                    <input
                      type="text"
                      required={hasCorporateGst}
                      placeholder="e.g. Tata Consultancy Services Ltd"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-purple-900 mb-1">
                      Company GSTIN Number
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      placeholder="07AAAAA0000A1Z5"
                      value={gstin}
                      onChange={e => setGstin(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-white border border-purple-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-purple-900 mb-1">
                      GST Rate & Type
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={gstRate}
                        onChange={e => setGstRate(Number(e.target.value))}
                        className="px-2 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST</option>
                        <option value={5}>5% GST</option>
                      </select>
                      <select
                        value={gstType}
                        onChange={e => setGstType(e.target.value)}
                        className="px-2 py-2 bg-white border border-purple-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="exclusive">+ Exclusive</option>
                        <option value="inclusive">Inclusive</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: Multi-Room Selection */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Bed size={14} className="text-emerald-600" /> 3. Select Multiple Rooms ({selectedCount} Selected)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Group ke liye available rooms chunne ke liye click karein
                  </p>
                </div>

                {/* Filter / Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {floors.map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setRoomFilterFloor(f)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          roomFilterFloor === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                        }`}
                      >
                        {f === 'All' ? 'All Floors' : `F${f}`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Search #..."
                    value={roomSearch}
                    onChange={e => setRoomSearch(e.target.value)}
                    className="w-24 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-52 overflow-y-auto p-1">
                {filteredRooms.length === 0 ? (
                  <p className="col-span-full text-center text-xs text-slate-400 py-6">
                    Koi available room nahi mila.
                  </p>
                ) : (
                  filteredRooms.map(room => {
                    const isSelected = Boolean(selectedRoomsMap[room._id]);
                    const baseRate = Number(room.price24h) || Number(room.price) || 1000;
                    return (
                      <div
                        key={room._id}
                        onClick={() => toggleRoom(room)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer select-none text-left relative ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/80 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check size={11} strokeWidth={3} />
                          </div>
                        )}
                        <span className="font-black text-slate-900 text-sm block">
                          Room {room.roomNumber}
                        </span>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold mt-1">
                          <span>F{room.floor || '1'} • {room.capacity || 2}P</span>
                          <span className="font-black text-emerald-700">₹{baseRate * durationNights}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selected Rooms Customizer (Rate & Guest Assignment) */}
              {selectedCount > 0 && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Selected Rooms Configuration ({selectedCount} Rooms)
                  </span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {Object.values(selectedRoomsMap).map(item => (
                      <div
                        key={item.roomId}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded-lg font-black text-xs">
                            Room {item.roomNumber}
                          </span>
                          <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer font-bold text-[11px]">
                            <input
                              type="checkbox"
                              checked={item.sameAsBooker}
                              onChange={e => {
                                const checked = e.target.checked;
                                setSelectedRoomsMap(prev => ({
                                  ...prev,
                                  [item.roomId]: { ...prev[item.roomId], sameAsBooker: checked }
                                }));
                              }}
                              className="rounded text-purple-600 cursor-pointer"
                            />
                            <span>Use Booker Info</span>
                          </label>
                        </div>

                        {!item.sameAsBooker && (
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <input
                              type="text"
                              placeholder="Guest Name for Room"
                              value={item.guestName || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setSelectedRoomsMap(prev => ({
                                  ...prev,
                                  [item.roomId]: { ...prev[item.roomId], guestName: val }
                                }));
                              }}
                              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                            <input
                              type="tel"
                              placeholder="Phone"
                              maxLength={10}
                              value={item.guestMobile || ''}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setSelectedRoomsMap(prev => ({
                                  ...prev,
                                  [item.roomId]: { ...prev[item.roomId], guestMobile: val }
                                }));
                              }}
                              className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-bold">Tariff:</span>
                          <div className="relative w-24">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                            <input
                              type="number"
                              min={0}
                              value={item.rate}
                              onChange={e => {
                                const val = Number(e.target.value) || 0;
                                setSelectedRoomsMap(prev => ({
                                  ...prev,
                                  [item.roomId]: { ...prev[item.roomId], rate: val }
                                }));
                              }}
                              className="w-full pl-5 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-black text-xs text-slate-900"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleRoom({ _id: item.roomId })}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove Room"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4: Consolidated Billing & Advance Payment */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-600" /> 4. Master Folio Billing & Payment
              </h3>

              {/* Price Calculation Ribbon */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500">Rooms Subtotal</span>
                  <p className="text-base font-black text-slate-900">₹{subtotalTariff.toLocaleString('en-IN')}</p>
                </div>
                {hasCorporateGst && (
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-purple-700">GST ({gstRate}%)</span>
                    <p className="text-base font-black text-purple-700">₹{taxAmount.toLocaleString('en-IN')}</p>
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-slate-500">Grand Total</span>
                  <p className="text-lg font-black text-slate-900">₹{grandTotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-0.5 border-l border-slate-200 pl-4">
                  <span className="text-[11px] font-bold text-emerald-700">Advance Received</span>
                  <p className="text-base font-black text-emerald-700">₹{numericAdvance.toLocaleString('en-IN')}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-rose-600">Balance Due</span>
                  <p className="text-lg font-black text-rose-600">₹{balanceDue.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Advance Payment Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-600">Advance Payment (₹)</label>
                    <button
                      type="button"
                      onClick={() => setAdvanceAmount(String(grandTotal))}
                      className="text-[10px] font-black text-purple-700 hover:underline cursor-pointer"
                    >
                      Full Pay (₹{grandTotal})
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={grandTotal}
                    placeholder="0"
                    value={advanceAmount}
                    onChange={e => setAdvanceAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                  <PaymentMethodSelector
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    splitBreakdown={splitBreakdown}
                    setSplitBreakdown={setSplitBreakdown}
                    totalAmount={numericAdvance}
                  />
                </div>

                <div className="col-span-full">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Stay Notes & Special Requests
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Airport pickup arranged, extra towels in room 201"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || selectedCount === 0}
                className="px-7 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Checking In Group...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Group Check-In ({selectedCount} Rooms)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Embedded Merged Corporate Invoice Modal for Group Bill Print */}
      {showMergedInvoice && createdGroupData?.stays?.length > 0 && (
        <MergedCorporateInvoiceModal
          initialStays={createdGroupData.stays}
          allStays={createdGroupData.stays}
          onClose={() => setShowMergedInvoice(false)}
        />
      )}
    </div>,
    document.body
  );
}
