import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * "terms" step of HostOnboardingWizard — the last data-collecting step.
 * HostOnboardingWizard treats this step's onNext as the finish trigger:
 * it persists terms_accepted_at, flips profiles.is_host, and advances to
 * 'success'.
 *
 * Props:
 * - onNext: (patch) => void   -> HostOnboardingWizard persists + finishes
 * - onBack: () => void
 * - submitting: bool          -> true while finish() is in flight
 */
export default function TermsStep({ onNext, onBack, submitting }) {
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!agreed) {
      setError("You need to accept the host terms to continue.");
      return;
    }
    onNext({ terms_accepted_at: new Date().toISOString() });
  };

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-2">
        Host terms
      </h1>
      <p className="text-jet-black/60 text-sm leading-relaxed mb-6">
        A quick summary before you start listing items on Lendrop.
      </p>

      <ul className="space-y-3 mb-6 rounded-xl border border-lavender/40 bg-white p-4">
        {[
          "You confirm you're the legal owner of items you list, or have permission to rent them out.",
          "Items are handed off and returned only through Lendrop lockers, never in person.",
          "You must accurately describe each item's condition and take photo evidence at drop off.",
          "Lendrop may hold your security deposit funds during a dispute until it's resolved.",
        ].map((text, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-jet-black/70 leading-relaxed">
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-deep-purple" strokeWidth={2} />
            {text}
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              setAgreed(e.target.checked);
              if (error) setError("");
            }}
            className="mt-0.5 h-4 w-4 rounded border-lavender/60 text-deep-purple focus:ring-deep-purple"
          />
          <span className="text-sm text-jet-black/70 leading-relaxed">
            I have read and accept Lendrop's Host Terms.
          </span>
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-deep-purple font-medium text-base hover:bg-lavender/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 border border-white/40 bg-deep-purple/70 backdrop-blur-md text-white font-medium text-base py-3.5 rounded-xl shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2 disabled:opacity-50 disabled:hover:shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)]"
          >
            {submitting ? "Finishing…" : "Become a host"}
          </button>
        </div>
      </form>
    </div>
  );
}
