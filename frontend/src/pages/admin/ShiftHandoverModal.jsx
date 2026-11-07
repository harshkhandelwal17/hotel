import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { X, Printer, Banknote, Smartphone, CreditCard, BookOpen, Wallet, CheckCircle, Clock, Building } from 'lucide-react';

export default function ShiftHandoverModal({
  isOpen,
  onClose,
  windowLabel = '',
  stats = {},
  payments = [],
  staffBreakdown = [],
  hostelName = 'All Properties'
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const cashTotal = stats.cashTotal || 0;
  const upiTotal = stats.upiTotal || 0;
  const cardTotal = stats.cardTotal || 0;
  const khataTotal = stats.khataTotal || 0;
  const walletTotal = stats.walletTotal || 0;
  const totalCollected = stats.totalCollected || 0;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 print:max-h-none print:shadow-none print:border-none print:rounded-none"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header (Hidden on print) */}
        <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <Banknote size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Shift Handover & Financial Voucher
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Cash drawer tally & payment collection report
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              <Printer size={15} /> Print Slip
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 print:p-0 print:space-y-4">
          
          {/* Header Title Section (Always visible, prominent in print) */}
          <div className="text-center border-b pb-5 border-gray-200">
            <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 py-1 px-3 rounded-full w-fit mx-auto mb-2 print:border">
              <Building size={13} /> {hostelName}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Shift Handover & Cash Collection Report
            </h1>
            <p className="text-xs font-bold text-gray-500 mt-1 flex items-center justify-center gap-1.5">
              <Clock size={13} /> Period: <span className="text-gray-900 font-black">{windowLabel || 'All Time'}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Generated on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}
            </p>
          </div>

          {/* Cash Drawer & Collection KPI Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-3">
            {/* Cash in Hand */}
            <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-200 print:bg-white print:border-emerald-600">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                <Banknote size={15} className="text-emerald-600" />
                <span>Cash in Hand (नकद)</span>
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">₹{cashTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-emerald-600/80 font-bold mt-0.5">Physical cash in drawer</p>
            </div>

            {/* UPI / Online */}
            <div className="p-4 rounded-2xl bg-purple-50 border-2 border-purple-200 print:bg-white print:border-purple-600">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-purple-800">
                <Smartphone size={15} className="text-purple-600" />
                <span>UPI / Online (डिजिटल)</span>
              </div>
              <p className="text-2xl font-black text-purple-700 mt-1">₹{upiTotal.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-purple-600/80 font-bold mt-0.5">Bank / QR Code receipts</p>
            </div>

            {/* Total Inflow */}
            <div className="p-4 rounded-2xl bg-gray-900 text-white border-2 border-gray-900 print:bg-white print:text-black print:border-black">
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400 print:text-black">
                <CheckCircle size={15} />
                <span>Total Collected</span>
              </div>
              <p className="text-2xl font-black mt-1">₹{totalCollected.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5 print:text-gray-600">Gross revenue inflow</p>
            </div>

            {/* Card / Bank */}
            {cardTotal > 0 && (
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-800">
                  <CreditCard size={14} className="text-blue-600" />
                  <span>Card / POS Machine</span>
                </div>
                <p className="text-xl font-black text-blue-700 mt-1">₹{cardTotal.toLocaleString('en-IN')}</p>
              </div>
            )}

            {/* Khata Credit */}
            {khataTotal > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-800">
                  <BookOpen size={14} className="text-amber-600" />
                  <span>Billed to Khata (उधार)</span>
                </div>
                <p className="text-xl font-black text-amber-800 mt-1">₹{khataTotal.toLocaleString('en-IN')}</p>
              </div>
            )}

            {/* Wallet Advance Used */}
            {walletTotal > 0 && (
              <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200">
                <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-teal-800">
                  <Wallet size={14} className="text-teal-600" />
                  <span>Wallet Advance Used</span>
                </div>
                <p className="text-xl font-black text-teal-800 mt-1">₹{walletTotal.toLocaleString('en-IN')}</p>
              </div>
            )}
          </div>

          {/* Staff-wise Collection Breakdown */}
          {staffBreakdown && staffBreakdown.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">
                Staff / Receptionist Cash Handover Tally
              </h3>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100/80 border-b border-gray-200 font-black text-gray-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Staff Member</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4 text-right">Cash Collected</th>
                      <th className="py-2.5 px-4 text-right">UPI Collected</th>
                      <th className="py-2.5 px-4 text-right">Total Handed Over</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-bold text-gray-800">
                    {staffBreakdown.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/60">
                        <td className="py-2.5 px-4 font-black">{s.name}</td>
                        <td className="py-2.5 px-4 text-gray-500 capitalize">{s.role}</td>
                        <td className="py-2.5 px-4 text-right font-black text-emerald-700">₹{(s.cash || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-purple-700">₹{(s.upi || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-900">₹{(s.total || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Transactions List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">
                Transaction Receipts List ({payments.length})
              </h3>
              <span className="text-[11px] font-bold text-gray-400 print:hidden">Sorted latest first</span>
            </div>
            
            <div className="border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 border-b border-gray-200 font-black text-gray-700 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Time & Date</th>
                    <th className="py-2.5 px-3">Guest Details</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[11px]">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-gray-400 font-medium">
                        No transactions recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    payments.slice(0, 100).map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50/60">
                        <td className="py-2 px-3 font-mono text-gray-600 whitespace-nowrap">
                          {format(new Date(p.paymentDate || p.createdAt), 'hh:mm a, dd MMM')}
                        </td>
                        <td className="py-2 px-3 font-bold text-gray-900 whitespace-nowrap">
                          {p.guest?.fullName || 'Guest'}
                        </td>
                        <td className="py-2 px-3 font-bold text-indigo-700 whitespace-nowrap">
                          {p.stay?.room?.roomNumber ? `Room ${p.stay.room.roomNumber}` : '-'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-wider ${
                            p.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                            p.paymentMethod === 'UPI' ? 'bg-purple-100 text-purple-800' :
                            p.paymentMethod === 'Khata' ? 'bg-amber-100 text-amber-900' :
                            p.paymentMethod === 'Wallet' ? 'bg-teal-100 text-teal-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono text-gray-900 whitespace-nowrap">
                          ₹{Number(p.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-gray-600 font-medium whitespace-nowrap">
                          {p.createdBy?.name || 'Staff'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {payments.length > 100 && (
              <p className="text-[10px] text-gray-400 italic text-right print:hidden">
                Showing first 100 of {payments.length} transactions. Full details available in CSV export.
              </p>
            )}
          </div>

          {/* Verification & Signature Section (Crucial for Cash drawer shift change) */}
          <div className="pt-8 border-t-2 border-dashed border-gray-300 grid grid-cols-2 gap-8 text-xs font-bold text-gray-700">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-8">
                Physical Cash Drawer Handed Over By:
              </p>
              <div className="border-t border-gray-400 pt-1.5 flex justify-between items-center">
                <span>Staff / Receptionist Signature</span>
                <span className="text-gray-400 font-normal">Date & Time</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-8">
                Cash Count Verified & Received By:
              </p>
              <div className="border-t border-gray-400 pt-1.5 flex justify-between items-center">
                <span>Manager / Owner Signature</span>
                <span className="text-gray-400 font-normal">Cash Tally Matched ✓</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer (Hidden on print) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-gray-500 font-medium">
            Cash Drawer Total to count: <strong className="text-emerald-700 font-black">₹{cashTotal.toLocaleString('en-IN')}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-transform active:scale-95 cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <Printer size={15} /> Print Shift Handover
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
