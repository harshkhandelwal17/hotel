import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

target = """            <div className="flex items-center text-gray-500 mt-1">
              <Phone size={16} className="mr-1" />
              {guest.mobileNumber}
            </div>
          </div>
        </div>
        <div>"""

new_ui = """            <div className="flex items-center text-gray-500 mt-1">
              <Phone size={16} className="mr-1" />
              {guest.mobileNumber}
            </div>
            {guest.idProofNumber && (
              <div className="mt-3 flex items-center gap-3">
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-md border border-gray-200">
                  {guest.idProofType}: {guest.idProofNumber}
                </span>
                {guest.idProofImage && (
                  <a href={`http://127.0.0.1:5001${guest.idProofImage}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                    🔍 View ID Image
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <div>"""

if "🔍 View ID Image" not in content:
    content = content.replace(target, new_ui)
    with open(sys.argv[1], "w") as f:
        f.write(content)
    print("Updated GuestProfile")
else:
    print("Already updated")
