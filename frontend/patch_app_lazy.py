import sys

with open(sys.argv[1], "r") as f:
    content = f.read()

import_target = """// Pages
import Login from './pages/auth/Login';
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import CheckIn from './pages/receptionist/CheckIn';
import CheckoutList from './pages/receptionist/CheckoutList';
import RoomsView from './pages/receptionist/RoomsView';

import AppLayout from './components/layout/AppLayout';

import GuestProfile from './pages/receptionist/GuestProfile';
import ManageHostels from './pages/admin/ManageHostels';
import ManageRooms from './pages/admin/ManageRooms';
import Reports from './pages/admin/Reports';
import ManageStaff from './pages/admin/ManageStaff';
import PaymentsList from './pages/receptionist/PaymentsList';"""

import_replacement = """// Pages - Lazy Loaded for Extreme Performance
import { lazy, Suspense } from 'react';
import AppLayout from './components/layout/AppLayout';

const Login = lazy(() => import('./pages/auth/Login'));
const ReceptionistDashboard = lazy(() => import('./pages/receptionist/Dashboard'));
const CheckIn = lazy(() => import('./pages/receptionist/CheckIn'));
const CheckoutList = lazy(() => import('./pages/receptionist/CheckoutList'));
const RoomsView = lazy(() => import('./pages/receptionist/RoomsView'));
const GuestProfile = lazy(() => import('./pages/receptionist/GuestProfile'));
const ManageHostels = lazy(() => import('./pages/admin/ManageHostels'));
const ManageRooms = lazy(() => import('./pages/admin/ManageRooms'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const ManageStaff = lazy(() => import('./pages/admin/ManageStaff'));
const PaymentsList = lazy(() => import('./pages/receptionist/PaymentsList'));"""

content = content.replace(import_target, import_replacement)

routes_target = "<Routes>"
routes_replacement = """<Suspense fallback={<div className="flex items-center justify-center h-screen w-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
          <Routes>"""

routes_end_target = "</Routes>"
routes_end_replacement = """</Routes>\n        </Suspense>"""

if "Suspense fallback" not in content:
    content = content.replace(routes_target, routes_replacement)
    content = content.replace(routes_end_target, routes_end_replacement)

with open(sys.argv[1], "w") as f:
    f.write(content)
print("Updated App.jsx with React Lazy Loading")
