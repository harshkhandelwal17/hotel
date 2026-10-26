import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, addDays, addHours } from 'date-fns';
import { X, Receipt, Plus, Wallet, ArrowRightLeft, CalendarPlus, Printer, Trash2, LogOut, AlertCircle, CheckCircle2, Phone, Edit3, Image as ImageIcon, Eye } from 'lucide-react';
import { printInvoice } from '../../utils/invoice';
import DynamicUpiQr from '../../components/DynamicUpiQr';
import { compressImage } from '../../utils/imageCompression';
import { getFullImageUrl } from '../../utils/imageUrl';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const toDateTimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const TABS = [
  { key: 'bill', label: 'Bill', icon: Receipt },
  { key: 'charge', label: 'Add Charge', icon: Plus },
  { key: 'pay', label: 'Payment', icon: Wallet },
  { key: 'room', label: 'Change Room', icon: ArrowRightLeft },
  { key: 'extend', label: 'Extend', icon: CalendarPlus },
  { key: 'edit', label: 'Edit Details', icon: Edit3 },
];

const StayManageModal = ({ stay: initialStay, onClose, onChanged, onCheckout }) => {
  const [tab, setTab] = useState('bill');
  const [stay, setStay] = useState(initialStay);
  const [payments, setPayments] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // charge form
  const [pendingCharges, setPendingCharges] = useState([]);
  // payment form
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'Cash', notes: '' });
  // shift form
  const [rooms, setRooms] = useState([]);
  const [shiftForm, setShiftForm] = useState({ newRoomId: '', priceAdjustment: '', reason: '' });
  // extend form
  const [extendForm, setExtendForm] = useState({
    extendDays: 1,
    extendHours: 0,
    additionalRent: '',
    extensionPayment: '',
    paymentMethod: 'Cash'
  });

  // edit form (fixes mistakes in guest, timings, rent)
  const [editForm, setEditForm] = useState({
    fullName: '',
    mobileNumber: '',
    idProofType: 'Aadhaar',
    idProofNumber: '',
    idProofImage: '',
    idProofImageBack: '',
    address: '',
    checkInDate: '',
    expectedCheckOutDate: '',
    actualCheckOutDate: '',
    totalAmount: '',
    occupants: 1,
    commissionTo: '',
    commissionAmount: ''
  });
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [editPayments, setEditPayments] = useState([]);
  const [newPaymentForm, setNewPaymentForm] = useState({ amount: '', paymentMethod: 'Cash', notes: '' });
  const [showAddPaymentRow, setShowAddPaymentRow] = useState(false);

  const reload = useCallback(async () => {
    const res = await axios.get(`${API}/api/stays/${initialStay._id}`);
    setStay(res.data.data.stay);
    setPayments(res.data.data.payments);
  }, [initialStay._id]);

  useEffect(() => { reload().catch(() => {}); }, [reload]);

  useEffect(() => {
    if (tab !== 'room' || rooms.length) return;
    axios.get(`${API}/api/rooms?hostel=${initialStay.hostel?._id || initialStay.hostel}`)
      .then(res => setRooms(res.data.data))
      .catch(() => setError('Could not load rooms'));
  }, [tab, rooms.length, initialStay.hostel]);

  const flash = (msg) => { setSuccess(msg); setError(''); setTimeout(() => setSuccess(''), 3000); };

  const run = async (fn, okMsg) => {
    setBusy(true); setError('');
    try {
      await fn();
      await reload();
      onChanged && onChanged();
      flash(okMsg);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
      return false;
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (stay) {
      setEditForm({
        fullName: stay.guest?.fullName || '',
        mobileNumber: stay.guest?.mobileNumber || '',
        idProofType: stay.guest?.idProofType || 'Aadhaar',
        idProofNumber: stay.guest?.idProofNumber || '',
        idProofImage: stay.guest?.idProofImage || '',
        idProofImageBack: stay.guest?.idProofImageBack || '',
        address: stay.guest?.address || '',
        checkInDate: toDateTimeLocal(stay.checkInDate),
        expectedCheckOutDate: toDateTimeLocal(stay.expectedCheckOutDate),
        actualCheckOutDate: toDateTimeLocal(stay.actualCheckOutDate),
        totalAmount: stay.totalAmount ?? '',
        occupants: stay.occupants || 1,
        commissionTo: stay.commissionTo || '',
        commissionAmount: stay.commissionAmount || ''
      });
    }
  }, [stay]);

  useEffect(() => {
    if (payments) {
      setEditPayments(
        payments.map(p => ({
          _id: p._id,
          amount: p.amount ?? '',
          paymentMethod: p.paymentMethod || 'Cash',
          notes: p.notes || '',
          paymentDate: p.paymentDate
        }))
      );
    }
  }, [payments]);

  const handleUploadImage = async (file, side) => {
    if (!file) return;
    try {
      if (side === 'front') setUploadingFront(true);
      else setUploadingBack(true);

      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append('image', compressed);
      const res = await axios.post(`${API}/api/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const resolved = getFullImageUrl(res.data.url);
      setEditForm(prev => ({
        ...prev,
        [side === 'front' ? 'idProofImage' : 'idProofImageBack']: resolved
      }));
      flash(`✅ ${side === 'front' ? 'Front' : 'Back'} photo uploaded! Click Save to apply.`);
    } catch (err) {
      setError(`Failed to upload ${side} image: ` + (err.response?.data?.message || err.message));
    } finally {
      if (side === 'front') setUploadingFront(false);
      else setUploadingBack(false);
    }
  };

  const handleDeletePayment = async (paymentId, index) => {
    if (!paymentId) {
      setEditPayments(prev => prev.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm('Are you sure you want to delete this payment record? This will adjust the stay balance.')) return;
    await run(async () => {
      await axios.delete(`${API}/api/payments/${paymentId}`);
    }, 'Payment deleted successfully');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    await run(async () => {
      const payload = {
        checkInDate: editForm.checkInDate ? new Date(editForm.checkInDate).toISOString() : undefined,
        expectedCheckOutDate: editForm.expectedCheckOutDate ? new Date(editForm.expectedCheckOutDate).toISOString() : undefined,
        actualCheckOutDate: editForm.actualCheckOutDate ? new Date(editForm.actualCheckOutDate).toISOString() : undefined,
        totalAmount: Number(editForm.totalAmount) || 0,
        occupants: Number(editForm.occupants) || 1,
        commissionTo: editForm.commissionTo,
        commissionAmount: Number(editForm.commissionAmount) || 0,
        guestData: {
          fullName: editForm.fullName,
          mobileNumber: editForm.mobileNumber,
          idProofType: editForm.idProofType,
          idProofNumber: editForm.idProofNumber,
          idProofImage: editForm.idProofImage,
          idProofImageBack: editForm.idProofImageBack,
          address: editForm.address
        },
        payments: editPayments.map(p => ({
          _id: p._id,
          amount: Number(p.amount) || 0,
          paymentMethod: p.paymentMethod || 'Cash',
          notes: p.notes
        })),
        newPayment: Number(newPaymentForm.amount) > 0 ? {
          amount: Number(newPaymentForm.amount),
          paymentMethod: newPaymentForm.paymentMethod || 'Cash',
          notes: newPaymentForm.notes || 'Recorded via Edit'
        } : undefined
      };
      await axios.put(`${API}/api/stays/${stay._id}`, payload);
      setNewPaymentForm({ amount: '', paymentMethod: 'Cash', notes: '' });
      setShowAddPaymentRow(false);
    }, '✅ Entry & Payment details updated successfully!');
  };

  const balance = stay.totalAmount - stay.paidAmount;
  const chargesTotal = (stay.charges || []).reduce((s, c) => s + c.amount, 0);
  const roomRent = Math.max(0, stay.totalAmount - chargesTotal);
  const isOpen = ['Active', 'Checkout Due', 'Overdue'].includes(stay.status);

  const submitPendingCharges = async () => {
    const ok = await run(() => axios.post(`${API}/api/stays/${stay._id}/charges`, {
      charges: pendingCharges
    }), 'Charges added to bill');
    if (ok) { setPendingCharges([]); setTab('bill'); }
  };

  const removeCharge = (id) => {
    if (!window.confirm('Remove this charge from the bill?')) return;
    run(() => axios.delete(`${API}/api/stays/${stay._id}/charges/${id}`), 'Charge removed');
  };

  const addPayment = async (e) => {
    e.preventDefault();
    const ok = await run(() => axios.post(`${API}/api/stays/${stay._id}/payments`, {
      ...payForm, amount: Number(payForm.amount)
    }), 'Payment recorded');
    if (ok) { setPayForm({ amount: '', paymentMethod: 'Cash', notes: '' }); setTab('bill'); }
  };

  const shiftRoom = async (e) => {
    e.preventDefault();
    const ok = await run(() => axios.post(`${API}/api/stays/${stay._id}/shift`, {
      newRoomId: shiftForm.newRoomId,
      priceAdjustment: Number(shiftForm.priceAdjustment) || 0,
      reason: shiftForm.reason
    }), 'Room changed successfully');
    if (ok) {
      setShiftForm({ newRoomId: '', priceAdjustment: '', reason: '' });
      setRooms([]); // refresh availability next time
      setTab('bill');
    }
  };

  const extend = async (e) => {
    e.preventDefault();
    const newDate = addHours(addDays(new Date(stay.expectedCheckOutDate), Number(extendForm.extendDays) || 0), Number(extendForm.extendHours) || 0);

    const ok = await run(() => axios.post(`${API}/api/stays/${stay._id}/extend`, {
      newCheckOutDate: newDate.toISOString(),
      additionalRent: Number(extendForm.additionalRent) || 0,
      extensionPayment: Number(extendForm.extensionPayment) || 0,
      paymentMethod: extendForm.paymentMethod
    }), 'Stay extended');
    if (ok) setTab('bill');
  };

  const freeRooms = rooms.filter(r => r.status === 'Active' && !r.isOccupied && r._id !== (stay.room?._id || stay.room));
  const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-black outline-none';
  const labelCls = 'block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5';
  const btnCls = 'w-full py-3 bg-black text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition-all';

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-2 sm:p-4 md:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl sm:max-w-3xl flex flex-col my-auto max-h-[92vh] sm:max-h-[88vh] overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-gray-900">{stay.guest?.fullName || 'Guest Details'}</h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-lg">
                Room {stay.room?.roomNumber}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 font-semibold mt-1">
              {stay.guest?.mobileNumber && (
                <>
                  <span>{stay.guest.mobileNumber}</span>
                  <a
                    href={`tel:${stay.guest.mobileNumber}`}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px] active:scale-95 transition-all"
                    title={`Call ${stay.guest?.fullName}`}
                  >
                    <Phone size={11} className="stroke-[2.5]" /> Call
                  </a>
                  <span>&bull;</span>
                </>
              )}
              <span>{format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')} &rarr; {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</span>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 px-3 bg-gray-50/60 no-scrollbar">
          {TABS.map(t => {
            const Icon = t.icon;
            const disabled = !isOpen && t.key !== 'bill' && t.key !== 'pay' && t.key !== 'edit';
            return (
              <button key={t.key} disabled={disabled} onClick={() => { setTab(t.key); setError(''); }}
                className={`flex items-center gap-1.5 px-3.5 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all disabled:opacity-30 ${tab === t.key ? 'border-black text-black bg-white shadow-2xs rounded-t-lg' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1 min-h-0 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
          {success && <div className="p-3 bg-green-50 border border-green-100 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2"><CheckCircle2 size={16} /> {success}</div>}

          {/* ---------------- BILL ---------------- */}
          {tab === 'bill' && (
            <>
              <div className="rounded-2xl border border-gray-200 divide-y divide-gray-100 text-sm">
                <div className="flex justify-between p-3"><span className="text-gray-500 font-semibold">Room Rent</span><span className="font-black">₹{roomRent}</span></div>
                {(stay.charges || []).map(c => (
                  <div key={c._id} className="flex justify-between items-center p-3">
                    <div>
                      <p className="font-semibold text-gray-800">{c.description}{c.quantity > 1 ? ` ×${c.quantity}` : ''}</p>
                      <p className="text-[11px] text-gray-400">{c.category} &bull; {format(new Date(c.date), 'dd MMM, hh:mm a')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black">₹{c.amount}</span>
                      {isOpen && <button onClick={() => removeCharge(c._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between p-3 bg-gray-50"><span className="font-bold">Total</span><span className="font-black">₹{stay.totalAmount}</span></div>
                <div className="flex justify-between p-3"><span className="text-gray-500 font-semibold">Paid</span><span className="font-black text-green-600">₹{stay.paidAmount}</span></div>
                <div className="flex justify-between p-3"><span className="font-bold">Balance Due</span><span className={`font-black text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.max(0, balance)}</span></div>
              </div>

              {payments.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <p className={labelCls}>Payment History</p>
                    <button
                      type="button"
                      onClick={() => setTab('edit')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Edit3 size={11} /> Edit Payment Mode / Amount
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {payments.map(p => (
                      <div key={p._id} className="flex justify-between items-center text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            p.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            p.paymentMethod === 'UPI' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            p.paymentMethod === 'Card' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-gray-200 text-gray-800 border border-gray-300'
                          }`}>
                            {p.paymentMethod}
                          </span>
                          <span>{format(new Date(p.paymentDate), 'dd MMM, hh:mm a')}</span>
                          {p.notes && <span className="text-gray-400 font-normal italic">({p.notes})</span>}
                        </div>
                        <span className="text-green-600 font-black">₹{p.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stay.roomHistory?.length > 0 && (
                <div>
                  <p className={labelCls}>Room Changes</p>
                  <div className="space-y-1.5">
                    {stay.roomHistory.map(h => (
                      <div key={h._id} className="text-xs font-semibold text-gray-600 bg-indigo-50 rounded-lg px-3 py-2">
                        {h.fromRoomNumber} → {h.toRoomNumber} &bull; {format(new Date(h.date), 'dd MMM, hh:mm a')}
                        {h.reason ? ` • ${h.reason}` : ''}{h.priceAdjustment ? ` • ₹${h.priceAdjustment > 0 ? '+' : ''}${h.priceAdjustment}` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- ADD CHARGE ---------------- */}
          {tab === 'charge' && (
            <div className="space-y-4">
              {/* Quick Preset Add-on Chips */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Quick Add-on Presets</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: '🧺 Guest Laundry', rate: 100 },
                    { name: '💧 Water Bottle', rate: 20 },
                    { name: '☕ Tea / Coffee', rate: 30 },
                    { name: '🍽️ Room Service Food', rate: 150 },
                    { name: '🚗 Taxi / Cab Fare', rate: 200 },
                    { name: '🧼 Extra Linen / Towel', rate: 50 },
                  ].map(preset => (
                    <button
                      type="button"
                      key={preset.name}
                      onClick={() => setPendingCharges([...pendingCharges, { description: preset.name, rate: preset.rate }])}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold text-gray-700 transition-all active:scale-95 flex items-center gap-1 shadow-2xs"
                    >
                      <span>{preset.name}</span>
                      <span className="opacity-60 text-[10px]">₹{preset.rate}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <p className={labelCls}>Items to Add</p>
                  <button type="button" onClick={() => setPendingCharges([...pendingCharges, { description: '', rate: '' }])}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-100">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                
                {pendingCharges.map((item, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 border border-gray-200 rounded-xl flex gap-2 items-center">
                    <input className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black outline-none font-semibold text-sm" placeholder="Item Name (e.g. Dinner)" 
                      value={item.description} onChange={e => { const arr = [...pendingCharges]; arr[idx].description = e.target.value; setPendingCharges(arr); }} />
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input type="number" min="0" className="w-full pl-7 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-semibold text-sm text-right" placeholder="Price"
                        value={item.rate} onChange={e => { const arr = [...pendingCharges]; arr[idx].rate = e.target.value; setPendingCharges(arr); }} />
                    </div>
                    <button type="button" onClick={() => setPendingCharges(pendingCharges.filter((_, i) => i !== idx))} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg"><X size={16}/></button>
                  </div>
                ))}
                
                {pendingCharges.length === 0 && (
                  <div className="text-xs text-gray-400 font-medium italic py-4 text-center border-2 border-dashed border-gray-200 rounded-xl">Tap Add Item to add a charge.</div>
                )}
              </div>

              {pendingCharges.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-black text-gray-900 text-right mb-3">
                    Total: ₹{pendingCharges.reduce((sum, item) => sum + (Number(item.rate) || 0), 0)}
                  </p>
                  <button disabled={busy} onClick={submitPendingCharges} className={btnCls}>
                    {busy ? 'Adding...' : `Add ${pendingCharges.length} Item(s) to Bill`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ---------------- PAYMENT ---------------- */}
          {tab === 'pay' && (
            <form onSubmit={addPayment} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl flex justify-between text-sm font-bold">
                <span className="text-gray-500">Balance Due</span><span className="text-red-600">₹{Math.max(0, balance)}</span>
              </div>
              <div><label className={labelCls}>Amount Received (₹)</label>
                <div className="flex gap-2">
                  <input required type="number" min="1" max={balance} className={inputCls} value={payForm.amount}
                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                  <button type="button" onClick={() => setPayForm({ ...payForm, amount: balance })}
                    className="px-4 bg-gray-100 rounded-xl text-xs font-bold whitespace-nowrap hover:bg-gray-200">Full</button>
                </div></div>
              <div className="flex gap-2">
                {['Cash', 'UPI', 'Card'].map(m => (
                  <button type="button" key={m} onClick={() => setPayForm({ ...payForm, paymentMethod: m })}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg border ${payForm.paymentMethod === m ? 'bg-black text-white border-black' : 'bg-white text-gray-600 border-gray-200'}`}>{m}</button>
                ))}
              </div>
              {payForm.paymentMethod === 'UPI' && Number(payForm.amount) > 0 && (
                <div className="pt-1">
                  <DynamicUpiQr 
                    amount={Number(payForm.amount)}
                    roomNumber={stay.room?.roomNumber}
                    guestName={stay.guest?.fullName}
                    hostel={stay.hostel}
                  />
                </div>
              )}
              <div><label className={labelCls}>Note (optional)</label>
                <input className={inputCls} value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} /></div>
              <button disabled={busy || balance <= 0} className={btnCls}>{balance <= 0 ? 'Nothing due' : busy ? 'Saving...' : 'Record Payment'}</button>
            </form>
          )}

          {/* ---------------- CHANGE ROOM ---------------- */}
          {tab === 'room' && (
            <form onSubmit={shiftRoom} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">
                Current room: <span className="text-indigo-600">{stay.room?.roomNumber}</span>
              </div>
              <div><label className={labelCls}>Move to (only vacant rooms)</label>
                <select required className={inputCls} value={shiftForm.newRoomId} onChange={e => setShiftForm({ ...shiftForm, newRoomId: e.target.value })}>
                  <option value="">Select a room</option>
                  {freeRooms.map(r => <option key={r._id} value={r._id}>Room {r.roomNumber} — ₹{r.price24h}/day</option>)}
                </select>
                {rooms.length > 0 && freeRooms.length === 0 && <p className="text-xs text-red-500 mt-1 font-semibold">No vacant rooms available right now.</p>}
              </div>
              <div><label className={labelCls}>Price difference (₹) — use minus to reduce</label>
                <input type="number" className={inputCls} placeholder="0" value={shiftForm.priceAdjustment}
                  onChange={e => setShiftForm({ ...shiftForm, priceAdjustment: e.target.value })} /></div>
              <div><label className={labelCls}>Reason</label>
                <input className={inputCls} placeholder="AC not working, wants bigger room..." value={shiftForm.reason}
                  onChange={e => setShiftForm({ ...shiftForm, reason: e.target.value })} /></div>
              <p className="text-[11px] text-gray-400 font-semibold">Old room becomes vacant automatically. The change is saved in the stay history.</p>
              <button disabled={busy} className={btnCls}>{busy ? 'Moving...' : 'Change Room'}</button>
            </form>
          )}

          {/* ---------------- EXTEND ---------------- */}
          {tab === 'extend' && (
            <form onSubmit={extend} className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold flex justify-between items-center">
                <span className="text-gray-500">Current checkout:</span>
                <span className="text-gray-900">{format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Extend by Days</label>
                  <input type="number" min="0" className={inputCls} value={extendForm.extendDays}
                    onChange={e => setExtendForm({ ...extendForm, extendDays: e.target.value })} /></div>
                <div><label className={labelCls}>Extend by Hours</label>
                  <input type="number" min="0" max="23" className={inputCls} value={extendForm.extendHours}
                    onChange={e => setExtendForm({ ...extendForm, extendHours: e.target.value })} /></div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm font-bold flex justify-between items-center text-blue-900">
                <span>New checkout:</span>
                <span>{format(addHours(addDays(new Date(stay.expectedCheckOutDate), Number(extendForm.extendDays) || 0), Number(extendForm.extendHours) || 0), 'dd MMM, hh:mm a')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Extra rent (₹)</label>
                  <input type="number" min="0" className={inputCls} placeholder="0" value={extendForm.additionalRent}
                    onChange={e => setExtendForm({ ...extendForm, additionalRent: e.target.value })} /></div>
                <div><label className={labelCls}>Paid now (₹)</label>
                  <input type="number" min="0" className={inputCls} placeholder="0" value={extendForm.extensionPayment}
                    onChange={e => setExtendForm({ ...extendForm, extensionPayment: e.target.value })} /></div>
              </div>
              <button disabled={busy} className={btnCls}>{busy ? 'Extending...' : 'Extend Stay'}</button>
            </form>
          )}

          {/* ---------------- EDIT DETAILS ---------------- */}
          {tab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 font-bold flex items-center gap-2">
                <Edit3 size={16} className="text-amber-700 shrink-0" />
                <span>Galti se galat naam, phone, Aadhaar, timing ya amount enter ho gaya ho to yahan theek karein:</span>
              </div>

              {/* 1. GUEST DETAILS */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">1. Guest Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Guest Full Name *</label>
                    <input 
                      required 
                      className={inputCls} 
                      value={editForm.fullName} 
                      onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile Number</label>
                    <input 
                      type="tel"
                      className={inputCls} 
                      value={editForm.mobileNumber} 
                      onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>ID Proof Type</label>
                    <select 
                      className={inputCls} 
                      value={editForm.idProofType} 
                      onChange={e => setEditForm({ ...editForm, idProofType: e.target.value })}
                    >
                      {['Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'Other'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>ID Proof / Aadhaar Number</label>
                    <input 
                      className={inputCls} 
                      placeholder="e.g. 1234 5678 9012"
                      value={editForm.idProofNumber} 
                      onChange={e => setEditForm({ ...editForm, idProofNumber: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Address</label>
                  <input 
                    className={inputCls} 
                    placeholder="Residential address"
                    value={editForm.address} 
                    onChange={e => setEditForm({ ...editForm, address: e.target.value })} 
                  />
                </div>

                {/* ID Images Upload / Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Front Image */}
                  <div>
                    <label className={labelCls}>ID Front Photo</label>
                    <div className="flex items-center gap-2 mt-1">
                      {editForm.idProofImage ? (
                        <a href={getFullImageUrl(editForm.idProofImage)} target="_blank" rel="noreferrer" className="relative group shrink-0">
                          <img src={getFullImageUrl(editForm.idProofImage)} alt="ID Front" className="w-14 h-10 object-cover rounded-lg border border-gray-300 shadow-xs" />
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={14} className="text-white" />
                          </div>
                        </a>
                      ) : (
                        <div className="w-14 h-10 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} className="text-gray-400" />
                        </div>
                      )}
                      <label className="flex-1 cursor-pointer">
                        <span className="block w-full text-center py-2 px-3 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-2xs transition-colors">
                          {uploadingFront ? 'Uploading...' : editForm.idProofImage ? 'Change Front' : '+ Upload Front'}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e.target.files[0], 'front')} />
                      </label>
                    </div>
                  </div>

                  {/* Back Image */}
                  <div>
                    <label className={labelCls}>ID Back Photo</label>
                    <div className="flex items-center gap-2 mt-1">
                      {editForm.idProofImageBack ? (
                        <a href={getFullImageUrl(editForm.idProofImageBack)} target="_blank" rel="noreferrer" className="relative group shrink-0">
                          <img src={getFullImageUrl(editForm.idProofImageBack)} alt="ID Back" className="w-14 h-10 object-cover rounded-lg border border-gray-300 shadow-xs" />
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye size={14} className="text-white" />
                          </div>
                        </a>
                      ) : (
                        <div className="w-14 h-10 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
                          <ImageIcon size={16} className="text-gray-400" />
                        </div>
                      )}
                      <label className="flex-1 cursor-pointer">
                        <span className="block w-full text-center py-2 px-3 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 shadow-2xs transition-colors">
                          {uploadingBack ? 'Uploading...' : editForm.idProofImageBack ? 'Change Back' : '+ Upload Back'}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadImage(e.target.files[0], 'back')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. TIMINGS & RENT */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">2. Stay Dates & Rent</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Check-In Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className={inputCls} 
                      value={editForm.checkInDate} 
                      onChange={e => setEditForm({ ...editForm, checkInDate: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Expected Check-Out Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className={inputCls} 
                      value={editForm.expectedCheckOutDate} 
                      onChange={e => setEditForm({ ...editForm, expectedCheckOutDate: e.target.value })} 
                    />
                  </div>
                </div>

                {stay.status === 'Checked Out' && (
                  <div>
                    <label className={labelCls}>Actual Check-Out Date & Time</label>
                    <input 
                      type="datetime-local" 
                      className={inputCls} 
                      value={editForm.actualCheckOutDate} 
                      onChange={e => setEditForm({ ...editForm, actualCheckOutDate: e.target.value })} 
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Total Agreed Rent (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      className={inputCls} 
                      value={editForm.totalAmount} 
                      onChange={e => setEditForm({ ...editForm, totalAmount: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Occupants / Guests</label>
                    <input 
                      type="number" 
                      min="1" 
                      className={inputCls} 
                      value={editForm.occupants} 
                      onChange={e => setEditForm({ ...editForm, occupants: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Broker / Commission To (Opt)</label>
                    <input 
                      className={inputCls} 
                      placeholder="Broker Name" 
                      value={editForm.commissionTo} 
                      onChange={e => setEditForm({ ...editForm, commissionTo: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Broker Amount (₹)</label>
                    <input 
                      type="number" 
                      min="0" 
                      className={inputCls} 
                      placeholder="0" 
                      value={editForm.commissionAmount} 
                      onChange={e => setEditForm({ ...editForm, commissionAmount: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* 3. PAYMENTS & PAYMENT MODE */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700">
                    3. Payment Amount & Mode (Cash / UPI / Card)
                  </h4>
                  <span className="text-xs font-bold text-gray-600">
                    Total Paid: <span className="text-green-600 font-black">₹{editPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0) + (Number(newPaymentForm.amount) || 0)}</span>
                  </span>
                </div>

                {editPayments.length > 0 ? (
                  <div className="space-y-3">
                    {editPayments.map((p, idx) => (
                      <div key={p._id || idx} className="p-3 bg-white border border-gray-200 rounded-xl space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gray-600">
                            Payment #{idx + 1} {p.paymentDate ? `• ${format(new Date(p.paymentDate), 'dd MMM, hh:mm a')}` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p._id, idx)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                            title="Delete Payment"
                          >
                            <Trash2 size={13} /> Remove
                          </button>
                        </div>

                        <div>
                          <label className={labelCls}>Payment Mode</label>
                          <div className="grid grid-cols-4 gap-1.5 mt-1">
                            {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(method => (
                              <button
                                type="button"
                                key={method}
                                onClick={() => {
                                  const arr = [...editPayments];
                                  arr[idx] = { ...arr[idx], paymentMethod: method };
                                  setEditPayments(arr);
                                }}
                                className={`py-2 text-xs font-black rounded-lg border transition-all ${
                                  p.paymentMethod === method
                                    ? method === 'Cash'
                                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                      : method === 'UPI'
                                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                      : method === 'Card'
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-black text-white border-black shadow-xs'
                                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                {method === 'Bank Transfer' ? 'Bank' : method}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}>Amount Paid (₹)</label>
                            <input
                              type="number"
                              min="0"
                              className={inputCls}
                              value={p.amount}
                              onChange={e => {
                                const arr = [...editPayments];
                                arr[idx] = { ...arr[idx], amount: e.target.value };
                                setEditPayments(arr);
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Note / Remarks (Optional)</label>
                            <input
                              className={inputCls}
                              placeholder="e.g. Advance paid"
                              value={p.notes || ''}
                              onChange={e => {
                                const arr = [...editPayments];
                                arr[idx] = { ...arr[idx], notes: e.target.value };
                                setEditPayments(arr);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-dashed border-gray-300 rounded-xl space-y-2.5">
                    <p className="text-xs font-bold text-gray-500">No advance payment recorded yet.</p>
                    
                    <div>
                      <label className={labelCls}>Select Payment Mode</label>
                      <div className="grid grid-cols-4 gap-1.5 mt-1">
                        {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(method => (
                          <button
                            type="button"
                            key={method}
                            onClick={() => setNewPaymentForm({ ...newPaymentForm, paymentMethod: method })}
                            className={`py-2 text-xs font-black rounded-lg border transition-all ${
                              newPaymentForm.paymentMethod === method
                                ? method === 'Cash'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                  : method === 'UPI'
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                  : method === 'Card'
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-black text-white border-black shadow-xs'
                                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {method === 'Bank Transfer' ? 'Bank' : method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelCls}>Paid Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className={inputCls}
                        value={newPaymentForm.amount}
                        onChange={e => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* Add Additional Payment Entry */}
                {editPayments.length > 0 && (
                  <div>
                    {!showAddPaymentRow ? (
                      <button
                        type="button"
                        onClick={() => setShowAddPaymentRow(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Plus size={14} /> + Add Another Payment Entry
                      </button>
                    ) : (
                      <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-indigo-950">+ New Payment Entry</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddPaymentRow(false);
                              setNewPaymentForm({ amount: '', paymentMethod: 'Cash', notes: '' });
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div>
                          <label className={labelCls}>Payment Mode</label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {['Cash', 'UPI', 'Card', 'Bank Transfer'].map(m => (
                              <button
                                type="button"
                                key={m}
                                onClick={() => setNewPaymentForm({ ...newPaymentForm, paymentMethod: m })}
                                className={`py-1.5 text-xs font-black rounded-lg border transition-all ${
                                  newPaymentForm.paymentMethod === m
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-gray-700 border-gray-200'
                                }`}
                              >
                                {m === 'Bank Transfer' ? 'Bank' : m}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className={labelCls}>Amount (₹)</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Amount (₹)"
                              className={inputCls}
                              value={newPaymentForm.amount}
                              onChange={e => setNewPaymentForm({ ...newPaymentForm, amount: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Note</label>
                            <input
                              placeholder="Note (optional)"
                              className={inputCls}
                              value={newPaymentForm.notes}
                              onChange={e => setNewPaymentForm({ ...newPaymentForm, notes: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={busy} 
                className="w-full py-3 bg-black text-white font-black text-sm rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {busy ? 'Saving Changes...' : 'Save & Update Details ✓'}
              </button>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-gray-50 border-t border-gray-200 flex gap-2.5 sm:gap-3 shrink-0 items-center justify-between">
          {tab === 'edit' ? (
            <>
              <button
                type="button"
                onClick={() => setTab('bill')}
                className="px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
              >
                Back to Bill
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 sm:py-3 bg-black text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide hover:bg-gray-800 active:scale-95 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? 'Saving Changes...' : 'Save & Update Details ✓'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => printInvoice(stay, payments)}
                className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100">
                <Printer size={16} /> Bill
              </button>
              {isOpen && (
                <button onClick={() => onCheckout(stay)}
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 bg-red-600 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide hover:bg-red-700 active:scale-95 shadow-md">
                  <LogOut size={16} /> Checkout
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StayManageModal;











































