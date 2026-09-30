import sys, re

with open('src/pages/receptionist/CheckoutModal.jsx', 'r') as f:
    content = f.read()

# Replace the inner form content
target_form = re.compile(r'<form onSubmit=\{handleCheckout\}>.*?</form>', re.DOTALL)

replacement_form = """<form onSubmit={handleCheckout}>
          <div className="p-6 space-y-6">
            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl font-medium text-sm flex items-center gap-2"><AlertCircle size={16}/> {error}</div>}
            
            {/* Guest Identity Card */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-black"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Primary Guest</p>
                  <p className="font-black text-xl text-gray-900 leading-none">{stay.guest?.fullName}</p>
                  <p className="text-sm font-semibold text-gray-500 mt-1">{stay.guest?.mobileNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Room</p>
                  <p className="font-black text-2xl text-gray-900 leading-none">{stay.room?.roomNumber}</p>
                </div>
              </div>
              
              {stay.coGuests && stay.coGuests.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Along with {stay.coGuests.length} Co-Guest(s)</p>
                   <div className="flex flex-wrap gap-2">
                     {stay.coGuests.map((cg, i) => (
                       <span key={i} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 shadow-sm">{cg.fullName}</span>
                     ))}
                   </div>
                </div>
              )}
            </div>

            {/* Stay Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Checked In</p>
                <p className="font-bold text-blue-900 text-sm">{format(new Date(stay.checkInDate), 'dd MMM, hh:mm a')}</p>
              </div>
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Checking Out</p>
                <p className="font-bold text-orange-900 text-sm">{format(new Date(), 'dd MMM, hh:mm a')}</p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest mb-2 flex items-center gap-2"><CreditCard size={14}/> Settlement Summary</h3>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-semibold">Agreed Total Rent</span>
                <span className="font-black text-gray-900">₹{stay.totalAmount}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-semibold">Advance Paid</span>
                <span className="font-black text-green-600">- ₹{stay.paidAmount}</span>
              </div>
              
              {/* Additional Charges / Adjustments */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Additional Charges / Food / Damage (₹)</label>
                <div className="flex gap-2">
                  <div className="relative w-1/3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input type="number" min="0" placeholder="0" className="w-full pl-7 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-black text-gray-900 text-sm"
                      value={additionalCharges} onChange={e => setAdditionalCharges(e.target.value)} />
                  </div>
                  <input type="text" placeholder="Reason (e.g. Water bottle, Late checkout)" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium text-sm text-gray-900"
                    value={additionalChargesNote} onChange={e => setAdditionalChargesNote(e.target.value)} />
                </div>
              </div>

              {/* Final Math */}
              <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-200 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Final Balance Due</p>
                  {finalBalance > 0 ? (
                    <p className="text-xs font-semibold text-red-500">Collect this amount from guest</p>
                  ) : (
                    <p className="text-xs font-semibold text-green-500">Fully Settled</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{finalBalance}</p>
                </div>
              </div>
            </div>

            {finalBalance > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                <label className="block text-xs font-black text-gray-800 uppercase tracking-widest">Collect Payment</label>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input type="number" min="0" max={finalBalance} required
                      className="w-full pl-7 pr-3 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-black outline-none font-black text-xl text-gray-900 shadow-sm"
                      value={checkoutPayment} onChange={e => setCheckoutPayment(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setCheckoutPayment(finalBalance)} className="px-4 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-colors shadow-md active:scale-95">Full ₹{finalBalance}</button>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {['Cash', 'UPI', 'Card'].map(m => (
                    <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${paymentMethod === m ? 'bg-black text-white border-black shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-3xl">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancel</button>
            <button type="submit" disabled={loading || (finalBalance > 0 && Number(checkoutPayment) < finalBalance)} 
              className="px-8 py-2.5 bg-red-600 text-white text-sm font-black uppercase tracking-wide rounded-xl hover:bg-red-700 transition-colors shadow-md disabled:opacity-50 flex items-center gap-2 active:scale-95">
              {loading ? 'Processing...' : 'Confirm Checkout'} <ChevronRight size={16}/>
            </button>
          </div>
        </form>"""

content = re.sub(target_form, replacement_form, content)

with open('src/pages/receptionist/CheckoutModal.jsx', 'w') as f:
    f.write(content)
print("CheckoutModal Form Rewritten")
