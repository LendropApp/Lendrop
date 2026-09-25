import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../components/Logo";

const categories = [
  {
    id: "clothing",
    name: "Clothing",
    description: "Outfits, costumes and special occasion wear",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <path d="M8 3l4 2 4-2 5 4-3 4-2-1v11H8V10l-2 1-3-4 5-4z" />
      </svg>
    ),
  },
  {
    id: "tools",
    name: "Tools",
    description: "Everything you need for your next project",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: "cameras",
    name: "Cameras",
    description: "Capture your moments with the right gear",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <path d="M4 7h4l1.5-2h5L16 7h4a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
    ),
  },
  {
    id: "drones",
    name: "Drones",
    description: "Take your perspective to the next level",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <circle cx="12" cy="12" r="2.5" />
        <path d="M9.5 9.5L6 6M14.5 9.5L18 6M9.5 14.5L6 18M14.5 14.5L18 18" />
        <circle cx="4.5" cy="4.5" r="2" />
        <circle cx="19.5" cy="4.5" r="2" />
        <circle cx="4.5" cy="19.5" r="2" />
        <circle cx="19.5" cy="19.5" r="2" />
      </svg>
    ),
  },
  {
    id: "instruments",
    name: "Instruments",
    description: "Make music without owning the equipment",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: "sports-gear",
    name: "Sports gear",
    description: "Equipment for training, playing and exploring",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 9h17M3.5 15h17M12 3c2.2 2.4 3.3 5.4 3.3 9S14.2 18.6 12 21M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9" />
      </svg>
    ),
  },
];

export default function Categories() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);

  const toggleCategory = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleContinue = () => {
    if (selected.length === 0) return;
    navigate("/terms");
  };

  return (
    <div className="min-h-screen bg-[#faf9fc] text-text font-[Manrope] overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-[-180px] right-[-140px] w-[420px] h-[420px] rounded-full bg-deep-purple/[0.06] blur-3xl" />
      <div className="absolute bottom-[-180px] left-[-140px] w-[400px] h-[400px] rounded-full bg-deep-purple/[0.04] blur-3xl" />

      {/* Navbar */}
      <nav className="w-full border-b border-[#0d0d0d]/10 bg-surface">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center">
            <Logo className="h-10" />
          </div>

          <div className="flex items-center gap-8 font-medium text-[#0d0d0d]">
            <a href="/" className="transition hover:text-primary">
              Home
            </a>
            <a href="/explore" className="transition hover:text-primary">
              Explore
            </a>
            <a href="/help" className="transition hover:text-primary">
              Help
            </a>
            <a
              href="/profile"
              className="flex items-center gap-2 transition hover:text-primary"
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
      <main className="relative z-10 max-w-6xl mx-auto px-8 lg:px-12 pt-10 pb-12">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-deep-purple/[0.07] text-primary text-xs font-bold tracking-wider mb-5">
            EXPLORE LENDROP
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-5">
            What are you interested
            <br />
            <span className="text-primary">in renting?</span>
          </h1>

          <p className="text-text-muted text-base lg:text-lg leading-relaxed">
            From a camera for the weekend to the perfect costume for tonight.
          </p>

          <p className="text-sm text-text-muted mt-3">
            Choose one or more categories to personalize your experience.
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((category, index) => {
            const isSelected = selected.includes(category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={`group relative text-left rounded-3xl p-6 min-h-[190px] transition-all duration-300 ${
                  isSelected
                    ? "bg-primary border-4 border-primary shadow-2xl shadow-deep-purple/40 -translate-y-1.5"
                    : "bg-surface border-2 border-border hover:border-primary hover:-translate-y-1.5 shadow-md shadow-jet-black/10 hover:shadow-xl hover:shadow-deep-purple/20"
                }`}
              >
                {/* Number */}
                <span
                  className={`absolute top-5 right-5 text-xs font-semibold ${
                    isSelected ? "text-white/50" : "text-text-muted"
                  }`}
                >
                  0{index + 1}
                </span>

                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-7 transition-all ${
                    isSelected
                      ? "bg-white/15 text-white"
                      : "bg-deep-purple/[0.07] text-primary group-hover:bg-primary group-hover:text-white"
                  }`}
                >
                  {category.icon}
                </div>

                {/* Text */}
                <h2
                  className={`text-lg font-bold mb-2 ${
                    isSelected ? "text-white" : "text-text"
                  }`}
                >
                  {category.name}
                </h2>

                <p
                  className={`text-sm leading-relaxed pr-5 ${
                    isSelected ? "text-white/65" : "text-text-muted"
                  }`}
                >
                  {category.description}
                </p>

                {/* Selection indicator */}
                <div
                  className={`absolute bottom-6 right-6 w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-surface border-white"
                      : "border-border group-hover:border-primary"
                  }`}
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#433075"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    >
                      <path d="M5 12l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="text-sm text-text-muted">
            {selected.length === 0 ? (
              "Select at least one category"
            ) : (
              <>
                <span className="font-semibold text-primary">
                  {selected.length}
                </span>{" "}
                {selected.length === 1 ? "category" : "categories"} selected
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3.5 rounded-xl text-sm font-semibold text-text-muted hover:text-text transition"
            >
              Back
            </button>

            <button
              type="button"
              disabled={selected.length === 0}
              onClick={handleContinue}
              className={`group px-7 py-3.5 rounded-xl text-sm font-bold flex items-center gap-3 transition-all ${
                selected.length > 0
                  ? "bg-primary text-white hover:shadow-xl hover:shadow-deep-purple/20 hover:-translate-y-0.5"
                  : "bg-jet-black/10 text-text-muted cursor-not-allowed"
              }`}
            >
              Continue
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}