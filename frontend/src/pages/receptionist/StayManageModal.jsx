import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import { X, Receipt, Plus, Wallet, ArrowRightLeft, CalendarPlus, Printer, Trash2, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { printInvoice } from '../../utils/invoice';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';

const QUICK_ITEMS = [
  { label: 'Water Bottle', category: 'Beverage', rate: 20 },
  { label: 'Tea / Coffee', category: 'Beverage', rate: 20 },
  { label: 'Meal / Thali', category: 'Food', rate: 150 },
  { label: 'Snacks', category: 'Food', rate: 50 },
  { label: 'Laundry', category: 'Laundry', rate: 100 },
  { label: 'Extra Bed', category: 'Extra Bed', rate: 300 },
];
const CATEGORIES = ['Food', 'Beverage', 'Laundry', 'Extra Bed', 'Damage', 'Late Checkout', 'Other'];

const TABS = [
  { key: 'bill', label: 'Bill', icon: Receipt },
  { key: 'charge', label: 'Add Charge', icon: Plus },
  { key: 'pay', label: 'Payment', icon: Wallet },
  { key: 'room', label: 'Change Room', icon: ArrowRightLeft },
  { key: 'extend', label: 'Extend', icon: CalendarPlus },
];

const toLocalInput = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

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
    newCheckOutDate: toLocalInput(addDays(new Date(initialStay.expectedCheckOutDate), 1)),
    additionalRent: '',
    extensionPayment: '',
    paymentMethod: 'Cash'
  });

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
    const ok = await run(() => axios.post(`${API}/api/stays/${stay._id}/extend`, {
      newCheckOutDate: new Date(extendForm.newCheckOutDate).toISOString(),
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
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[95vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-gray-900">{stay.guest?.fullName}</h2>
            <p className="text-sm text-gray-500 font-semibold">
              Room <span className="text-indigo-600 font-black">{stay.room?.roomNumber}</span> &bull; {stay.guest?.mobileNumber}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')} &rarr; {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-2">
          {TABS.map(t => {
            const Icon = t.icon;
            const disabled = !isOpen && t.key !== 'bill' && t.key !== 'pay';
            return (
              <button key={t.key} disabled={disabled} onClick={() => { setTab(t.key); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors disabled:opacity-30 ${tab === t.key ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
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
                  <p className={labelCls}>Payment History</p>
                  <div className="space-y-1.5">
                    {payments.map(p => (
                      <div key={p._id} className="flex justify-between text-xs font-semibold text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <span>{format(new Date(p.paymentDate), 'dd MMM, hh:mm a')} &bull; {p.paymentMethod}</span>
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
              <div>
                <p className={labelCls}>Quick Add</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ITEMS.map(q => (
                    <button type="button" key={q.label}
                      onClick={() => setPendingCharges([...pendingCharges, { description: q.label, category: q.category, quantity: 1, rate: q.rate }])}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold transition-colors">
                      {q.label} · ₹{q.rate}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <p className={labelCls}>Items to Add</p>
                  <button type="button" onClick={() => setPendingCharges([...pendingCharges, { description: '', category: 'Food', quantity: 1, rate: '' }])}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1 hover:bg-blue-100">
                    <Plus size={12} /> Custom Item
                  </button>
                </div>
                
                {pendingCharges.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3 relative">
                    <button type="button" onClick={() => setPendingCharges(pendingCharges.filter((_, i) => i !== idx))} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded-md"><X size={14}/></button>
                    <div>
                      <input className="w-full bg-transparent border-b border-gray-300 focus:border-black outline-none font-semibold text-sm pb-1" placeholder="What for? (e.g. Dinner)" 
                        value={item.description} onChange={e => { const arr = [...pendingCharges]; arr[idx].description = e.target.value; setPendingCharges(arr); }} />
                    </div>
                    <div className="flex gap-2">
                      <select className="flex-1 bg-transparent border-b border-gray-300 focus:border-black outline-none text-xs pb-1" 
                        value={item.category} onChange={e => { const arr = [...pendingCharges]; arr[idx].category = e.target.value; setPendingCharges(arr); }}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input type="number" min="1" className="w-16 bg-transparent border-b border-gray-300 focus:border-black outline-none text-xs pb-1 text-center" placeholder="Qty"
                        value={item.quantity} onChange={e => { const arr = [...pendingCharges]; arr[idx].quantity = e.target.value; setPendingCharges(arr); }} />
                      <input type="number" min="1" className="w-20 bg-transparent border-b border-gray-300 focus:border-black outline-none text-xs pb-1 text-right" placeholder="Rate ₹"
                        value={item.rate} onChange={e => { const arr = [...pendingCharges]; arr[idx].rate = e.target.value; setPendingCharges(arr); }} />
                    </div>
                  </div>
                ))}
                
                {pendingCharges.length === 0 && (
                  <div className="text-xs text-gray-400 font-medium italic py-4 text-center border-2 border-dashed border-gray-200 rounded-xl">Tap a Quick Add item above or Custom Item.</div>
                )}
              </div>

              {pendingCharges.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-black text-gray-900 text-right mb-3">
                    Total: ₹{pendingCharges.reduce((sum, item) => sum + (Number(item.rate) || 0) * (Number(item.quantity) || 1), 0)}
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
              <div className="p-3 bg-gray-50 rounded-xl text-sm font-bold">
                Current checkout: {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button type="button" key={n}
                    onClick={() => setExtendForm({ ...extendForm, newCheckOutDate: toLocalInput(addDays(new Date(stay.expectedCheckOutDate), n)) })}
                    className="flex-1 py-2 bg-gray-100 hover:bg-black hover:text-white rounded-lg text-xs font-bold transition-colors">+{n} day{n > 1 ? 's' : ''}</button>
                ))}
              </div>
              <div><label className={labelCls}>New checkout date & time</label>
                <input required type="datetime-local" className={inputCls} value={extendForm.newCheckOutDate}
                  onChange={e => setExtendForm({ ...extendForm, newCheckOutDate: e.target.value })} /></div>
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
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button onClick={() => printInvoice(stay, payments)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100">
            <Printer size={16} /> Bill
          </button>
          {isOpen && (
            <button onClick={() => onCheckout(stay)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-xl text-sm font-black uppercase tracking-wide hover:bg-red-700 active:scale-95">
              <LogOut size={16} /> Checkout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StayManageModal;

