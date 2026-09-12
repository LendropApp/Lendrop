import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import RentalTracking from "./pages/RentalTracking";
import OwnerDeliveryReturn from "./pages/ownerdelivery";
import EarningsDashboard from "./pages/earningdashboard";
import LockerCoverage from "./pages/locker-coverage";
import Categories from "./pages/categories";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
<Route path="/explore" element={<Explore />} />
<Route path="/rental-tracking" element={<RentalTracking />} />
          <Route path="/owner-delivery" element={<OwnerDeliveryReturn />} />
          <Route path="/earnings-dashboard" element={<EarningsDashboard />} />
          <Route path="/locker-coverage" element={<LockerCoverage />} />
          <Route path="/help" element={<RentalTracking />} />
          <Route path="/categories" element={<Categories />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<LockerCoverage />} />

          {/* Protected Route */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/locker-coverage" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}