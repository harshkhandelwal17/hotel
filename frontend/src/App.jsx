import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
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

const PageLoader = () => (
  <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
    <div className="h-16 bg-white border-b border-gray-100 animate-pulse" />
    <div className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </div>
  </div>
);

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
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
                </Route>
              </Route>
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
