import sys, re

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'r') as f:
    content = f.read()

# 1. Modify Active Stay Room Block
target_active_room = """            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Room</p>
              <p className="font-black text-gray-900 text-xl">{activeStay.room?.roomNumber}</p>
              <p className="text-xs font-bold text-gray-500 mt-1">{activeStay.occupants > 1 ? `${activeStay.occupants} Guests` : `1 Guest`}</p>
            </div>"""

rep_active_room = """            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
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

content = content.replace(target_active_room, rep_active_room)

# 2. Modify History Table Rows
target_history_td = """                    <td className="px-6 py-5">
                      <p className="font-black text-gray-900">{stay.room?.roomNumber || 'N/A'}</p>
                      <p className="text-xs font-bold text-gray-500 mt-0.5">{stay.occupants} Guests</p>
                    </td>"""

rep_history_td = """                    <td className="px-6 py-5">
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

content = content.replace(target_history_td, rep_history_td)

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'w') as f:
    f.write(content)
print("GuestProfile roles patched")
