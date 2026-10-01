import sys
import re

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

target = r"if\s*\(\s*cg\.fullName\s*&&\s*cg\.mobileNumber\s*\)\s*{"
replacement = "if (cg.fullName && cg.fullName.trim() !== '') {"
content = re.sub(target, replacement, content)

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

print("Co-guest save condition fixed.")
