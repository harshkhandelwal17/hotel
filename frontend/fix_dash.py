import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

# Fix Imports
imp1 = "import { Link } from 'react-router-dom';"
imp2 = "import { Link, useOutletContext } from 'react-router-dom';"
if "useOutletContext" not in content:
    content = content.replace(imp1, imp2)

# Add globalProperty
hook1 = "  const [loading, setLoading] = useState(true);"
hook2 = "  const [loading, setLoading] = useState(true);\n  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };"
if "globalProperty } = useOutletContext" not in content:
    content = content.replace(hook1, hook2)

# Fix API calls
api1 = """  const fetchDashboardData = async () => {
    try {
      const [statsRes, staysRes] = await Promise.all([
        axios.get('http://127.0.0.1:5001/api/reports/dashboard'),
        axios.get('http://127.0.0.1:5001/api/stays?status=Active')
      ]);"""
api2 = """  const fetchDashboardData = async () => {
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [statsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/reports/dashboard${propQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active${ampQuery}`)
      ]);"""
if "propQuery" not in content:
    content = content.replace(api1, api2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Dashboard fixed")
