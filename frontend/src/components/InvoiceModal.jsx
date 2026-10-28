import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { 
  X, Printer, Share2, FileText, CheckCircle2, 
  Building2, Percent, AlertCircle, RefreshCw, Eye
} from 'lucide-react';
import { calculateInvoiceData, printInvoice, getInvoiceWhatsAppUrl, numberToWordsINR } from '../utils/invoice';

const InvoiceModal = ({ stay, payments = [], onClose }) => {
  const hostel = stay.hostel || {};
  const guest = stay.guest || {};
  const room = stay.room || {};

  // Local configurable options for this invoice (defaults to whether stay had GST applied)
  const [gstEnabled, setGstEnabled] = useState(Boolean(stay.gstApplied));
  const [gstRate, setGstRate] = useState(stay.gstRate || hostel.gstRate || 12);
  const [taxInclusive, setTaxInclusive] = useState(stay.gstType === 'exclusive' ? false : (stay.gstType === 'inclusive' ? true : (hostel.taxInclusive !== undefined ? hostel.taxInclusive : true)));
  const [guestCompany, setGuestCompany] = useState(guest.companyName || '');
  const [guestGstin, setGuestGstin] = useState(guest.gstin || '');
  const [showTaxOptions, setShowTaxOptions] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const invOptions = {
    gstEnabled,
    gstRate: Number(gstRate),
    taxInclusive,
    guestCompany,
    guestGstin: guestGstin.trim().toUpperCase()
  };

  const inv = calculateInvoiceData(stay, payments, invOptions);
  const outDate = stay.actualCheckOutDate || stay.expectedCheckOutDate || new Date();
  const checkInFormatted = format(new Date(stay.checkInDate), 'dd MMM yyyy, hh:mm a');
  const checkOutFormatted = format(new Date(outDate), 'dd MMM yyyy, hh:mm a');
  const waUrl = getInvoiceWhatsAppUrl(stay, payments, invOptions);

  const handlePrint = () => {
    printInvoice(stay, payments, invOptions);
  };

  return createPortal(
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999] overflow-y-auto flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl my-0 sm:my-6 overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-left border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/70 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-lg">
                <FileText size={16} />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-gray-900">
                {gstEnabled ? 'Tax Invoice (GST)' : 'Hospitality Bill / Folio'}
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                gstEnabled ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {gstEnabled ? 'GST Mode' : 'Non-GST'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Ref: <span className="font-mono font-bold text-gray-700">{inv.invoiceNumber}</span> &bull; Room {room.roomNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* CUSTOMIZE TOOLBAR STRIP */}
        <div className="px-5 sm:px-8 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700 select-none">
              <input 
                type="checkbox" 
                checked={gstEnabled} 
                onChange={e => setGstEnabled(e.target.checked)} 
                className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
              />
              <span>Generate GST Tax Invoice</span>
            </label>

            <button 
              type="button"
              onClick={() => setShowTaxOptions(!showTaxOptions)}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              {showTaxOptions ? 'Hide Tax/Company Fields' : 'Add Corporate GST / Edit Rates'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-gray-500 font-medium">
            <span>Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded ${
              inv.balance <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}>
              {inv.balance <= 0 ? 'Fully Paid' : `Due: ₹${inv.balance.toLocaleString('en-IN')}`}
            </span>
          </div>
        </div>

        {/* EXPANDABLE CORPORATE / TAX CONTROLS */}
        {showTaxOptions && (
          <div className="p-4 sm:px-8 bg-amber-50/60 border-b border-amber-200 grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0 animate-in slide-in-from-top-2 duration-150 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Company / Business Name</label>
              <input 
                type="text" 
                placeholder="e.g. Tata Consultancy Services"
                value={guestCompany}
                onChange={e => setGuestCompany(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-medium outline-none focus:ring-2 focus:ring-black text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Guest / Company GSTIN</label>
              <input 
                type="text" 
                placeholder="e.g. 08AAAAA0000A1Z5"
                value={guestGstin}
                onChange={e => setGuestGstin(e.target.value.toUpperCase())}
                maxLength={15}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-black text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">GST Tax Rate</label>
              <select 
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-bold outline-none focus:ring-2 focus:ring-black text-xs"
              >
                <option value={12}>12% (Standard Hotel Room &lt; ₹7,500)</option>
                <option value={18}>18% (Luxury / Room &gt; ₹7,500)</option>
                <option value={5}>5% (Restaurant / Non-AC / Special)</option>
                <option value={0}>0% (Tax Exempt)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">Pricing Style</label>
              <select 
                value={taxInclusive ? 'inclusive' : 'exclusive'}
                onChange={e => setTaxInclusive(e.target.value === 'inclusive')}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg font-bold outline-none focus:ring-2 focus:ring-black text-xs"
              >
                <option value="inclusive">Tariff is Inclusive of GST (MRP)</option>
                <option value="exclusive">Add GST on Top of Tariff</option>
              </select>
            </div>
          </div>
        )}

        {/* LIVE INVOICE PREVIEW AREA */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 bg-slate-100/50">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm max-w-3xl mx-auto space-y-6 text-gray-800">
            
            {/* INVOICE CARD HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b-2 border-gray-900">
              <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{hostel.name || 'HOTEL PROPERTY'}</h1>
                <p className="text-xs text-gray-500 mt-1">{hostel.address || 'Hotel Address'}</p>
                <p className="text-xs text-gray-500">
                  {hostel.contactNumber && <span>Phone: <b>{hostel.contactNumber}</b> &nbsp;|&nbsp; </span>}
                  {hostel.email && <span>Email: <b>{hostel.email}</b></span>}
                </p>
                {gstEnabled && hostel.gstin && (
                  <p className="text-xs text-gray-800 font-bold mt-1">
                    GSTIN: <span className="font-mono">{hostel.gstin}</span> &bull; State: {hostel.state || 'India'}
                  </p>
                )}
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl font-black uppercase text-gray-900">{gstEnabled ? 'TAX INVOICE' : 'HOTEL RECEIPT'}</p>
                <p className="text-xs font-mono font-bold text-gray-700 mt-0.5">#{inv.invoiceNumber}</p>
                <p className="text-xs text-gray-400 mt-0.5">Date: {format(new Date(), 'dd MMM yyyy')}</p>
                <div className="mt-2">
                  <span className={`inline-block px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    inv.balance <= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'
                  }`}>
                    {inv.balance <= 0 ? '✓ FULLY PAID' : `BALANCE DUE: ₹${inv.balance.toLocaleString('en-IN')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* GUEST & STAY META */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Billed To (Guest)</p>
                <p className="text-sm font-black text-gray-900">{guest.fullName || 'Guest'}</p>
                <p className="text-gray-600 font-medium">{guest.mobileNumber ? `+91 ${guest.mobileNumber}` : ''}</p>
                {guestCompany && <p className="mt-1 font-bold text-gray-800">Company: {guestCompany}</p>}
                {guestGstin && <p className="font-mono font-bold text-blue-900">GSTIN: {guestGstin}</p>}
                {guest.address && <p className="text-gray-500 mt-0.5">{guest.address}</p>}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1">Reservation Details</p>
                <p className="text-sm font-black text-gray-900">Room: {room.roomNumber} &bull; {room.category || 'Standard'}</p>
                <p className="text-gray-600 mt-0.5"><b>Check-In:</b> {checkInFormatted}</p>
                <p className="text-gray-600"><b>Check-Out:</b> {checkOutFormatted}</p>
                <p className="text-gray-600"><b>Occupants:</b> {stay.occupants || 1} Person(s)</p>
              </div>
            </div>

            {/* PARTICULARS TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200 bg-slate-100 text-gray-700 font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">SAC Code</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-gray-500">1</td>
                    <td className="py-3 px-3">
                      <p className="font-bold text-gray-900">Room Accommodation Tariff</p>
                      <p className="text-[11px] text-gray-400">Room {room.roomNumber} ({checkInFormatted.split(',')[0]} - {checkOutFormatted.split(',')[0]})</p>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-gray-500">{gstEnabled ? inv.hsnSacCode : '-'}</td>
                    <td className="py-3 px-3 text-center font-semibold">1</td>
                    <td className="py-3 px-3 text-right font-mono font-bold">₹{Number(inv.roomRent).toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-gray-900">₹{Number(inv.roomRent).toLocaleString('en-IN')}</td>
                  </tr>

                  {(stay.charges || []).map((c, idx) => (
                    <tr key={c._id || idx}>
                      <td className="py-3 px-3 font-semibold text-gray-500">{idx + 2}</td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-gray-900">{c.description}</p>
                        <p className="text-[11px] text-gray-400">{c.category}</p>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-gray-500">
                        {gstEnabled ? (c.category === 'Food' ? '996331' : c.category === 'Laundry' ? '999712' : '996311') : '-'}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold">{c.quantity || 1}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-gray-900">₹{Number(c.amount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS AND TAX SUMMARY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Amount in Words</p>
                  <p className="text-xs font-bold text-gray-900 mt-1 italic">{numberToWordsINR(inv.grandTotal)}</p>
                </div>

                {inv.balance > 0 && hostel.upiId && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&margin=2&data=${encodeURIComponent(`upi://pay?pa=${inv.hostel.upiId}&pn=${inv.hostel.upiPayeeName || inv.hostel.name || 'Hotel'}&am=${inv.balance}&cu=INR`)}`}
                      alt="UPI QR"
                      className="w-16 h-16 rounded-lg bg-white p-1 border border-purple-200"
                    />
                    <div>
                      <p className="text-[11px] font-black text-purple-900">Scan & Pay via UPI</p>
                      <p className="text-xs font-mono font-bold text-purple-800">{hostel.upiId}</p>
                      <p className="text-xs font-black text-red-600 mt-0.5">Due: ₹{inv.balance.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t sm:border-t-0 sm:border-l sm:pl-6 border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 font-semibold">
                  <span>Sub Total:</span>
                  <span className="font-mono">₹{inv.totalBilled.toLocaleString('en-IN')}</span>
                </div>

                {gstEnabled ? (
                  taxInclusive ? (
                    <>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>Taxable Value:</span>
                        <span className="font-mono">₹{inv.taxableAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>CGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono">₹{inv.cgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>SGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono">₹{inv.sgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-blue-900 font-bold text-[11px] bg-blue-50/60 px-2 py-1 rounded">
                        <span>GST ({inv.gstRate}% Included):</span>
                        <span className="font-mono">₹{inv.totalGst.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono">₹{inv.cgst.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST ({(inv.gstRate / 2).toFixed(1)}%):</span>
                        <span className="font-mono">₹{inv.sgst.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )
                ) : (
                  <p className="text-[11px] text-gray-400 italic">
                    * Non-GST bill (No tax charged under composition/exemption scheme).
                  </p>
                )}

                <div className="flex justify-between pt-2 border-t-2 border-gray-900 font-black text-sm text-gray-900">
                  <span>Grand Total:</span>
                  <span className="font-mono">₹{inv.grandTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Total Paid:</span>
                  <span className="font-mono">₹{inv.totalPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className={`flex justify-between font-black text-sm p-2 rounded-lg ${
                  inv.balance > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <span>{inv.balance > 0 ? 'Balance Due:' : 'Net Balance:'}</span>
                  <span className="font-mono">₹{inv.balance.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* SETTLEMENT LOG (PAYMENTS) */}
            {payments.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">Settlement Records</p>
                <div className="space-y-1.5">
                  {payments.map(p => (
                    <div key={p._id} className="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-black bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-800 text-[10px] mr-2">
                          {p.paymentMethod}
                        </span>
                        <span className="text-gray-500 text-[11px]">{format(new Date(p.paymentDate), 'dd MMM yyyy, hh:mm a')}</span>
                        {p.notes && <span className="text-gray-400 ml-2 italic">({p.notes})</span>}
                      </div>
                      <span className="font-mono font-black text-emerald-700">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FOOTER */}
            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-end gap-6 text-[11px] text-gray-400">
              <div className="max-w-md">
                <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Terms & Conditions:</p>
                <p>1. Check-out time is 11:00 AM. 2. Valid Govt ID proof mandatory for all guests. 3. Disputes subject to local jurisdiction only.</p>
              </div>
              <div className="text-right">
                <div className="w-40 border-t border-gray-400 pt-1 text-center font-bold text-gray-600">
                  Authorized Signatory
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* MODAL FOOTER ACTION BAR */}
        <div className="px-5 sm:px-8 py-3.5 bg-gray-50 border-t border-gray-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-gray-500 hidden sm:block">
            Print ready on standard A4 or share instant WhatsApp invoice.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {waUrl && (
              <a 
                href={waUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <Share2 size={15} /> WhatsApp Bill
              </a>
            )}

            <button 
              type="button" 
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-black hover:bg-gray-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default InvoiceModal;

