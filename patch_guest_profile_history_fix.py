import sys, re

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'r') as f:
    content = f.read()

# 1. Fix Active Stay Logic
target_active = """            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room</p>
              <div className="flex items-center gap-2">
                <p className="font-black text-gray-900 text-xl">{activeStay.room?.roomNumber}</p>
                {activeStay.guest?._id !== guest._id && (
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-purple-200">Co-Guest</span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests` : `1 Guest`}</p>
              {activeStay.guest?._id !== guest._id && (
                 <p className="text-[10px] font-bold text-purple-600 mt-1 bg-purple-50 px-2 py-1 rounded-md">Primary: {activeStay.guest?.fullName}</p>
              )}
            </div>"""

rep_active = """            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room</p>
              <div className="flex items-center gap-2">
                <p className="font-black text-gray-900 text-xl">{activeStay.room?.roomNumber}</p>
                {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                  <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-purple-200">Co-Guest</span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests` : `1 Guest`}</p>
              {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                 <p className="text-[10px] font-bold text-purple-600 mt-1 bg-purple-50 px-2 py-1 rounded-md">Primary: {activeStay.guest?.fullName || 'Unknown'}</p>
              )}
            </div>"""
content = content.replace(target_active, rep_active)


# 2. Fix History Row Logic
target_history = """                {historyStays.map((stay) => (
                  <tr key={stay._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 text-base">{stay.room?.roomNumber || 'N/A'}</p>
                        {stay.guest?._id !== guest._id && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded border border-purple-200 font-black uppercase tracking-widest">Co-Guest</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.occupants} Guests</p>
                      {stay.guest?._id !== guest._id && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: {stay.guest?.fullName}</p>
                      )}
                    </td>"""

rep_history = """                {historyStays.map((stay) => {
                  const isPrimary = (typeof stay.guest === 'object' ? stay.guest?._id : stay.guest) === guest._id;
                  return (
                  <tr key={stay._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-gray-900 text-base">{stay.room?.roomNumber || 'N/A'}</p>
                        {!isPrimary && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] px-2 py-0.5 rounded border border-purple-200 font-black uppercase tracking-widest">Co-Guest</span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.occupants} Guests</p>
                      
                      {!isPrimary && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: {stay.guest?.fullName || 'Unknown'}</p>
                      )}
                      
                      {isPrimary && stay.coGuests && stay.coGuests.length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                          <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">With:</p>
                          <div className="flex flex-wrap gap-1">
                            {stay.coGuests.map(cg => (
                              <span key={cg._id} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                {cg.fullName || 'Unknown'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>"""

content = content.replace(target_history, rep_history)

# Also fix the map closing tags since we changed it to a block `=> { return ( ... ) }`
content = content.replace("""                  </tr>
                ))}
              </tbody>""", """                  </tr>
                );
                })}
              </tbody>""")

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'w') as f:
    f.write(content)
print("GuestProfile history table logic patched")
