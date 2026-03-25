import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toast } from './components/Toast';

// Customer
import Welcome from './pages/Welcome';
import Phone from './pages/Phone';
import Login from './pages/Login';
import Register from './pages/Register';
import Geo from './pages/Geo';
import Stores from './pages/Stores';
import Coupon from './pages/Coupon';
import Rating from './pages/Rating';
import Forgot from './pages/Forgot';

// Merchant
import MerchantWelcome from './pages/merchant/MerchantWelcome';
import MerchantPhone from './pages/merchant/MerchantPhone';
import MerchantLogin from './pages/merchant/MerchantLogin';
import MerchantRegister from './pages/merchant/MerchantRegister';
import MerchantDash from './pages/merchant/MerchantDash';

// Admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminDash from './pages/admin/AdminDash';

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
    <Routes>
      {/* Customer */}
      <Route path="/" element={<Welcome />} />
      <Route path="/phone" element={<Phone />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/geo" element={<Geo />} />
      <Route path="/forgot" element={<Forgot />} />
      <Route path="/stores" element={<PrivateRoute><Stores /></PrivateRoute>} />
      <Route path="/coupon" element={<PrivateRoute><Coupon /></PrivateRoute>} />
      <Route path="/rating" element={<PrivateRoute><Rating /></PrivateRoute>} />

      {/* Merchant */}
      <Route path="/merchant" element={<MerchantWelcome />} />
      <Route path="/merchant/phone" element={<MerchantPhone />} />
      <Route path="/merchant/login" element={<MerchantLogin />} />
      <Route path="/merchant/register" element={<MerchantRegister />} />
      <Route path="/merchant/dash" element={<MerchantRoute><MerchantDash /></MerchantRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dash" element={<AdminRoute><AdminDash /></AdminRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
