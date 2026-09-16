import { CheckCircle, Clock, DollarSign, Package, Star, TrendingUp } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const STATS = [
  { icon: DollarSign, label: 'Total earnings', value: '$105.50', hint: '+12% from last month' },
  { icon: Clock, label: 'Pending release', value: '$32.50', hint: 'Waiting for deposit release' },
  { icon: Package, label: 'Rentals completed', value: '12', hint: 'Successfully completed' },
  { icon: Star, label: 'Average rating', value: '4.8', hint: 'From 9 reviews' },
]

const PAYMENT_HISTORY = [
  { item: 'LEGO Millennium Falcon', amount: '$45.00', status: 'Completed' },
  { item: 'LEGO Technic Ferrari', amount: '$32.50', status: 'Pending' },
  { item: 'LEGO Star Destroyer', amount: '$28.00', status: 'Completed' },
]

export default function EarningsDashboard() {
  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" maxWidth="max-w-5xl" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-5xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Lender statistics</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Track your rental earnings, ratings, and pending payouts.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ icon: Icon, label, value, hint }) => (
              <div key={label} className="rounded-2xl border border-lavender/15 bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-jet-black/60">{label}</p>
                  <Icon className="h-4.5 w-4.5 text-lavender" />
                </div>
                <p className="mt-3 font-mono text-2xl font-bold text-deep-purple">{value}</p>
                <p className="mt-1 text-xs text-jet-black/45">{hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-lavender/15 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-deep-purple" />
              <h2 className="font-display text-lg font-semibold text-jet-black">Earnings overview</h2>
            </div>
            <div className="flex h-48 items-center justify-center rounded-2xl bg-gradient-to-r from-deep-purple to-lavender">
              <div className="text-center text-white">
                <p className="font-display text-2xl font-bold">$105.50</p>
                <p className="mt-1 text-sm text-white/80">Total earnings this month</p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-lavender/15 bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-jet-black">Payment history</h2>
            <div className="space-y-3">
              {PAYMENT_HISTORY.map((row) => (
                <div
                  key={row.item}
                  className="flex flex-col gap-2 rounded-xl border border-jet-black/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-jet-black">{row.item}</p>
                    <p className="text-xs text-jet-black/45">Rental payment received</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-jet-black">{row.amount}</span>
                    <span className="flex items-center gap-1 rounded-full bg-lavender/15 px-3 py-1 text-xs font-semibold text-deep-purple">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-deep-purple p-6 text-white">
            <h2 className="font-display text-lg font-semibold">Next payout</h2>
            <p className="mt-2 text-sm text-white/75">
              Your next payment release is scheduled after the renter confirms the return.
            </p>
            <p className="mt-3 font-mono text-2xl font-bold">$32.50</p>
          </div>
        </div>
      </div>
    </div>
  )
}
