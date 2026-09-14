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
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-3">
        Become a LENDROP host
      </h1>
 
      <p className="text-gray-600 text-base leading-relaxed mb-8">
        Before you can list your items, we need a few details about you and
        your location. We'll ask for them in short steps to keep it quick.
      </p>
 
      <ul className="space-y-4 mb-10">
        {highlights.map(({ icon: Icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-lavender/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-deep-purple" strokeWidth={2} />
            </span>
            <span className="text-sm text-gray-700 leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
 
      <button
        type="button"
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-deep-purple hover:opacity-90 active:opacity-80 text-white font-medium text-base py-3.5 rounded-xl transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
      >
        Start registration
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}