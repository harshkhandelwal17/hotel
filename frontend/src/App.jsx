import React, { useContext } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Automatically choose HashRouter for local Electron file:// and BrowserRouter for Web/Cloud
const Router = typeof window !== 'undefined' && window.location.protocol === 'file:' ? HashRouter : BrowserRouter;

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
const Laundry = lazy(() => import('./pages/receptionist/Laundry'));
const DailyRegister = lazy(() => import('./pages/receptionist/DailyRegister'));
const RestaurantPos = lazy(() => import('./pages/receptionist/RestaurantPos'));
const SuperAdminDashboard = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const SalesDashboard = lazy(() => import('./pages/sales/SalesDashboard'));

import { ToastProvider } from './components/ui/Toast';
import { LanguageProvider } from './context/LanguageContext';

// Role-aware root redirect component
const RootRedirect = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/superadmin" replace />;
  if (user.role === 'sales') return <Navigate to="/sales" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ToastProvider>
        <Router>
        <Suspense fallback={<div className="flex items-center justify-center h-screen w-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
          <Routes>
          <Route path="/login" element={<Login />} />

          {/* Shared staff routes (Only for receptionists and hotel admins) */}
          <Route element={<ProtectedRoute allowedRoles={['receptionist', 'admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<ReceptionistDashboard />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/checkouts" element={<CheckoutList />} />
              <Route path="/rooms" element={<RoomsView />} />
              <Route path="/payments" element={<PaymentsList />} />
              <Route path="/laundry" element={<Laundry />} />
              <Route path="/guests/:id" element={<GuestProfile />} />
              <Route path="/guests" element={<GuestDirectory />} />
              <Route path="/register" element={<DailyRegister />} />
              <Route path="/daybook" element={<DailyRegister />} />
              <Route path="/pos" element={<RestaurantPos />} />
              <Route path="/restaurant" element={<RestaurantPos />} />
            </Route>
          </Route>

          {/* Hotel Admin and Superadmin */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'superadmin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/hostels" element={<ManageHostels />} />
              <Route path="/admin/rooms" element={<ManageRooms />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/staff" element={<ManageStaff />} />
            </Route>
          </Route>

          {/* Superadmin Headquarters only */}
          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/superadmin" element={<SuperAdminDashboard />} />
          </Route>

          {/* Sales Executive Portal */}
          <Route element={<ProtectedRoute allowedRoles={['sales', 'superadmin']} />}>
            <Route path="/sales" element={<SalesDashboard />} />
          </Route>

          {/* Smart Root & Fallback Redirects */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
        </Suspense>
      </Router>
      </ToastProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
