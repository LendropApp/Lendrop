import { ArrowRight, Clock, ShieldCheck, Wallet } from "lucide-react";
 
/**
 * "intro" step of HostOnboardingWizard.
 * Doesn't save anything to Supabase — just advances to the next step.
 *
 * Props:
 * - onNext: () => void
 */
export default function IntroStep({ onNext }) {
  const highlights = [
    { icon: Clock, text: "Takes less than 5 minutes to complete." },
    { icon: Wallet, text: "You'll be able to list your items and start getting bookings." },
    { icon: ShieldCheck, text: "Your info is only used to verify your host account." },
  ];
 
  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-primary leading-snug mb-3">
        Become a LENDROP host
      </h1>
 
      <p className="text-text-muted text-base leading-relaxed mb-8">
        Before you can list your items, we need a few details about you and
        your location. We'll ask for them in short steps to keep it quick.
      </p>
 
      <ul className="space-y-4 mb-10">
        {highlights.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
            </span>
            <span className="text-sm text-text-muted leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
 
      <button
        type="button"
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-deep-purple to-lavender text-white font-medium text-base py-3.5 rounded-xl glow-sm transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
      >
        Start registration
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}