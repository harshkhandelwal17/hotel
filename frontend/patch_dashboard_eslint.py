import sys, re

with open('src/pages/receptionist/Dashboard.jsx', 'r') as f:
    content = f.read()

# I will just remove React import if not needed, and move fetchDashboardData above useEffect.
content = content.replace("import React, { useState, useEffect } from 'react';", "import { useState, useEffect } from 'react';")

# Find the function and move it.
func_pattern = re.compile(r'async function fetchDashboardData\(\) \{.*?\}\;', re.DOTALL)
match = func_pattern.search(content)
if match:
    func_text = match.group(0)
    # Remove it from original place
    content = content.replace(func_text, '')
    # Insert it right after state declarations
    insert_pos = content.find("const [loading, setLoading] = useState(true);")
    if insert_pos != -1:
        insert_pos = content.find('\n', insert_pos) + 1
        content = content[:insert_pos] + "\n  " + func_text + "\n" + content[insert_pos:]

with open('src/pages/receptionist/Dashboard.jsx', 'w') as f:
    f.write(content)
print("Dashboard ESLint Fixed")
