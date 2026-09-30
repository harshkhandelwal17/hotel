import sys, re

with open('src/components/common/GlobalSearch.jsx', 'r') as f:
    content = f.read()

content = content.replace('const GlobalSearch = () => {', 'const GlobalSearch = ({ onResultClick }) => {')
content = content.replace('navigate(`/guests/${guestId}`);', 'navigate(`/guests/${guestId}`);\n    if (onResultClick) onResultClick();')

with open('src/components/common/GlobalSearch.jsx', 'w') as f:
    f.write(content)
print("GlobalSearch patched")
