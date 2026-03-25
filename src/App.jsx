import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toast } from './components/Toast';

// Customer - lazy loaded
const Welcome        = lazy(() => import('./pages/Welcome'));
const Phone          = lazy(() => import('./pages/Phone'));
const Login          = lazy(() => import('./pages/Login'));
const Register       = lazy(() => import('./pages/Register'));
const Geo            = lazy(() => import('./pages/Geo'));
const Stores         = lazy(() => import('./pages/Stores'));
const Coupon         = lazy(() => import('./pages/Coupon'));
const StoreDetail    = lazy(() => import('./pages/StoreDetail'));
const Rating         = lazy(() => import('./pages/Rating'));
const Forgot         = lazy(() => import('./pages/Forgot'));

// Merchant - lazy loaded
const MerchantWelcome  = lazy(() => import('./pages/merchant/MerchantWelcome'));
const MerchantPhone    = lazy(() => import('./pages/merchant/MerchantPhone'));
const MerchantLogin    = lazy(() => import('./pages/merchant/MerchantLogin'));
const MerchantRegister = lazy(() => import('./pages/merchant/MerchantRegister'));
const MerchantDash     = lazy(() => import('./pages/merchant/MerchantDash'));

// Admin - lazy loaded
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDash  = lazy(() => import('./pages/admin/AdminDash'));
const NotFound   = lazy(() => import('./pages/NotFound'));

// Loading screen
function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:40 }}>⏳</div>
      <div style={{ fontSize:14, color:'var(--text3)' }}>جاري التحميل...</div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" replace />;
}

function AdminRoute({ children }) {
  return sessionStorage.getItem('h_admin') === '1'
    ? children
    : <Navigate to="/admin" replace />;
}

function MerchantRoute({ children }) {
  return localStorage.getItem('m_id')
    ? children
    : <Navigate to="/merchant" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Customer */}
        <Route path="/"         element={<Welcome />} />
        <Route path="/phone"    element={<Phone />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/geo"      element={<Geo />} />
        <Route path="/forgot"   element={<Forgot />} />
        <Route path="/stores"   element={<PrivateRoute><Stores /></PrivateRoute>} />
        <Route path="/coupon"   element={<PrivateRoute><Coupon /></PrivateRoute>} />
        <Route path="/store"    element={<PrivateRoute><StoreDetail /></PrivateRoute>} />
        <Route path="/rating"   element={<PrivateRoute><Rating /></PrivateRoute>} />

        {/* Merchant */}
        <Route path="/merchant"          element={<MerchantWelcome />} />
        <Route path="/merchant/phone"    element={<MerchantPhone />} />
        <Route path="/merchant/login"    element={<MerchantLogin />} />
        <Route path="/merchant/register" element={<MerchantRegister />} />
        <Route path="/merchant/dash"     element={<MerchantRoute><MerchantDash /></MerchantRoute>} />

        {/* Admin */}
        <Route path="/admin"     element={<AdminLogin />} />
        <Route path="/admin/dash" element={<AdminRoute><AdminDash /></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toast />
      </BrowserRouter>
    </AuthProvider>
  );
}
