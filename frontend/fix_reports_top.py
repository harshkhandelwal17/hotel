import sys, re

with open('src/pages/admin/Reports.jsx', 'r') as f:
    content = f.read()

target = re.compile(r'const Reports = \(\) => \{.*?// Filter Stays', re.DOTALL)

replacement = """const Reports = () => {
  const [stays, setStays] = useState([]);
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };
  const [hostelFilter, setHostelFilter] = useState(globalProperty || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (globalProperty) setHostelFilter(globalProperty);
  }, [globalProperty]);

  async function fetchData() {
    try {
      setLoading(true);
      const [staysRes, hostelsRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/stays'),
        axios.get((import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001') + '/api/hostels')
      ]);
      setStays(staysRes.data.data);
      setHostels(hostelsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Stays"""

content = re.sub(target, replacement, content)

with open('src/pages/admin/Reports.jsx', 'w') as f:
    f.write(content)
print("Reports.jsx top part completely fixed.")
