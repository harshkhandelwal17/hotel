import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Pages - Lazy Loaded for Extreme Performance
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
const PaymentsList = lazy(() => import('./pages/receptionist/PaymentsList'));
const GuestDirectory = lazy(() => import('./pages/receptionist/GuestDirectory'));

import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <Suspense fallback={<div className="flex items-center justify-center h-screen w-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
          <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<ProtectedRoute allowedRoles={['receptionist', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ReceptionistDashboard />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/checkouts" element={<CheckoutList />} />
              <Route path="/rooms" element={<RoomsView />} />
              <Route path="/payments" element={<PaymentsList />} />
              <Route path="/guests/:id" element={<GuestProfile />} />
              <Route path="/admin/hostels" element={<ManageHostels />} />
              <Route path="/admin/rooms" element={<ManageRooms />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/staff" element={<ManageStaff />} />
              <Route path="/guests" element={<GuestDirectory />} />
            </Route>
          </Route>
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        </Suspense>
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
