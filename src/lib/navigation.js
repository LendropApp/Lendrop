import {
  Bell,
  CalendarCheck,
  Compass,
  CreditCard,
  DollarSign,
  Edit3,
  Heart,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  MapPin,
  MessageCircle,
  PackageSearch,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  UserCircle2,
} from 'lucide-react'

// The full navigation map, in one place, so the mobile drawer doesn't
// drift from whatever a given page happens to link to. Sections are
// built per role: a renter gets "Renting" + "Account", a host gets the
// "Hosting" section on top of those. Someone who is both sees each
// entry once — the sections don't overlap, so there is nothing to
// de-duplicate.
//
// Keep this in sync with the route list in App.jsx.

export function buildNavSections({ isHost = false, isAdmin = false } = {}) {
  const sections = [
    {
      id: 'renting',
      title: 'Renting',
      items: [
        { to: '/explore', label: 'Explore', icon: Compass },
        { to: '/history', label: 'My bookings', icon: CalendarCheck },
        { to: '/rental-tracking', label: 'Track a rental', icon: PackageSearch },
        { to: '/favorites', label: 'Saved items', icon: Heart },
        { to: '/messages', label: 'Messages', icon: MessageCircle },
        { to: '/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
      ],
    },
  ]

  if (isHost) {
    sections.push({
      id: 'hosting',
      title: 'Hosting',
      items: [
        { to: '/publish', label: 'Publish an item', icon: Plus },
        { to: '/my-listings', label: 'My listings', icon: LayoutList },
        { to: '/earnings-dashboard', label: 'Earnings', icon: DollarSign },
        { to: '/owner-delivery', label: 'Drop-offs & returns', icon: Truck },
      ],
    })
  }

  sections.push({
    id: 'account',
    title: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/profile/edit', label: 'Edit profile', icon: Edit3 },
      { to: '/verification', label: 'Verification', icon: ShieldCheck, badge: 'verification' },
      { to: '/payment-methods', label: 'Payment methods', icon: CreditCard },
      { to: '/premium', label: 'Premium', icon: Sparkles },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  })

  sections.push({
    id: 'discover',
    title: 'Discover',
    items: [
      { to: '/categories', label: 'Categories', icon: LayoutGrid },
      { to: '/locker-coverage', label: 'Locker coverage', icon: MapPin },
    ],
  })

  if (isAdmin) {
    sections.push({
      id: 'admin',
      title: 'Admin',
      items: [{ to: '/admin', label: 'Admin panel', icon: LayoutDashboard }],
    })
  }

  return sections
}

// Shown to renters who aren't lending yet — the one entry that is a
// call to action rather than a destination, so it gets its own slot in
// the drawer instead of sitting in a list.
export const BECOME_HOST_CTA = {
  to: '/become-host',
  label: 'Become a Lender',
  icon: Store,
}
