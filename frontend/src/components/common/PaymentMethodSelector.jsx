import React, { useEffect } from 'react';
import { Banknote, Smartphone, CreditCard, Shuffle, CheckCircle2, AlertCircle, PlusCircle, Wallet, BookOpen } from 'lucide-react';
import DynamicUpiQr from '../DynamicUpiQr';

/**
 * Builds the array of split payments to send to backend
 */
export const buildSplitPayments = (method, totalAmount, splitBreakdown, defaultNotes = '') => {
  if (method !== 'Mixed') return null;
  const splits = [];
  const cashAmt = Number(splitBreakdown?.cash) || 0;
  const upiAmt = Number(splitBreakdown?.upi) || 0;
  const cardAmt = Number(splitBreakdown?.card) || 0;

  if (cashAmt > 0) {
    splits.push({
      amount: cashAmt,
      paymentMethod: 'Cash',
      notes: defaultNotes ? `${defaultNotes} (Cash portion)` : 'Cash portion'
    });
  }
  if (upiAmt > 0) {
    splits.push({
      amount: upiAmt,
      paymentMethod: 'UPI',
      notes: defaultNotes ? `${defaultNotes} (UPI portion)` : 'UPI portion'
    });
  }
  if (cardAmt > 0) {
    splits.push({
      amount: cardAmt,
      paymentMethod: 'Card',
      notes: defaultNotes ? `${defaultNotes} (Card portion)` : 'Card portion'
    });
  }
  return splits;
};

/**
 * Validates whether the split payments match the expected total
 */
export const validateSplitPayment = (method, totalAmount, splitBreakdown) => {
  const target = Math.max(0, Number(totalAmount) || 0);
  if (method !== 'Mixed') {
    return { isValid: true, error: null };
  }
  if (target <= 0) {
    return { isValid: true, error: null };
  }

  const cash = Number(splitBreakdown?.cash) || 0;
  const upi = Number(splitBreakdown?.upi) || 0;
  const card = Number(splitBreakdown?.card) || 0;
  const sum = cash + upi + card;

  if (Math.abs(sum - target) > 0.01) {
    if (sum < target) {
      return {
        isValid: false,
        error: `Mixed payment is ₹${(target - sum).toLocaleString('en-IN')} short. Total allocated: ₹${sum.toLocaleString('en-IN')} of ₹${target.toLocaleString('en-IN')}.`
      };
    } else {
      return {
        isValid: false,
        error: `Mixed payment exceeds total by ₹${(sum - target).toLocaleString('en-IN')}. Total allocated: ₹${sum.toLocaleString('en-IN')} of ₹${target.toLocaleString('en-IN')}.`
      };
    }
  }

  return { isValid: true, error: null, splits: buildSplitPayments(method, target, splitBreakdown) };
};

