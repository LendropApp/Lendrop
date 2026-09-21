import { useNavigate, useLocation } from 'react-router-dom'

// Every screen used to hardcode where "Back" goes (e.g. always "/profile"),
// so navigating Explore -> History -> Track and hitting back skipped History
// entirely. Instead, go back one step in the actual browser history when we
// arrived from inside the app, and only fall back to a fixed route when
// there's no in-app history to return to (e.g. the page was opened directly).
export default function useSmartBack(fallback) {
  const navigate = useNavigate()
  const location = useLocation()

  return function goBack(e) {
    e?.preventDefault?.()
    if (location.key !== 'default') {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }
}
