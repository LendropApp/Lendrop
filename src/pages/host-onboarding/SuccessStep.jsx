import { Link } from "react-router-dom";
import { PartyPopper, ArrowRight } from "lucide-react";

/**
 * "success" step of HostOnboardingWizard. Shown once profiles.is_host is
 * already true, so linking straight to /publish works (HostRoute lets
 * the request through).
 */
export default function SuccessStep() {
  return (
    <div className="w-full max-w-md mx-auto px-6 text-center">
      <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised">
        <PartyPopper className="w-6 h-6 text-primary" strokeWidth={2} />
      </span>

      <h1 className="font-display text-2xl sm:text-3xl text-primary leading-snug mb-3">
        You're a Lendrop host now
      </h1>
      <p className="text-text-muted text-sm leading-relaxed mb-10">
        You can start listing items for other people to rent. Publish your first one to get it in front of renters.
      </p>

      <div className="flex flex-col gap-3">
        <Link
          to="/publish"
          className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-deep-purple to-lavender text-white font-medium text-base py-3.5 rounded-xl glow-sm transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
        >
          Publish your first item
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          to="/explore"
          className="w-full flex items-center justify-center gap-2 text-primary font-medium text-base py-3.5 rounded-xl hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
        >
          Go to Explore
        </Link>
      </div>
    </div>
  );
}
