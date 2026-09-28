import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

imp1 = "import React, { useState, useEffect } from 'react';"
imp2 = "import React, { useState, useEffect } from 'react';\nimport { useOutletContext } from 'react-router-dom';"
if "useOutletContext" not in content:
    content = content.replace(imp1, imp2)

hook1 = "  const [search, setSearch] = useState('');"
hook2 = "  const [search, setSearch] = useState('');\n  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };"
if "globalProperty" not in content:
    content = content.replace(hook1, hook2)

fetch1 = """  async function fetchStays() {
    try {
      const res = await axios.get('http://127.0.0.1:5001/api/stays?status=Active');"""
fetch2 = """  async function fetchStays() {
    try {
      const propQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const res = await axios.get(`http://127.0.0.1:5001/api/stays?status=Active${propQuery}`);"""
if "propQuery" not in content:
    content = content.replace(fetch1, fetch2)

dep1 = "  useEffect(() => { fetchStays(); }, []);"
dep2 = "  useEffect(() => { fetchStays(); }, [globalProperty]);\n  useEffect(() => {\n    const handlePropChange = () => fetchStays();\n    window.addEventListener('propertyChanged', handlePropChange);\n    return () => window.removeEventListener('propertyChanged', handlePropChange);\n  }, [globalProperty]);"
if "propertyChanged" not in content:
    content = content.replace(dep1, dep2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated CheckoutList")
