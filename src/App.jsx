import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PublicProfile from './Profile/PublicProfile'

const AuthenticatedApp = lazy(() => import('./AuthenticatedApp.jsx'))

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/profile" element={<PublicProfile />} />
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <AuthenticatedApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
