import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

// Lazy load all page components
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const CustomerDashboard = lazy(() => import('@/pages/CustomerDashboard'));
const MyDevices = lazy(() => import('@/pages/MyDevices'));
const CreateRepairOrder = lazy(() => import('@/pages/CreateRepairOrder'));
const MyRepairOrders = lazy(() => import('@/pages/MyRepairOrders'));
const RepairOrderDetails = lazy(() => import('@/pages/RepairOrderDetails'));
const AdminShell = lazy(() => import('@/components/admin/AdminShell'));
const AdminOverview = lazy(() => import('@/pages/admin/Overview'));
const AdminCustomers = lazy(() => import('@/pages/admin/Customers'));
const AdminTechnicians = lazy(() => import('@/pages/admin/Technicians'));
const AdminRepairs = lazy(() => import('@/pages/admin/Repairs'));
const AdminRepairDetails = lazy(() => import('@/pages/admin/AdminRepairDetails'));
const AdminInventory = lazy(() => import('@/pages/admin/Inventory'));
const AdminPayments = lazy(() => import('@/pages/admin/Payments'));
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'));
const AdminEstimates = lazy(() => import('@/pages/admin/Estimates'));
const AdminEstimateDetails = lazy(() => import('@/pages/admin/EstimateDetails'));
const TechnicianDashboard = lazy(() => import('@/pages/technician/Dashboard'));
const TechnicianShell = lazy(() => import('@/components/technician/TechnicianShell'));
const RepairWizard = lazy(() => import('@/pages/technician/RepairWizard'));
const CustomerProfile = lazy(() => import('@/pages/customer/Profile'));
const TechnicianProfilePage = lazy(() => import('@/pages/technician/Profile'));
const AdminProfile = lazy(() => import('@/pages/admin/Profile'));
const NotificationsPage = lazy(() => import('@/components/notifications/NotificationsPage'));

// Role-aware landing component for '/'
const RoleLanding: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'technician') return <Navigate to="/technician" replace />;
  // Default customer landing
  return <CustomerDashboard />;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

const AdminProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const TechnicianProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'technician') return <Navigate to="/" replace />;
  return <>{children}</>;
};

const CustomerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner fullPage />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'customer') {
    // Redirect non-customers to their home panels
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'technician') return <Navigate to="/technician" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner fullPage />}>
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Customer Routes */}
      <Route
        path="/"
        element={<RoleLanding />}
      />
      <Route
        path="/my-devices"
        element={
          <CustomerProtectedRoute>
            <MyDevices />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/create-repair"
        element={
          <CustomerProtectedRoute>
            <CreateRepairOrder />
          </CustomerProtectedRoute>
        }
      />
      {/* Back-compat: old creation URL */}
      <Route path="/repairs/new" element={<Navigate to="/create-repair" replace />} />
      {/* Back-compat: old list URL */}
      <Route path="/repairs" element={<Navigate to="/my-repairs" replace />} />
      <Route
        path="/my-repairs"
        element={
          <CustomerProtectedRoute>
            <MyRepairOrders />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <CustomerProtectedRoute>
            <NotificationsPage scope="customer" />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/repairs/:id"
        element={
          <CustomerProtectedRoute>
            <RepairOrderDetails />
          </CustomerProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <CustomerProtectedRoute>
            <CustomerProfile />
          </CustomerProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminShell />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="technicians" element={<AdminTechnicians />} />
        <Route path="repairs" element={<AdminRepairs />} />
        <Route path="repairs/:id" element={<AdminRepairDetails />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="estimates" element={<AdminEstimates />} />
        <Route path="estimates/:id" element={<AdminEstimateDetails />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="notifications" element={<NotificationsPage scope="admin" />} />
      </Route>

      {/* Technician Routes */}
      <Route
        path="/technician"
        element={
          <TechnicianProtectedRoute>
            <TechnicianShell />
          </TechnicianProtectedRoute>
        }
      >
        <Route index element={<TechnicianDashboard />} />
        <Route path="repair-wizard" element={<RepairWizard />} />
        <Route path="profile" element={<TechnicianProfilePage />} />
        <Route path="notifications" element={<NotificationsPage scope="technician" />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);
