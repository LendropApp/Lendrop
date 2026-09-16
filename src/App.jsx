import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HostRoute from './components/HostRoute'
import HostOnboardingWizard from './pages/host-onboarding/HostOnboardingWizard';

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import BecomeHostEntry from './pages/BecomeHostEntry';
import PublishItem from './pages/PublishItem'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/become-host" element={<BecomeHostEntry />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
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
          <Route
            path="/publish"
            element={
              <HostRoute>
                <PublishItem />
              </HostRoute>
            }
          />

          {/* Unknown routes fall back to the landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}