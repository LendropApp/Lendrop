import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import HostRoute from "./components/HostRoute";
import VerifiedRoute from "./components/VerifiedRoute";

import HostOnboardingWizard from "./pages/host-onboarding/HostOnboardingWizard";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Explore from "./pages/Explore";
import BecomeHostEntry from "./pages/BecomeHostEntry";
import PublishItem from "./pages/PublishItem";
import ItemDetail from "./pages/ItemDetail";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";

import RentalTracking from "./pages/RentalTracking";
import OwnerDeliveryReturn from "./pages/ownerdelivery";
import EarningsDashboard from "./pages/earningdashboard";
import LockerCoverage from "./pages/locker-coverage";
import Categories from "./pages/categories";

import Messages from "./pages/Messages";
import Notifications from "./pages/Notifications";
import Conversation from "./pages/Conversation";
import History from "./pages/History";
import Verification from "./pages/Verification";
import PaymentMethods from "./pages/PaymentMethods";
import PaymentReturn from "./pages/PaymentReturn";
import Premium from "./pages/Premium";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/item/:itemId" element={<ItemDetail />} />
          <Route path="/payment-return" element={<PaymentReturn />} />

          <Route
            path="/rental-tracking"
            element={
              <ProtectedRoute>
                <RentalTracking />
              </ProtectedRoute>
            }
          />

          <Route
            path="/owner-delivery"
            element={
              <ProtectedRoute>
                <OwnerDeliveryReturn />
              </ProtectedRoute>
            }
          />

          <Route
            path="/earnings-dashboard"
            element={
              <ProtectedRoute>
                <EarningsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/locker-coverage"
            element={<LockerCoverage />}
          />

          <Route
            path="/categories"
            element={<Categories />}
          />

          <Route
            path="/help"
            element={<RentalTracking />}
          />

          <Route
            path="/become-host"
            element={<BecomeHostEntry />}
          />

          {/* Protected Routes */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/favorites"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute>
                <Conversation />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />

          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <Verification />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment-methods"
            element={
              <ProtectedRoute>
                <PaymentMethods />
              </ProtectedRoute>
            }
          />

          <Route
            path="/premium"
            element={
              <ProtectedRoute>
                <Premium />
              </ProtectedRoute>
            }
          />

          <Route
            path="/become-host/onboarding"
            element={
              <ProtectedRoute>
                <HostOnboardingWizard />
              </ProtectedRoute>
            }
          />

          {/* Publishing needs BOTH: a host profile (HostRoute) and a
              verified identity (VerifiedRoute). The server enforces the
              verification half too — see migration 0019. */}
          <Route
            path="/publish"
            element={
              <HostRoute>
                <VerifiedRoute reason="publish">
                  <PublishItem />
                </VerifiedRoute>
              </HostRoute>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}