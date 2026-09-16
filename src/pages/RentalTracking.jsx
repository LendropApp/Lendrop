export default function RentalTracking() {
  const rental = {
    status: "In Use",
    lockerCode: "LKR-4582",
    timeRemaining: "2 days 5 hours",
  };

  const steps = ["Reserved", "Delivered", "In Use", "Returned"];
  const currentStep = 2;

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Navbar */}
      <nav className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

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

            <a
              href="/"
              className="transition hover:text-[#433075]"
            >
              Home
            </a>

            <a
              href="/explore"
              className="transition hover:text-[#433075]"
            >
              Explore
            </a>

            <a
              href="/help"
              className="transition hover:text-[#433075]"
            >
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

      {/* Main */}
      <main className="mx-auto max-w-4xl p-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-[#433075]">
            Active Rental Tracking
          </h1>

          <p className="text-gray-600">
            Track the current status of your rental.
          </p>
        </div>

        {/* Rental Status */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-8 text-xl font-semibold text-[#433075]">
            Rental Status
          </h2>

          {/* Timeline */}
          <div className="relative flex items-center justify-between">

            {/* Progress Line */}
            <div className="absolute left-0 top-5 h-1 w-full bg-gray-200">
              <div
                className="h-full bg-[#433075]"
                style={{
                  width: `${(currentStep / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>

            {/* Steps */}
            {steps.map((step, index) => (
              <div
                key={step}
                className="relative z-10 flex flex-col items-center"
              >

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-4 font-bold ${
                    index < currentStep
                      ? "border-[#433075] bg-[#433075] text-white"
                      : index === currentStep
                      ? "border-[#433075] bg-[#a58cf4] text-white"
                      : "border-gray-300 bg-white text-gray-400"
                  }`}
                >
                  {index + 1}
                </div>

                <span
                  className={`mt-3 text-sm ${
                    index === currentStep
                      ? "font-semibold text-[#433075]"
                      : "text-gray-500"
                  }`}
                >
                  {step}
                </span>

              </div>
            ))}

          </div>

          {/* Current Stage */}
          <div className="mt-8 rounded-xl border border-[#a58cf4] bg-[#fafafa] p-4">

            <p className="text-sm text-gray-500">
              Current Stage
            </p>

            <p className="text-lg font-semibold text-[#433075]">
              {rental.status}
            </p>

          </div>

        </section>

        {/* Rental Details */}
        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-4 text-xl font-semibold text-[#433075]">
            Rental Details
          </h2>

          <div className="space-y-4">

            {/* Status */}
            <div>
              <p className="text-gray-500">
                Current Status
              </p>

              <p className="font-semibold text-[#433075]">
                {rental.status}
              </p>
            </div>

            {/* Locker */}
            <div>
              <p className="text-gray-500">
                Locker Code
              </p>

              <p className="font-mono text-lg">
                {rental.lockerCode}
              </p>
            </div>

            {/* Time */}
            <div>
              <p className="text-gray-500">
                Time Remaining
              </p>

              <p className="font-semibold">
                {rental.timeRemaining}
              </p>
            </div>

          </div>

        </section>

        {/* Support */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="mb-2 text-xl font-semibold text-[#433075]">
            Need Help?
          </h2>

          <p className="mb-4 text-gray-600">
            Contact support if you have any issues with your rental.
          </p>

          <button
            className="rounded-xl bg-[#433075] px-5 py-3 text-white transition hover:bg-[#37285f]"
          >
            Contact Support
          </button>

        </section>

      </main>
    </div>
  );
}