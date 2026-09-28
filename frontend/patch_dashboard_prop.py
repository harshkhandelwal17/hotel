import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

imp1 = "import React, { useState, useEffect } from 'react';"
imp2 = "import React, { useState, useEffect } from 'react';\nimport { useOutletContext } from 'react-router-dom';"
if "useOutletContext" not in content:
    content = content.replace(imp1, imp2)

hook1 = "  const [recentCheckouts, setRecentCheckouts] = useState([]);"
hook2 = "  const [recentCheckouts, setRecentCheckouts] = useState([]);\n  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };"
if "globalProperty" not in content:
    content = content.replace(hook1, hook2)

fetch1 = """  const fetchDashboardData = async () => {
    try {
      const [statsRes, checkinsRes, checkoutsRes] = await Promise.all([
        axios.get('http://127.0.0.1:5001/api/reports/dashboard'),
        axios.get('http://127.0.0.1:5001/api/stays?status=Active'),
        axios.get('http://127.0.0.1:5001/api/stays?status=Completed')
      ]);"""
fetch2 = """  const fetchDashboardData = async () => {
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [statsRes, checkinsRes, checkoutsRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/reports/dashboard${propQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active${ampQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Completed${ampQuery}`)
      ]);"""
if "propQuery" not in content:
    content = content.replace(fetch1, fetch2)

dep1 = "  useEffect(() => {\n    fetchDashboardData();\n  }, []);"
dep2 = "  useEffect(() => {\n    fetchDashboardData();\n  }, [globalProperty]);\n  useEffect(() => {\n    const handlePropChange = () => fetchDashboardData();\n    window.addEventListener('propertyChanged', handlePropChange);\n    return () => window.removeEventListener('propertyChanged', handlePropChange);\n  }, [globalProperty]);"
if "propertyChanged" not in content:
    content = content.replace(dep1, dep2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated Dashboard")
