import { useState } from "react";
import { MapPin, ChevronRight, Check } from "lucide-react";

export default function LockerCoverage() {
  const [selectedLockers, setSelectedLockers] = useState([]);

  const lockers = [
    {
      id: 1,
      name: "San Salvador Centro",
      address: "Avenida España, San Salvador",
      distance: "1.2 km",
    },
    {
      id: 2,
      name: "Santa Tecla",
      address: "Centro Comercial Las Palmas",
      distance: "3.5 km",
    },
    {
      id: 3,
      name: "Soyapango",
      address: "Plaza Mundo Soyapango",
      distance: "5.8 km",
    },
    {
      id: 4,
      name: "Apopa",
      address: "Centro Urbano Apopa",
      distance: "7.1 km",
    },
  ];

  const toggleLocker = (id) => {
    setSelectedLockers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      className="min-h-screen w-full bg-[#fafafa] text-[#0d0d0d]"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      {/* Navbar */}
      <nav className="w-full border-b border-[#0d0d0d]/10 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-8 font-medium text-[#0d0d0d]">
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

      {/* Main Content */}
      <main className="min-h-[calc(100vh-81px)] w-full px-6 py-12 lg:px-10">
        <div className="mx-auto flex w-full max-w-7xl flex-col">
          {/* Header */}
          <div className="mb-10">
            <span
              className="text-xs font-bold uppercase tracking-widest text-[#a58cf4]"
              style={{ fontFamily: "JetBrains Mono, monospace" }}
            >
              Step 1 of 5
            </span>

            <h1
              className="mt-2 text-4xl font-bold tracking-tight text-[#433075] sm:text-5xl"
              style={{ fontFamily: "Space Grotesk, sans-serif" }}
            >
              Locker Coverage
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#0d0d0d]/80">
              Select the locker locations where renters can pick up and return
              your items.
            </p>
          </div>

          {/* Locker Grid */}
          <div className="grid w-full gap-6 md:grid-cols-2">
            {lockers.map((locker) => {
              const isSelected = selectedLockers.includes(locker.id);

              return (
                <button
                  key={locker.id}
                  type="button"
                  onClick={() => toggleLocker(locker.id)}
                  className={`relative w-full rounded-2xl border p-6 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#a58cf4] bg-white shadow-lg shadow-[#a58cf4]/10"
                      : "border-[#0d0d0d]/10 bg-white hover:border-[#a58cf4]/50 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-[#a58cf4] text-white"
                            : "bg-[#a58cf4]/10 text-[#433075]"
                        }`}
                      >
                        <MapPin size={22} strokeWidth={2} />
                      </div>

                      <div>
                        <h3
                          className="text-xl font-bold text-[#0d0d0d]"
                          style={{ fontFamily: "Space Grotesk, sans-serif" }}
                        >
                          {locker.name}
                        </h3>

                        {/* Etiqueta funcional en JetBrains Mono */}
                        <p
                          className="mt-1 text-xs font-semibold text-[#a58cf4]"
                          style={{ fontFamily: "JetBrains Mono, monospace" }}
                        >
                          {locker.distance}
                        </p>
                      </div>
                    </div>

                    {/* Indicador de estado activo con Lavender (#a58cf4) */}
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? "border-[#a58cf4] bg-[#a58cf4] text-white"
                          : "border-[#0d0d0d]/20"
                      }`}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>

                  <p className="mt-6 pl-[55px] text-sm text-[#0d0d0d]/70">
                    {locker.address}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Selected Summary */}
          <div
            className={`mt-8 rounded-2xl border p-5 transition-all duration-200 ${
              selectedLockers.length > 0
                ? "border-[#a58cf4]/30 bg-white"
                : "border-transparent bg-transparent"
            }`}
          >
            {selectedLockers.length > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider text-[#a58cf4]"
                    style={{ fontFamily: "JetBrains Mono, monospace" }}
                  >
                    Selected coverage areas ({selectedLockers.length})
                  </p>

                  <p
                    className="mt-1 text-lg font-bold text-[#433075]"
                    style={{ fontFamily: "Space Grotesk, sans-serif" }}
                  >
                    {lockers
                      .filter((locker) => selectedLockers.includes(locker.id))
                      .map((l) => l.name)
                      .join(", ")}
                  </p>
                </div>

                <MapPin size={24} className="text-[#a58cf4]" />
              </div>
            ) : (
              <p className="text-sm text-[#0d0d0d]/40">
                Select at least one locker location to continue.
              </p>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="mt-10 flex items-center justify-between border-t border-[#0d0d0d]/10 pt-8">
            <button
              type="button"
              className="rounded-xl border border-[#a58cf4] px-7 py-3 text-sm font-semibold text-[#433075] transition hover:bg-[#a58cf4]/10"
            >
              Back
            </button>

            {/* Acciones principales en Deep Purple (#433075) */}
            <button
              type="button"
              disabled={selectedLockers.length === 0}
              className={`flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold text-white transition ${
                selectedLockers.length > 0
                  ? "bg-[#433075] hover:bg-[#433075]/90"
                  : "cursor-not-allowed bg-[#0d0d0d]/20"
              }`}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}  