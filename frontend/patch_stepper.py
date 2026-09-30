import sys, re

with open('src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Update the Stepper UI
target_stepper = """<div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-500 rounded-full z-0" style={{ width: `${(step - 1) * 50}%` }}></div>
        {[1, 2, 3].map(num => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${step >= num ? 'bg-black text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}`}>
              {num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${step >= num ? 'text-black' : 'text-gray-400'}`}>
              {num === 1 ? 'Room' : num === 2 ? 'Guests' : 'Billing'}
            </span>
          </div>
        ))}"""

replacement_stepper = """<div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black transition-all duration-500 rounded-full z-0" style={{ width: `${(step - 1) * 100}%` }}></div>
        {[1, 2].map(num => (
          <div key={num} className="relative z-10 flex flex-col items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${step >= num ? 'bg-black text-white' : 'bg-white text-gray-400 border-2 border-gray-100'}`}>
              {num}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wide ${step >= num ? 'text-black' : 'text-gray-400'}`}>
              {num === 1 ? 'Stay Details' : 'Guest Identity'}
            </span>
          </div>
        ))}"""

content = content.replace(target_stepper, replacement_stepper)

with open('src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Stepper updated to 2 steps.")
