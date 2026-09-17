import { useState } from "react";
import { Lock, Package, CheckCircle2, ArrowRight } from "lucide-react";

export default function OwnerDeliveryReturn() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-[#0d0d0d]">

      {/* Navbar */}
      <nav className="w-full border-b border-black/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-5">

          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-10 font-medium text-[#0d0d0d]">

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


      {/* TODO EL CONTENIDO */}
      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-[#433075]">
            Owner Delivery
          </h1>

          <p className="mt-2 text-jet-black/60">
            Follow these steps to safely deposit your item in the locker.
          </p>
        </div>


        {/* Access Code */}
        <div className="mb-8 rounded-3xl border border-[#a58cf4]/30 bg-white p-8 shadow-lg">

          <div className="mb-4 flex items-center gap-3">
            <Lock className="text-[#433075]" size={28} />

            <span className="text-lg font-semibold text-[#433075]">
              Locker Access Code
            </span>
          </div>

          <div className="rounded-2xl bg-[#433075] p-6 text-center text-white">

            <p className="text-sm uppercase tracking-wider opacity-70">
              Access Code
            </p>

            <h2 className="mt-2 font-mono text-5xl font-bold tracking-widest">
              A7X9K2
            </h2>

          </div>
        </div>


        {/* Delivery Steps */}
        <div className="mb-8 rounded-3xl border border-[#a58cf4]/20 bg-white p-8 shadow-lg">

          <h2 className="mb-8 text-2xl font-bold text-[#433075]">
            Delivery Steps
          </h2>

          <div className="space-y-8">

            {/* Step 1 */}
            <div className="flex gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#a58cf4]">
                <Package className="text-white" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Go to the Locker
                </h3>

                <p className="text-jet-black/60">
                  Locate the locker selected by the renter.
                </p>
              </div>

            </div>


            {/* Step 2 */}
            <div className="flex gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#a58cf4]">
                <Lock className="text-white" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Enter the Code
                </h3>

                <p className="text-jet-black/60">
                  Use the access code shown above to unlock the compartment.
                </p>
              </div>

            </div>


            {/* Step 3 */}
            <div className="flex gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#a58cf4]">
                <CheckCircle2 className="text-white" />
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  Deposit the Item
                </h3>

                <p className="text-jet-black/60">
                  Place the item inside and close the locker securely.
                </p>
              </div>

            </div>

          </div>
        </div>


        {/* Confirmation */}
        <div className="rounded-3xl bg-gradient-to-r from-[#433075] to-[#a58cf4] p-8 text-white">

          <h2 className="mb-2 text-2xl font-bold">
            Confirm Delivery
          </h2>

          <p className="mb-6 opacity-90">
            Once the item has been deposited, confirm the delivery so the renter
            receives a notification.
          </p>

          <button className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#433075] transition hover:scale-105">
            Confirm Delivery
            <ArrowRight size={18} />
          </button>

        </div>

      </div>
    </div>
  );
}