const PaymentMethodSelector = ({
  paymentMethod = 'Cash',
  onChangeMethod,
  totalAmount = 0,
  splitBreakdown = { cash: '', upi: '', card: '' },
  onChangeSplit,
  theme = 'light', // 'light' | 'dark'
  qrDetails = null, // { roomNumber, guestName, hostel }
  allowBankTransfer = false,
  allowWallet = false,
  walletBalance = 0,
  allowKhata = false,
  className = ''
}) => {
  const target = Math.max(0, Number(totalAmount) || 0);
  const cash = Number(splitBreakdown?.cash) || 0;
  const upi = Number(splitBreakdown?.upi) || 0;
  const card = Number(splitBreakdown?.card) || 0;
  const sum = cash + upi + card;
  const diff = target - sum;

  // When switching to 'Mixed', initialize default allocation if empty
  const handleSelectMethod = (m) => {
    if (m === 'Mixed') {
      if (sum === 0 && target > 0) {
        // By default suggest half cash / half upi or full cash with upi 0
        onChangeSplit({
          cash: Math.round(target / 2),
          upi: target - Math.round(target / 2),
          card: ''
        });
      }
    }
    onChangeMethod(m);
  };

  const handleCashChange = (val) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    const newCash = Number(num) || 0;
    // Auto-calculate remaining to UPI if card is 0
    let newUpi = splitBreakdown?.upi;
    if (card === 0 && target > 0) {
      newUpi = Math.max(0, target - newCash);
    }
    onChangeSplit({
      ...splitBreakdown,
      cash: val === '' ? '' : num,
      upi: newUpi === 0 ? '' : newUpi
    });
  };

  const handleUpiChange = (val) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    onChangeSplit({
      ...splitBreakdown,
      upi: val === '' ? '' : num
    });
  };

  const handleCardChange = (val) => {
    const num = val === '' ? '' : Math.max(0, Number(val));
    onChangeSplit({
      ...splitBreakdown,
      card: val === '' ? '' : num
    });
  };

  const autoAllocateRemainder = (targetField) => {
    if (diff === 0) return;
    const currentVal = Number(splitBreakdown?.[targetField]) || 0;
    const updated = Math.max(0, currentVal + diff);
    onChangeSplit({
      ...splitBreakdown,
      [targetField]: updated === 0 ? '' : updated
    });
  };

  const isDark = theme === 'dark';

  const methods = [
    'Cash',
    'UPI',
    'Card',
    ...(allowBankTransfer ? ['Bank Transfer'] : []),
    ...(allowWallet ? ['Wallet'] : []),
    ...(allowKhata ? ['Khata'] : []),
    'Mixed'
  ];

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* METHOD BUTTONS */}
      <div className={`flex flex-wrap sm:flex-nowrap gap-1.5 p-1 rounded-xl ${isDark ? 'bg-gray-800/90 border border-gray-700/60' : 'bg-gray-100 border border-gray-200'}`}>
        {methods.map((method) => {
          const isSelected = paymentMethod === method;
          let activeCls = '';
          if (isSelected) {
            if (isDark) {
              activeCls = method === 'Mixed'
                ? 'bg-amber-400 text-gray-950 shadow-sm font-black'
                : method === 'Wallet'
                ? 'bg-emerald-400 text-gray-950 shadow-sm font-black'
                : method === 'Khata'
                ? 'bg-amber-400 text-gray-950 shadow-sm font-black'
                : 'bg-white text-gray-950 shadow-sm font-black';
            } else {
              activeCls = method === 'Mixed'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md font-black'
                : method === 'Wallet'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-md font-black'
                : method === 'Khata'
                ? 'bg-amber-700 text-white border-amber-700 shadow-md font-black'
                : 'bg-black text-white border-black shadow-md font-black';
            }
          } else {
            activeCls = isDark
              ? 'text-gray-400 hover:text-white hover:bg-gray-700/60 font-bold'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 font-bold';
          }

          return (
            <button
              key={method}
              type="button"
              onClick={() => handleSelectMethod(method)}
              className={`flex-1 min-w-[70px] py-2 px-1 text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${activeCls}`}
            >
              {method === 'Cash' && <Banknote size={13} className="shrink-0" />}
              {method === 'UPI' && <Smartphone size={13} className="shrink-0" />}
              {method === 'Card' && <CreditCard size={13} className="shrink-0" />}
              {method === 'Wallet' && <Wallet size={13} className="shrink-0 text-emerald-400" />}
              {method === 'Khata' && <BookOpen size={13} className="shrink-0 text-amber-500" />}
              {method === 'Mixed' && <Shuffle size={13} className="shrink-0" />}
              <span>
                {method === 'Bank Transfer'
                  ? 'Bank'
                  : method === 'Wallet'
                  ? `Wallet (₹${walletBalance})`
                  : method === 'Khata'
                  ? 'Khata (उधार)'
                  : method}
              </span>
            </button>
          );
        })}
      </div>

      {/* WALLET INFO BANNER */}
      {paymentMethod === 'Wallet' && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
          isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            <Wallet size={15} className="text-emerald-500 shrink-0" />
            <span>
              <strong>Advance Wallet:</strong> ₹{target.toLocaleString('en-IN')} will be deducted from guest's advance balance.
            </span>
          </div>
          <span className="font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[10px] shrink-0 ml-2">
            Avail: ₹{(walletBalance || 0).toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* KHATA INFO BANNER */}
      {paymentMethod === 'Khata' && (
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in ${
          isDark ? 'bg-amber-950/40 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            <BookOpen size={15} className="text-amber-500 shrink-0" />
            <span>
              <strong>Khata / Pay Later (उधार):</strong> ₹{target.toLocaleString('en-IN')} will be charged to the Primary Guest's Khata account.
            </span>
          </div>
          <span className="font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] shrink-0 ml-2">
            Pay Later
          </span>
        </div>
      )}

      {/* MIXED PAYMENT BREAKDOWN PANEL */}
      {paymentMethod === 'Mixed' && (
        <div className={`p-3.5 rounded-2xl border transition-all animate-in fade-in duration-200 ${
          isDark 
            ? 'bg-gray-800/95 border-amber-500/40 text-gray-100 shadow-lg' 
            : 'bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-amber-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${Math.abs(diff) < 0.01 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                Split Amount Breakdown
              </span>
            </div>
            <span className={`text-xs font-mono font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Total: ₹{target.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* CASH INPUT */}
            <div>
              <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Banknote size={12} className="text-emerald-500" />
                <span>Cash (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={splitBreakdown.cash ?? ''}
                  onChange={(e) => handleCashChange(e.target.value)}
                  className={`w-full pl-6 pr-2.5 py-1.5 text-sm font-black rounded-xl border outline-none transition-all ${
                    isDark 
                      ? 'bg-gray-900/90 border-gray-700 text-white focus:border-amber-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-black'
                  }`}
                />
              </div>
            </div>

            {/* UPI INPUT */}
            <div>
              <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Smartphone size={12} className="text-purple-500" />
                <span>UPI / Online (₹)</span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={splitBreakdown.upi ?? ''}
                  onChange={(e) => handleUpiChange(e.target.value)}
                  className={`w-full pl-6 pr-2.5 py-1.5 text-sm font-black rounded-xl border outline-none transition-all ${
                    isDark 
                      ? 'bg-gray-900/90 border-gray-700 text-white focus:border-amber-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-black'
                  }`}
                />
              </div>
            </div>

            {/* CARD INPUT (OPTIONAL) */}
            <div>
              <label className={`block text-[11px] font-bold mb-1 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <CreditCard size={12} className="text-blue-500" />
                <span>Card (₹) <span className="text-[10px] opacity-60 font-normal">opt</span></span>
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-gray-400">₹</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={splitBreakdown.card ?? ''}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className={`w-full pl-6 pr-2.5 py-1.5 text-sm font-black rounded-xl border outline-none transition-all ${
                    isDark 
                      ? 'bg-gray-900/90 border-gray-700 text-white focus:border-amber-400' 
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-black'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* ALLOCATION STATUS & QUICK HELPERS */}
          <div className="mt-3 pt-2.5 border-t border-gray-200/20 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {Math.abs(diff) < 0.01 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-[11px]">
                  <CheckCircle2 size={13} />
                  <span>₹{sum.toLocaleString('en-IN')} / ₹{target.toLocaleString('en-IN')} Fully Matched</span>
                </span>
              ) : diff > 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[11px]">
                  <AlertCircle size={13} />
                  <span>₹{diff.toLocaleString('en-IN')} remaining to allocate</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 text-red-500 border border-red-500/30 text-[11px]">
                  <AlertCircle size={13} />
                  <span>Exceeds total by ₹{Math.abs(diff).toLocaleString('en-IN')}</span>
                </span>
              )}
            </div>

            {diff > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => autoAllocateRemainder('upi')}
                  className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-purple-900/40 text-purple-300 border-purple-700/60 hover:bg-purple-800/60' 
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  + Add ₹{diff} to UPI
                </button>
                <button
                  type="button"
                  onClick={() => autoAllocateRemainder('cash')}
                  className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60 hover:bg-emerald-800/60' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  + Add ₹{diff} to Cash
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DYNAMIC UPI QR DISPLAY */}
      {/* 1. Full UPI mode */}
      {paymentMethod === 'UPI' && target > 0 && qrDetails && (
        <div className="pt-2">
          <DynamicUpiQr
            amount={target}
            roomNumber={qrDetails.roomNumber}
            guestName={qrDetails.guestName}
            hostel={qrDetails.hostel}
          />
        </div>
      )}

      {/* 2. Mixed mode where UPI portion > 0 */}
      {paymentMethod === 'Mixed' && Number(splitBreakdown?.upi) > 0 && qrDetails && (
        <div className="pt-2">
          <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-purple-600 flex items-center gap-1">
            <Smartphone size={12} />
            <span>UPI QR for Mixed Payment (₹{Number(splitBreakdown.upi).toLocaleString('en-IN')})</span>
          </div>
          <DynamicUpiQr
            amount={Number(splitBreakdown.upi)}
            roomNumber={qrDetails.roomNumber}
            guestName={qrDetails.guestName}
            hostel={qrDetails.hostel}
          />
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;

