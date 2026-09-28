import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

imports = "import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';\nimport { AuthContext } from '../../context/AuthContext';"
new_imports = "import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';\nimport { AuthContext } from '../../context/AuthContext';\nimport { useState, useEffect } from 'react';\nimport axios from 'axios';"
if "import { useState, useEffect } from 'react';" not in content:
    content = content.replace(imports, new_imports)

hook = "  const location = useLocation();"
new_hook = """  const location = useLocation();
  const [hostels, setHostels] = useState([]);
  const [globalProperty, setGlobalProperty] = useState(localStorage.getItem('adminGlobalProperty') || 'all');

  useEffect(() => {
    if (user?.role === 'admin') {
      axios.get('http://127.0.0.1:5001/api/hostels').then(res => setHostels(res.data.data)).catch(console.error);
    }
  }, [user]);

  const handlePropertyChange = (val) => {
    setGlobalProperty(val);
    localStorage.setItem('adminGlobalProperty', val);
    window.dispatchEvent(new Event('propertyChanged')); // simple way to notify
  };"""
if "const [globalProperty" not in content:
    content = content.replace(hook, new_hook)

outlet = "<Outlet />"
new_outlet = "<Outlet context={{ globalProperty }} />"
content = content.replace(outlet, new_outlet)

ui_target = """            <div className="flex items-center space-x-4">
              <div className="relative">"""

ui_new = """            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && (
                <select 
                  value={globalProperty} 
                  onChange={e => handlePropertyChange(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-black focus:border-black block p-2 font-semibold shadow-sm outline-none"
                >
                  <option value="all">🏢 All Properties</option>
                  {hostels.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
                </select>
              )}
              <div className="relative">"""

if "🏢 All Properties" not in content:
    content = content.replace(ui_target, ui_new)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated AppLayout")
