import sys, re

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'r') as f:
    content = f.read()

# 1. Active Stay Co-Guests
target_active_cg = """                  {activeStay.coGuests.map(cg => (
                    <span key={cg._id} className="bg-white border-2 border-gray-100 px-4 py-2 rounded-xl text-sm text-gray-800 font-bold flex items-center gap-2 shadow-sm">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center"><User size={12} className="text-gray-500"/></div>
                      {cg.fullName} <span className="text-gray-400 font-medium">({cg.mobileNumber})</span>
                      {cg.idProofImage && (
                        <a href={(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImage}`)} target="_blank" rel="noreferrer" 
                           className="text-[10px] uppercase tracking-wider font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 ml-2 border border-blue-100 transition-colors">
                          View ID
                        </a>
                      )}
                    </span>
                  ))}"""

rep_active_cg = """                  {activeStay.coGuests.map(cg => (
                    <Link to={`/guests/${cg._id}`} key={cg._id} className="bg-white border-2 border-gray-100 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 transition-all px-4 py-2 rounded-xl text-sm text-gray-800 font-bold flex flex-col sm:flex-row sm:items-center gap-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center"><User size={12} className="text-indigo-600"/></div>
                        {cg.fullName} <span className="text-gray-400 font-medium">({cg.mobileNumber})</span>
                      </div>
                      <div className="flex items-center gap-2 sm:ml-2">
                        {cg.idProofType && cg.idProofNumber && (
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                             {cg.idProofType}: {cg.idProofNumber}
                           </span>
                        )}
                        {cg.idProofImage && (
                          <a href={(cg.idProofImage?.startsWith('http') ? cg.idProofImage : `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001'}${cg.idProofImage}`)} target="_blank" rel="noreferrer" 
                             onClick={(e) => e.stopPropagation()}
                             className="text-[10px] uppercase tracking-wider font-black bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md hover:bg-indigo-200 border border-indigo-200 transition-colors">
                            View ID
                          </a>
                        )}
                      </div>
                    </Link>
                  ))}"""
content = content.replace(target_active_cg, rep_active_cg)

# 2. History Table Primary Guest Link
target_history_primary = """                      {!isPrimary && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1 bg-purple-50 px-2 py-1 rounded-md">Primary: {activeStay.guest?.fullName || 'Unknown'}</p>
                      )}"""
# Wait, this is in active stay! Let's check history row target.
target_history_primary_row = """                      {!isPrimary && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: {stay.guest?.fullName || 'Unknown'}</p>
                      )}"""

rep_history_primary_row = """                      {!isPrimary && stay.guest?._id ? (
                        <Link to={`/guests/${stay.guest._id}`} className="inline-block text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline mt-1 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          Primary: {stay.guest?.fullName || 'Unknown'}
                        </Link>
                      ) : !isPrimary && (
                        <p className="text-[10px] font-bold text-purple-600 mt-1">Primary: Unknown</p>
                      )}"""
content = content.replace(target_history_primary_row, rep_history_primary_row)


# 3. History Table Co-Guests Link
target_history_cg = """                            {stay.coGuests.map(cg => (
                              <span key={cg._id} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                {cg.fullName || 'Unknown'}
                              </span>
                            ))}"""

rep_history_cg = """                            {stay.coGuests.map(cg => (
                              <Link to={`/guests/${cg._id}`} key={cg._id} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 px-2 py-1 rounded-md border border-indigo-100 transition-colors">
                                {cg.fullName || 'Unknown'}
                              </Link>
                            ))}"""
content = content.replace(target_history_cg, rep_history_cg)

# 4. Active Stay Primary Guest Link
target_active_primary = """              {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                 <p className="text-[10px] font-bold text-purple-600 mt-1 bg-purple-50 px-2 py-1 rounded-md">Primary: {activeStay.guest?.fullName || 'Unknown'}</p>
              )}"""

rep_active_primary = """              {((typeof activeStay.guest === 'object' ? activeStay.guest?._id : activeStay.guest) !== guest._id) && (
                 <Link to={`/guests/${typeof activeStay.guest === 'object' ? activeStay.guest._id : activeStay.guest}`} className="inline-block text-[10px] font-bold text-purple-700 hover:text-purple-900 hover:underline mt-1 bg-purple-50 px-2 py-1 rounded-md border border-purple-100 transition-colors">
                   Primary: {activeStay.guest?.fullName || 'Unknown'}
                 </Link>
              )}"""
content = content.replace(target_active_primary, rep_active_primary)

with open('frontend/src/pages/receptionist/GuestProfile.jsx', 'w') as f:
    f.write(content)
print("GuestProfile Links patched")
