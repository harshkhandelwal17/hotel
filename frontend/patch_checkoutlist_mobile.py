import sys, re

with open('src/pages/receptionist/CheckoutList.jsx', 'r') as f:
    content = f.read()

# Filter Tabs flex-wrap
target_tabs = '<div className="flex space-x-2">'
replacement_tabs = '<div className="flex flex-wrap gap-2">'
content = content.replace(target_tabs, replacement_tabs)

# Don't hide financial details on mobile, just adjust layout
target_details = '<div className="text-right hidden sm:block">'
replacement_details = '<div className="text-right hidden md:block">'
content = content.replace(target_details, replacement_details)

# Actually we want it visible on mobile too, but maybe underneath the name.
# Let's replace the whole row layout inside the map to be fully responsive
row_target = re.compile(r'<div className="flex items-center justify-between">.*?<ChevronRight size=\{18\} className="text-gray-300" />\s*</div>\s*</div>', re.DOTALL)

row_replacement = """<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0 shadow-inner">
                        {stay.guest?.fullName?.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-base">{stay.guest?.fullName}</p>
                          {stay.occupants > 1 && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                              <Users size={11} /> {stay.occupants}
                            </span>
                          )}
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 mt-1">
                          {stay.guest?.mobileNumber} &bull; <span className="text-indigo-600 font-bold">Room {stay.room?.roomNumber}</span>
                        </p>
                        
                        {/* Mobile Details */}
                        <div className="mt-2 block sm:hidden">
                           <div className="text-xs font-bold text-gray-700">Total: ₹{stay.totalAmount} {balance > 0 ? <span className="text-red-500 ml-1">(-₹{balance} due)</span> : <span className="text-green-600 ml-1">✓ Paid</span>}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-0 border-gray-100 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                          <Clock size={12} className="mr-1" />
                          Checkout At
                        </div>
                        <div className="text-sm font-bold text-gray-900">
                          {format(new Date(stay.expectedCheckOutDate), 'dd MMM, hh:mm a')}
                        </div>
                      </div>
                      
                      <div className="hidden sm:block text-right ml-6">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Billing</div>
                        <div className="text-sm font-bold text-gray-900">
                          Total: ₹{stay.totalAmount}
                          {balance > 0 && <span className="text-red-600 ml-1">(-₹{balance})</span>}
                          {balance <= 0 && <span className="text-green-600 ml-1">✓ Paid</span>}
                        </div>
                      </div>
                      
                      <ChevronRight size={20} className="text-gray-300 ml-4 hidden sm:block" />
                    </div>
                  </div>"""
content = re.sub(row_target, row_replacement, content)

with open('src/pages/receptionist/CheckoutList.jsx', 'w') as f:
    f.write(content)
print("CheckoutList made fully responsive.")
