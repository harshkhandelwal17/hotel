import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target1 = """                  {activeStay.coGuests.map(cg => (
                    <span key={cg._id} className="bg-white border border-blue-200 px-3 py-1 rounded-full text-xs text-blue-700 font-medium">
                      {cg.fullName} ({cg.mobileNumber})
                    </span>
                  ))}"""

replacement1 = """                  {activeStay.coGuests.map(cg => (
                    <span key={cg._id} className="bg-white border border-blue-200 px-3 py-1 rounded-full text-xs text-blue-700 font-medium flex items-center gap-1">
                      {cg.fullName} ({cg.mobileNumber})
                      {cg.idProofImage && (
                        <a href={`http://127.0.0.1:5001${cg.idProofImage}`} target="_blank" rel="noreferrer" className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded text-blue-800 hover:bg-blue-200 ml-1">
                          ID
                        </a>
                      )}
                    </span>
                  ))}"""

content = content.replace(target1, replacement1)

target2 = """                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {stay.coGuests && stay.coGuests.length > 0 
                        ? stay.coGuests.map(g => g.fullName).join(', ') 
                        : <span className="text-gray-400 italic">None</span>}
                    </td>"""

replacement2 = """                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      {stay.coGuests && stay.coGuests.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {stay.coGuests.map((g, i) => (
                            <span key={g._id || i} className="inline-flex items-center">
                              {g.fullName}
                              {g.idProofImage && (
                                <a href={`http://127.0.0.1:5001${g.idProofImage}`} target="_blank" rel="noreferrer" className="ml-1 text-[10px] font-bold text-blue-600 hover:underline">
                                  [ID]
                                </a>
                              )}
                              {i < stay.coGuests.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400 italic">None</span>}
                    </td>"""

content = content.replace(target2, replacement2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated GuestProfile coguests UI")
