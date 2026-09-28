import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

imp1 = "import React, { useState, useEffect } from 'react';"
imp2 = "import React, { useState, useEffect } from 'react';\nimport { useOutletContext } from 'react-router-dom';"
if "useOutletContext" not in content:
    content = content.replace(imp1, imp2)

hook1 = "  const [loading, setLoading] = useState(true);"
hook2 = "  const [loading, setLoading] = useState(true);\n  const { globalProperty } = useOutletContext() || { globalProperty: 'all' };"
if "globalProperty" not in content:
    content = content.replace(hook1, hook2)

fetch1 = """  async function fetchRoomsAndStays() {
    try {
      const [roomsRes, staysRes] = await Promise.all([
        axios.get('http://127.0.0.1:5001/api/rooms'),
        axios.get('http://127.0.0.1:5001/api/stays?status=Active')
      ]);"""
fetch2 = """  async function fetchRoomsAndStays() {
    try {
      const propQuery = globalProperty !== 'all' ? `?hostel=${globalProperty}` : '';
      const ampQuery = globalProperty !== 'all' ? `&hostel=${globalProperty}` : '';
      const [roomsRes, staysRes] = await Promise.all([
        axios.get(`http://127.0.0.1:5001/api/rooms${propQuery}`),
        axios.get(`http://127.0.0.1:5001/api/stays?status=Active${ampQuery}`)
      ]);"""
if "propQuery" not in content:
    content = content.replace(fetch1, fetch2)

dep1 = "  useEffect(() => { fetchRoomsAndStays(); }, []);"
dep2 = "  useEffect(() => { fetchRoomsAndStays(); }, [globalProperty]);\n  useEffect(() => {\n    const handlePropChange = () => fetchRoomsAndStays();\n    window.addEventListener('propertyChanged', handlePropChange);\n    return () => window.removeEventListener('propertyChanged', handlePropChange);\n  }, [globalProperty]);"
if "propertyChanged" not in content:
    content = content.replace(dep1, dep2)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated RoomsView")
