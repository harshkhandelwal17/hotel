import sys

# 1. Fix CheckIn.jsx
with open('frontend/src/pages/receptionist/CheckIn.jsx', 'r') as f:
    content = f.read()

# Fix the API constant
content = content.replace("const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001';", "const API = import.meta.env.VITE_API_URL || '';")

# Fix the checkin route
content = content.replace("await axios.post(`${API}/api/stays/checkin`", "await axios.post(`${API}/api/stays`")

with open('frontend/src/pages/receptionist/CheckIn.jsx', 'w') as f:
    f.write(content)

# 2. Fix App.jsx
with open('frontend/src/App.jsx', 'r') as f:
    app_content = f.read()

import_toast = "import { ToastProvider } from './components/ui/Toast';\n"
if "ToastProvider" not in app_content:
    app_content = app_content.replace("import ProtectedRoute from './routes/ProtectedRoute';", "import ProtectedRoute from './routes/ProtectedRoute';\n" + import_toast)
    app_content = app_content.replace("<AuthProvider>", "<AuthProvider>\n      <ToastProvider>")
    app_content = app_content.replace("</AuthProvider>", "      </ToastProvider>\n    </AuthProvider>")

with open('frontend/src/App.jsx', 'w') as f:
    f.write(app_content)

print("All fixes applied")
