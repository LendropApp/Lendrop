import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// React Router doesn't scroll to #anchors on client-side navigation, so a
// footer link like /help#lockers would land at the top of the page. Call
// this on pages that have anchored sections; `ready` lets a page wait until
// the section it would scroll to has rendered.
export default function useHashScroll(ready = true) {
  const { hash } = useLocation()

  useEffect(() => {
    if (!ready || !hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    target?.scrollIntoView({ block: 'start' })
  }, [hash, ready])
}
