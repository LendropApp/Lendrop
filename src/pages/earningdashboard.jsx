import {
  DollarSign,
  Clock,
  Package,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

function Navbar() {
  return (
    <nav className="w-full border-b border-[#a58cf4]/20 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-5">
        {/* Logo */}
        <div className="flex items-center">
          <img src="/logo-lendrop.png" alt="Lendrop" className="h-10 w-auto" />
        </div>

        {/* Navigation */}
        <div
          className="flex items-center gap-8 font-medium text-[#0d0d0d]"
          style={{ fontFamily: "Manrope, sans-serif" }}
        >
          <a href="/" className="transition hover:text-[#433075]">
            Home
          </a>

          <a href="/explore" className="transition hover:text-[#433075]">
            Explore
          </a>

          <a href="/help" className="transition hover:text-[#433075]">
            Help
          </a>

          <a
            href="/profile"
            className="flex items-center gap-2 transition hover:text-[#433075]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"
              />
            </svg>
            <span>Profile</span>
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function EarningsDashboard() {
  const earnings = [
    {
      item: "LEGO Millennium Falcon",
      amount: "$45.00",
      status: "Completed",
    },
    {
      item: "LEGO Technic Ferrari",
      amount: "$32.50",
      status: "Pending",
    },
    {
      item: "LEGO Star Destroyer",
      amount: "$28.00",
      status: "Completed",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Navbar />
      <div className="mx-auto max-w-7xl p-6">
        {/* HEADER */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold text-[#433075]"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Earnings Dashboard
          </h1>
          <p
            className="mt-2 text-[#0d0d0d]/70"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Track your rental earnings, payment history and pending payouts.
          </p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-3xl border border-[#a58cf4]/20 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3
                className="text-sm text-[#433075]"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Total Earnings
              </h3>
              <DollarSign className="text-[#a58cf4]" size={22} />
            </div>
            <p
              className="mt-4 text-3xl font-bold text-[#433075]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              $105.50
            </p>
            <p
              className="mt-2 text-sm text-[#a58cf4]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              +12% from last month
            </p>
          </div>

          <div className="rounded-3xl border border-[#a58cf4]/20 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3
                className="text-sm text-[#433075]"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Pending Release
              </h3>
              <Clock className="text-[#a58cf4]" size={22} />
            </div>
            <p
              className="mt-4 text-3xl font-bold text-[#433075]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              $32.50
            </p>
            <p className="mt-2 text-sm text-[#0d0d0d]/60">
              Waiting for deposit release
            </p>
          </div>

          <div className="rounded-3xl border border-[#a58cf4]/20 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3
                className="text-sm text-[#433075]"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                Rentals Completed
              </h3>
              <Package className="text-[#a58cf4]" size={22} />
            </div>
            <p
              className="mt-4 text-3xl font-bold text-[#433075]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              12
            </p>
            <p className="mt-2 text-sm text-[#0d0d0d]/60">
              Successfully completed
            </p>
          </div>
        </div>

        {/* EARNINGS OVERVIEW */}
        <div className="mb-8 rounded-3xl border border-[#a58cf4]/20 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <TrendingUp className="text-[#433075]" />
            <h2
              className="text-xl font-semibold text-[#433075]"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Earnings Overview
            </h2>
          </div>
          <div className="flex h-60 items-center justify-center rounded-3xl bg-gradient-to-r from-[#433075] to-[#a58cf4]">
            <div className="text-center">
              <h3
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                $105.50
              </h3>
              <p
                className="mt-2 text-white/80"
                style={{ fontFamily: "Manrope, sans-serif" }}
              >
                Total earnings this month
              </p>
            </div>
          </div>
        </div>

        {/* PAYMENT HISTORY */}
        <div className="rounded-3xl border border-[#a58cf4]/20 bg-white p-6 shadow-sm">
          <h2
            className="mb-6 text-xl font-semibold text-[#433075]"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Payment History
          </h2>
          <div className="space-y-4">
            {earnings.map((earning, index) => (
              <div
                key={index}
                className="flex flex-col gap-4 rounded-2xl border border-[#a58cf4]/20 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h3
                    className="font-semibold text-[#433075]"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    {earning.item}
                  </h3>
                  <p
                    className="text-sm text-[#0d0d0d]/60"
                    style={{ fontFamily: "Manrope, sans-serif" }}
                  >
                    Rental payment received
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className="font-bold text-[#433075]"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {earning.amount}
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-[#a58cf4]/15 px-3 py-1 text-sm text-[#433075]">
                    <CheckCircle size={14} />
                    {earning.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* NEXT PAYOUT */}
        <div className="mt-8 rounded-3xl bg-[#433075] p-6 text-white">
          <h2
            className="text-xl font-semibold"
            style={{ fontFamily: "Space Grotesk, sans-serif" }}
          >
            Next Payout
          </h2>
          <p
            className="mt-3 text-white/80"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Your next payment release is scheduled after the renter confirms
            the return.
          </p>
          <div
            className="mt-4 text-3xl font-bold"
            style={{ fontFamily: "JetBrains Mono, monospace" }}
          >
            $32.50
          </div>
        </div>
      </div>
    </div>
  );
}