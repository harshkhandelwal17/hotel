import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import axios from 'axios';
import { 
  X, Printer, Share2, FileText, CheckCircle2, 
  Building2, Percent, AlertCircle, Plus, Trash2, 
  ChevronRight, ArrowRight, ShieldCheck, UserCheck, Check
} from 'lucide-react';
import { 
  calculateMergedInvoiceData, 
  printMergedInvoice, 
  getMergedInvoiceWhatsAppUrl,
  numberToWordsINR,
  GST_STATE_CODES 
} from '../utils/invoice';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

export default function MergedCorporateInvoiceModal({ 
  initialStays = [], 
  allStays = [], 
  onClose,
  onStayUpdated 
}) {
  // Collection of selected stays (at least 1, usually 2 or 3+)
  const [selectedStays, setSelectedStays] = useState(() => {
    if (initialStays.length > 0) {
      const primary = initialStays[0];
      if (primary?.groupId && allStays.length > 0) {
        const groupStays = allStays.filter(s => s.groupId === primary.groupId);
        if (groupStays.length > 0) return groupStays;
      }
      return initialStays;
    }
    return (allStays.length > 0 ? [allStays[0]] : []);
  });

  // Auto-fetch all stays of the group if groupId is present
  useEffect(() => {
    const primary = initialStays[0];
    const gId = primary?.groupId;
    if (!gId) return;

    let active = true;
    axios.get(`${API}/api/stays/group/${gId}`)
      .then(res => {
        if (!active) return;
        const fetchedStays = res.data?.data?.stays;
        if (Array.isArray(fetchedStays) && fetchedStays.length > 0) {
          setSelectedStays(fetchedStays);
        }
      })
      .catch(err => {
        console.warn('Could not auto-fetch group stays for merged invoice:', err.message);
      });

    return () => { active = false; };
  }, [initialStays]);

  const primaryStay = selectedStays[0] || {};
  const hostel = primaryStay.hostel || {};
  const primaryGuest = primaryStay.guest || {};

  // Corporate Form Fields
  const [guestCompany, setGuestCompany] = useState(() => {
    return primaryStay.companyName || primaryGuest.companyName || '';
  });
  const [guestGstin, setGuestGstin] = useState(() => {
    return (primaryStay.gstin || primaryGuest.gstin || '').toUpperCase();
  });
  const [billingAddress, setBillingAddress] = useState(() => {
    return primaryStay.billingAddress || primaryGuest.address || '';
  });
  const [bookerName, setBookerName] = useState(() => {
    return primaryGuest.fullName || '';
  });
  const [bookerPhone, setBookerPhone] = useState(() => {
    return primaryGuest.mobileNumber || '';
  });
  const [poNumber, setPoNumber] = useState('');

  // Tax Configurations
  const [gstEnabled, setGstEnabled] = useState(() => {
    return selectedStays.some(s => s.gstApplied) || Boolean(hostel.gstEnabled);
  });
  const [gstRate, setGstRate] = useState(() => {
    return primaryStay.gstRate || hostel.gstRate || 12;
  });
  const [taxInclusive, setTaxInclusive] = useState(() => {
    return primaryStay.gstType === 'exclusive' ? false : true;
  });

  // Balance settlement toggle
  const [markBalancePaid, setMarkBalancePaid] = useState(false);
  const [balancePaymentMethod, setBalancePaymentMethod] = useState('UPI');

  const [showConfig, setShowConfig] = useState(true);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Compute suggestions: Other rooms that share the same mobile or company name
  const suggestedStays = useMemo(() => {
    const selectedIds = new Set(selectedStays.map(s => s._id));
    const targetMobile = bookerPhone.trim();
    const targetComp = guestCompany.trim().toLowerCase();

    return allStays.filter(s => {
      if (selectedIds.has(s._id)) return false;
      const sMobile = (s.guest?.mobileNumber || '').trim();
      const sComp = (s.companyName || s.guest?.companyName || '').trim().toLowerCase();
      
      const groupMatch = Boolean(primaryStay.groupId && s.groupId && primaryStay.groupId === s.groupId);
      const mobileMatch = targetMobile && sMobile && targetMobile === sMobile;
      const compMatch = targetComp && sComp && targetComp === sComp;
      return groupMatch || mobileMatch || compMatch;
    });
  }, [allStays, selectedStays, bookerPhone, guestCompany]);

  // Handle adding a room
  const handleAddStay = (stayToAdd) => {
    if (!stayToAdd) return;
    if (selectedStays.some(s => s._id === stayToAdd._id)) return;
    setSelectedStays(prev => [...prev, stayToAdd]);
  };

  // Handle removing a room
  const handleRemoveStay = (stayId) => {
    if (selectedStays.length <= 1) {
      alert('At least one room must remain in the invoice.');
      return;
    }
    setSelectedStays(prev => prev.filter(s => s._id !== stayId));
  };

  // Add all suggested rooms with 1 click
  const handleAddAllSuggested = () => {
    setSelectedStays(prev => {
      const existingIds = new Set(prev.map(s => s._id));
      const newlyAdded = suggestedStays.filter(s => !existingIds.has(s._id));
      return [...prev, ...newlyAdded];
    });
  };

  // Calculate invoice data
  const invoiceOptions = useMemo(() => ({
    hostel,
    guestCompany: guestCompany.trim(),
    guestGstin: guestGstin.trim().toUpperCase(),
    billingAddress: billingAddress.trim(),
    bookerName: bookerName.trim(),
    bookerPhone: bookerPhone.trim(),
    poNumber: poNumber.trim(),
    gstEnabled,
    gstRate: Number(gstRate),
    taxInclusive,
    markAllPaid: markBalancePaid,
    balancePaymentMethod
  }), [hostel, guestCompany, guestGstin, billingAddress, bookerName, bookerPhone, poNumber, gstEnabled, gstRate, taxInclusive, markBalancePaid, balancePaymentMethod]);

  const inv = useMemo(() => {
    if (selectedStays.length === 0) return null;
    try {
      return calculateMergedInvoiceData(selectedStays, [], invoiceOptions);
    } catch (e) {
      console.error('Invoice calc error:', e);
      return null;
    }
  }, [selectedStays, invoiceOptions]);

  const syncCorporateToStays = async () => {
    try {
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const cleanCompany = guestCompany.trim();
      const cleanGstin = guestGstin.trim().toUpperCase();
      const cleanAddress = billingAddress.trim();
      const currentRate = Number(gstRate) || 0;
      const type = !gstEnabled || currentRate === 0 ? 'none' : (taxInclusive ? 'inclusive' : 'exclusive');

      const promises = selectedStays.map(s => {
        let stayTax = 0;
        const sTotal = Number(s.totalAmount) || 0;
        if (gstEnabled && currentRate > 0) {
          if (type === 'inclusive') {
            const taxable = Math.round((sTotal / (1 + currentRate / 100)) * 100) / 100;
            stayTax = Math.round((sTotal - taxable) * 100) / 100;
          } else {
            stayTax = Math.round((sTotal * (currentRate / 100)) * 100) / 100;
          }
        }

        const payload = {
          companyName: cleanCompany,
          gstin: cleanGstin,
          billingAddress: cleanAddress,
          gstApplied: gstEnabled && currentRate > 0,
          gstRate: currentRate,
          gstType: type,
          taxAmount: stayTax
        };
        s.companyName = cleanCompany;
        s.gstin = cleanGstin;
        s.billingAddress = cleanAddress;
        s.gstApplied = payload.gstApplied;
        s.gstRate = currentRate;
        s.gstType = type;
        s.taxAmount = stayTax;
        return axios.put(`${API}/api/stays/${s._id}`, payload).catch(() => {});
      });

      await Promise.all(promises);
      if (onStayUpdated) onStayUpdated();
    } catch (e) {
      console.error('Failed to sync merged corporate details to stays:', e);
    }
  };

  const handlePrint = () => {
    if (selectedStays.length === 0) return;
    syncCorporateToStays();
    printMergedInvoice(selectedStays, [], invoiceOptions);
  };

  const waShareUrl = useMemo(() => {
    if (!inv) return '';
    return getMergedInvoiceWhatsAppUrl(selectedStays, invoiceOptions);
  }, [selectedStays, invoiceOptions, inv]);

  if (!inv) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] overflow-y-auto flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl my-0 sm:my-6 overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-left border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-200 flex justify-between items-center bg-slate-900 text-white shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 bg-white/10 rounded-lg text-emerald-400">
                <Building2 size={18} />
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Consolidated Corporate Bill ({selectedStays.length} Rooms Merged)
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                gstEnabled ? 'bg-blue-900/80 text-blue-200 border-blue-400/40' : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {gstEnabled ? (inv.isInterState ? 'IGST Inter-State' : 'CGST+SGST') : 'Non-GST'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Invoice Ref: <b className="font-mono text-slate-200">{inv.invoiceNumber}</b></span>
              <span>&bull;</span>
              <span>Rooms: <b className="text-white">{inv.roomBreakdown.map(r => r.roomNumber).join(', ')}</b></span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ROOM SELECTION PILLS & QUICK SUGGESTIONS */}
        <div className="px-5 sm:px-8 py-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Selected Rooms ({selectedStays.length}):
            </span>
            {allStays.length > selectedStays.length && (
              <div className="flex items-center gap-2">
                <select
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs"
                  onChange={(e) => {
                    const found = allStays.find(s => s._id === e.target.value);
                    if (found) handleAddStay(found);
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>+ Add Another Room...</option>
                  {allStays
                    .filter(s => !selectedStays.some(sel => sel._id === s._id))
                    .map(s => (
                      <option key={s._id} value={s._id}>
                        Room {s.room?.roomNumber} - {s.guest?.fullName} (₹{s.totalAmount})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* Selected Room Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedStays.map(s => (
              <div 
                key={s._id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded-xl shadow-2xs text-xs font-bold text-slate-800"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Room {s.room?.roomNumber}</span>
                <span className="text-slate-400 font-normal">({s.guest?.fullName?.split(' ')[0]})</span>
                <span className="font-mono text-slate-900">₹{s.totalAmount}</span>
                {selectedStays.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStay(s._id)}
                    className="ml-1 p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Remove from merged bill"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Auto Suggestions if matching rooms detected */}
          {suggestedStays.length > 0 && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <AlertCircle size={14} className="text-amber-600 shrink-0" />
                <span>
                  Found <b>{suggestedStays.length}</b> other room(s) with matching guest/company: 
                  <b className="ml-1 text-slate-900">{suggestedStays.map(s => `Room ${s.room?.roomNumber}`).join(', ')}</b>
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddAllSuggested}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-2xs active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Plus size={12} /> Add All {suggestedStays.length} Rooms
              </button>
            </div>
          )}
        </div>

        {/* SCROLLABLE FORM & TABLE BODY */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          
          {/* CORPORATE BILLING CONFIGURATION CARD */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs sm:text-sm">
                <Building2 size={16} className="text-slate-700" />
                <span>Corporate Client & GST Ledger Details</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                {showConfig ? 'Hide Config' : 'Edit Company & Tax Info'}
              </button>
            </div>

            {showConfig && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Company / Organization Name <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Tata Consultancy Services Ltd"
                      value={guestCompany}
                      onChange={e => setGuestCompany(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px] flex items-center justify-between">
                      <span>Company GSTIN (15 Digits)</span>
                      <div className="flex items-center gap-1">
                        {guestGstin.length >= 2 && (
                          <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1 rounded">
                            {GST_STATE_CODES[guestGstin.slice(0, 2)] || `State ${guestGstin.slice(0, 2)}`}
                          </span>
                        )}
                        {inv?.isInterState ? (
                          <span className="text-[9px] font-bold text-purple-800 bg-purple-100 px-1 rounded">IGST</span>
                        ) : guestGstin ? (
                          <span className="text-[9px] font-bold text-blue-800 bg-blue-100 px-1 rounded">CGST+SGST</span>
                        ) : null}
                      </div>
                    </label>
                    <input 
                      type="text"
                      maxLength={15}
                      placeholder="e.g. 08AAAAA0000A1Z5"
                      value={guestGstin}
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        setGuestGstin(val);
                        if (val.length === 15 && !gstEnabled) {
                          setGstEnabled(true);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold uppercase text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      PO / Booking Ref. Number
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. PO-2026-NOV-891"
                      value={poNumber}
                      onChange={e => setPoNumber(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Corporate Billing Address
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 45 Business Park, Electronic City, Bengaluru - 560100"
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Booker / Contact Person
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={bookerName}
                      onChange={e => setBookerName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                      Booker Mobile
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={bookerPhone}
                      onChange={e => setBookerPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                    />
                  </div>
                </div>

                {/* GST Settings Bar */}
                <div className="pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs items-center">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
                    <input 
                      type="checkbox"
                      checked={gstEnabled}
                      onChange={e => setGstEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                    />
                    <span>Charge GST on Corporate Folio</span>
                  </label>

                  {gstEnabled && (
                    <>
                      <div>
                        <select
                          value={gstRate}
                          onChange={e => setGstRate(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                        >
                          <option value={12}>12% (Standard Hotel Room &lt; ₹7,500)</option>
                          <option value={18}>18% (Luxury / Room &gt; ₹7,500)</option>
                          <option value={5}>5% (Restaurant / Special)</option>
                          <option value={0}>0% (Tax Exempt)</option>
                        </select>
                      </div>

                      <div>
                        <select
                          value={taxInclusive ? 'inclusive' : 'exclusive'}
                          onChange={e => setTaxInclusive(e.target.value === 'inclusive')}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs text-xs"
                        >
                          <option value="exclusive">Add GST on Top of Tariff</option>
                          <option value="inclusive">Tariff includes GST (Back-calculate)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ITEMISED ROOM BREAKDOWN TABLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Consolidated Particulars ({inv.roomBreakdown.length} Rooms):
              </span>
              <span className="text-xs font-semibold text-slate-500">
                All accommodation and services merged
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
              <table className="w-full min-w-[560px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="py-2.5 px-3 font-bold text-center w-10">#</th>
                    <th className="py-2.5 px-3 font-bold">Room & Occupant Particulars</th>
                    <th className="py-2.5 px-3 font-bold text-center w-16">Nights</th>
                    <th className="py-2.5 px-3 font-bold text-right font-mono w-24">Tariff</th>
                    <th className="py-2.5 px-3 font-bold text-right font-mono w-24">Add-ons</th>
                    <th className="py-2.5 px-3 font-bold text-right font-mono w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.roomBreakdown.map((r, i) => (
                    <tr key={r.stayId || i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-black text-slate-900 text-sm">
                          Room {r.roomNumber} <span className="font-medium text-slate-500 text-xs">&bull; {r.category}</span>
                        </div>
                        <div className="text-slate-600 font-medium text-[11px] mt-0.5">
                          Guest: <b>{r.guestName}</b> {r.guestPhone ? `(+91 ${r.guestPhone})` : ''} &bull; {format(r.checkInDate, 'dd MMM')} to {format(r.checkOutDate, 'dd MMM yyyy')}
                        </div>
                        {r.charges && r.charges.length > 0 && (
                          <div className="mt-1 pl-2 border-l-2 border-slate-200 text-[10.5px] text-slate-500">
                            {r.charges.map((c, cIdx) => (
                              <div key={cIdx}>
                                &bull; {c.description} ({c.category}): <b className="font-mono text-slate-700">₹{c.amount}</b>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-700">{r.nights}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">₹{r.roomRent.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {r.chargesTotal > 0 ? `₹${r.chargesTotal.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">₹{r.roomTotal.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALS & TAX BREAKDOWN SUMMARY CARD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Amount in Words</span>
              <p className="font-black text-slate-900 text-sm leading-relaxed">
                {numberToWordsINR(inv.grandTotal)}
              </p>
              <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                {inv.gstEnabled ? (
                  <span>
                    GST Scheme: <b>{inv.isInterState ? `Inter-State IGST (${inv.gstRate}%)` : `Intra-State CGST (${inv.gstRate/2}%) + SGST (${inv.gstRate/2}%)`}</b>
                  </span>
                ) : (
                  <span>Standard Non-GST Hotel Folio</span>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Room Tariff Subtotal ({inv.roomBreakdown.length} Rooms):</span>
                <span className="font-mono font-bold text-slate-900">₹{inv.totalRoomRent.toLocaleString('en-IN')}</span>
              </div>
              {inv.totalCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Extra Add-ons / Food:</span>
                  <span className="font-mono font-bold text-slate-900">₹{inv.totalCharges.toLocaleString('en-IN')}</span>
                </div>
              )}
              {inv.gstEnabled && inv.gstRate > 0 && (
                <>
                  <div className="flex justify-between text-slate-500 pt-1 border-t border-dashed border-slate-200">
                    <span>Taxable Value:</span>
                    <span className="font-mono font-bold text-slate-800">₹{inv.taxableAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {inv.isInterState ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST ({inv.gstRate}%):</span>
                      <span className="font-mono font-bold text-slate-900">₹{inv.igst.toLocaleString('en-IN')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono font-bold text-slate-900">₹{inv.cgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono font-bold text-slate-900">₹{inv.sgst.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                </>
              )}
              
              {inv.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500 text-xs">
                  <span>Round Off:</span>
                  <span className="font-mono">{inv.roundOff > 0 ? `+₹${inv.roundOff}` : `-₹${Math.abs(inv.roundOff)}`}</span>
                </div>
              )}
              
              <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t-2 border-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Total Paid / Advance:</span>
                <span className="font-mono">₹{inv.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className={`flex justify-between font-black text-sm pt-1 border-t border-slate-200 ${
                inv.balance <= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}>
                <span>{inv.balance <= 0 ? 'Net Status:' : 'Balance Due:'}</span>
                <span className="font-mono">
                  {inv.balance <= 0 ? '✓ FULLY SETTLED' : `₹${inv.balance.toLocaleString('en-IN')}`}
                </span>
              </div>

              {/* Quick Balance Settlement on Checkout */}
              {inv.balance > 0 && !markBalancePaid && (
                <div className="pt-2 border-t border-dashed border-slate-200">
                  <label className="flex items-center justify-between p-2 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer hover:bg-rose-100/70 transition-colors">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={markBalancePaid}
                        onChange={e => setMarkBalancePaid(e.target.checked)}
                        className="w-4 h-4 rounded text-slate-900 accent-slate-900 cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-rose-900">
                        Mark Full Balance (₹{inv.balance}) Paid on Checkout
                      </span>
                    </div>
                    <select
                      value={balancePaymentMethod}
                      onChange={e => setBalancePaymentMethod(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-[11px] font-bold bg-white border border-rose-300 rounded-lg px-2 py-0.5 text-slate-800 outline-none"
                    >
                      <option value="UPI">UPI / QR</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Corporate Credit">Corporate Credit</option>
                    </select>
                  </label>
                </div>
              )}

              {markBalancePaid && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-[11px] text-emerald-900 font-bold">
                  <span>✓ Balance Settled via {balancePaymentMethod}</span>
                  <button
                    type="button"
                    onClick={() => setMarkBalancePaid(false)}
                    className="text-[10px] text-emerald-700 hover:underline cursor-pointer"
                  >
                    Undo
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* MODAL FOOTER & ACTION BUTTONS */}
        <div className="px-5 sm:px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Ready to print on A4 or share with corporate desk
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              Close
            </button>
            {waShareUrl && (
              <a
                href={waShareUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
              >
                <Share2 size={14} /> WhatsApp Bill
              </a>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Printer size={15} /> Print Consolidated Bill (PDF)
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
