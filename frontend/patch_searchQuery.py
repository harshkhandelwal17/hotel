import sys

with open('src/pages/admin/Reports.jsx', 'r') as f:
    content = f.read()

target = "const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');"
replacement = """const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);"""

content = content.replace(target, replacement)

with open('src/pages/admin/Reports.jsx', 'w') as f:
    f.write(content)
print("Restored searchQuery and useEffect.")
