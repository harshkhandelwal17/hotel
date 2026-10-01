import sys
import re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Fix isStep2Valid
old_valid = """  const isStep2Valid =
    guests.every(
      (g) =>
        g.fullName.trim() &&
        g.mobileNumber.length >= 10
    );"""

new_valid = """  const isStep2Valid = guests.every((g, idx) => {
    if (!g.fullName.trim()) return false;
    if (idx === 0) return g.mobileNumber.length === 10;
    return true;
  });"""
content = content.replace(old_valid, new_valid)

# Fix UI required asterisk
old_label = """<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Mobile <span className="text-red-500">*</span>
                  </label>"""
new_label = """<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                    Mobile {index === 0 && <span className="text-red-500">*</span>}
                  </label>"""
content = content.replace(old_label, new_label)

# Fix UI input required attribute
old_input = """<input
                    type="tel"
                    required
                    placeholder="10-digit mobile"
                    value={guest.mobileNumber}"""
new_input = """<input
                    type="tel"
                    required={index === 0}
                    placeholder="10-digit mobile"
                    value={guest.mobileNumber}"""
content = content.replace(old_input, new_input)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Co-guest mobile optional fix applied.")
