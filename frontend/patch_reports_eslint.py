import sys, re

with open('src/pages/admin/Reports.jsx', 'r') as f:
    content = f.read()

# 1. Remove React, IndianRupee, CreditCard
content = content.replace("import React, { useState, useEffect, useMemo } from 'react';", "import { useState, useEffect, useMemo } from 'react';")
content = content.replace("IndianRupee, CreditCard, ", "")

# 2. Move fetchData
func_pattern = re.compile(r'async function fetchData\(\) \{.*?\}\n', re.DOTALL)
match = func_pattern.search(content)
if match:
    func_text = match.group(0)
    content = content.replace(func_text, '')
    insert_pos = content.find("useEffect(() => {")
    content = content[:insert_pos] + func_text + "\n  " + content[insert_pos:]

with open('src/pages/admin/Reports.jsx', 'w') as f:
    f.write(content)
print("Fixed ESLint issues in Reports.jsx")
