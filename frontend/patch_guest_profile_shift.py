import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_target = "import ExtendStayModal from './ExtendStayModal';"
import_replacement = "import ExtendStayModal from './ExtendStayModal';\nimport ShiftRoomModal from './ShiftRoomModal';"
if "ShiftRoomModal" not in content:
    content = content.replace(import_target, import_replacement)

state_target = "const [extendModalOpen, setExtendModalOpen] = useState(false);"
state_replacement = "const [extendModalOpen, setExtendModalOpen] = useState(false);\n  const [shiftModalOpen, setShiftModalOpen] = useState(false);"
if "shiftModalOpen" not in content:
    content = content.replace(state_target, state_replacement)

button_target = """                <button onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }} className="px-4 py-2 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
                  Extend Stay
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                  Print Bill
                </button>"""
button_replacement = """                <button onClick={() => { setSelectedStay(activeStay); setShiftModalOpen(true); }} className="px-4 py-2 border border-orange-200 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-50 transition-colors">
                  Shift Room
                </button>
                <button onClick={() => { setSelectedStay(activeStay); setExtendModalOpen(true); }} className="px-4 py-2 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
                  Extend Stay
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                  Print Bill
                </button>"""
if "Shift Room" not in content:
    content = content.replace(button_target, button_replacement)

modal_target = """      {extendModalOpen && selectedStay && (
        <ExtendStayModal 
          stay={selectedStay} 
          onClose={() => setExtendModalOpen(false)}
          onSuccess={() => {
            setExtendModalOpen(false);
            fetchGuest();
          }}
        />
      )}"""
modal_replacement = """      {extendModalOpen && selectedStay && (
        <ExtendStayModal 
          stay={selectedStay} 
          onClose={() => setExtendModalOpen(false)}
          onSuccess={() => {
            setExtendModalOpen(false);
            fetchGuest();
          }}
        />
      )}
      {shiftModalOpen && selectedStay && (
        <ShiftRoomModal 
          stay={selectedStay} 
          onClose={() => setShiftModalOpen(false)}
          onSuccess={() => {
            setShiftModalOpen(false);
            fetchGuest();
          }}
        />
      )}"""
if "ShiftRoomModal" not in modal_target:
    content = content.replace(modal_target, modal_replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated GuestProfile.jsx with Shift Room feature")
