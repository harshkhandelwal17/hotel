import React, { useState, useContext } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Check, Copy, AlertCircle, Sparkles, Building, ArrowRight, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const DynamicUpiQr = ({ 
  amount = 0, 
  guestName = '', 
  roomNumber = '', 
  hostel = null, 
  onUpiUpdated = null 
}) => {
  const { user } = useContext(AuthContext);
  const [copied, setCopied] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [newUpiId, setNewUpiId] = useState('');
  const [newPayeeName, setNewPayeeName] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeHostel, setActiveHostel] = useState(hostel || user?.assignedHostel || null);

  const currentHostel = activeHostel || hostel || user?.assignedHostel;
  const upiId = currentHostel?.upiId?.trim() || '';
  const payeeName = currentHostel?.upiPayeeName?.trim() || currentHostel?.name || 'Hotel Front Desk';
  const numericAmount = Number(amount) || 0;

  // Format the NPCI Official UPI Link
  const note = roomNumber 
    ? `Room ${roomNumber} - ${guestName || 'Hotel Bill'}` 
    : `Hotel Bill - ${guestName || 'Guest'}`;
  
  const upiUrl = upiId 
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${numericAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : '';

  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (!newUpiId.trim()) return;
    if (!currentHostel?._id) {
      setSaveError('No hotel property found to save UPI settings');
      return;
    }

    try {
      setSavingUpi(true);
      setSaveError('');
      const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';
      const res = await axios.put(`${API}/api/hostels/${currentHostel._id}`, {
        upiId: newUpiId.trim(),
        upiPayeeName: newPayeeName.trim() || currentHostel.name
      });
      setActiveHostel(res.data.data);
      setIsSettingUp(false);
      if (onUpiUpdated) onUpiUpdated(res.data.data);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  if (numericAmount <= 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white rounded-2xl border-2 border-purple-100 p-4 shadow-sm space-y-3.5 text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header Badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black tracking-wide uppercase">
          <QrCode size={13} className="text-purple-600" /> Dynamic UPI Payment
        </span>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Exact Amount Lock
        </span>
      </div>

      {/* Bill Amount Highlight */}
      <div className="bg-white py-2 px-3 rounded-xl border border-gray-200/80 shadow-inner flex items-center justify-between">
        <div className="text-left">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount to Pay</p>
          <p className="text-xl font-black text-gray-900 tracking-tight">₹{numericAmount.toLocaleString('en-IN')}</p>
        </div>
        {(roomNumber || guestName) && (
          <div className="text-right">
            {roomNumber && <span className="inline-block px-2 py-0.5 bg-gray-900 text-white text-[10px] font-black rounded-md">Room {roomNumber}</span>}
            {guestName && <p className="text-[11px] font-semibold text-gray-500 mt-0.5 truncate max-w-[120px]">{guestName}</p>}
          </div>
        )}
      </div>

      {/* UPI QR Display or Setup Prompt */}
      {upiId && !isSettingUp ? (
        <div className="space-y-3">
          {/* Crisp QR Code Container */}
          <div className="inline-block p-3.5 bg-white rounded-2xl border-2 border-gray-900/10 shadow-md relative group">
            <QRCodeSVG 
              value={upiUrl}
              size={180}
              level="M"
              includeMargin={false}
              className="mx-auto rounded-lg"
            />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-500">
              <Sparkles size={11} className="text-purple-600" />
              <span>GPay &bull; PhonePe &bull; Paytm &bull; BHIM</span>
            </div>
          </div>

          {/* Payee Info & Copy UPI ID */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-gray-700">
              Payee: <span className="text-gray-900">{payeeName}</span>
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-lg text-xs font-mono font-bold text-gray-800">
              <span>{upiId}</span>
              <button 
                type="button" 
                onClick={handleCopyUpi} 
                className="text-purple-600 hover:text-purple-800 p-0.5" 
                title="Copy UPI ID"
              >
                {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-gray-500 font-medium">
            Scan with any UPI app &bull; Amount is automatically locked to <strong className="text-gray-900">₹{numericAmount.toLocaleString('en-IN')}</strong>
          </p>

          {/* Change UPI Option */}
          <button 
            type="button" 
            onClick={() => {
              setNewUpiId(upiId);
              setNewPayeeName(payeeName);
              setIsSettingUp(true);
            }} 
            className="text-[10px] font-bold text-gray-400 hover:text-purple-700 hover:underline"
          >
            Change Hotel UPI ID
          </button>
        </div>
      ) : (
        /* Configuration Prompt when UPI is not set */
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-left space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-900">Hotel UPI ID Not Configured</p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                Set your Hotel UPI ID once to instantly generate live exact-amount payment QR codes on screen!
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveUpi} className="space-y-2.5 pt-1">
            {saveError && <p className="text-[11px] text-red-600 font-bold">{saveError}</p>}
            <div>
              <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                Hotel UPI ID (VPA) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. hotelroyal@icici or 9876543210@paytm"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                value={newUpiId}
                onChange={e => setNewUpiId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-700 uppercase mb-1">
                Payee Business Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder={currentHostel?.name || "e.g. Hotel Royal Taj"}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-black"
                value={newPayeeName}
                onChange={e => setNewPayeeName(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              {upiId && (
                <button
                  type="button"
                  onClick={() => setIsSettingUp(false)}
                  className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={savingUpi}
                className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white text-xs font-black uppercase rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1"
              >
                {savingUpi ? 'Saving...' : 'Save & Show QR'} <ArrowRight size={12} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DynamicUpiQr;
