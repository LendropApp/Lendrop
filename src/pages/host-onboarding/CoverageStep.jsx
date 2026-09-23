import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, MapPin, Check } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

/**
 * "coverage" step of HostOnboardingWizard.
 *
 * Lets the host pick which existing lockers (public.lockers) they can
 * reach to drop off items. Real data, scoped to the city they entered in
 * the contact step — falls back to every active locker if none match
 * (e.g. their city has no locker yet).
 *
 * Props:
 * - record: current host_onboarding row (city, preferred_locker_ids)
 * - onNext: (patch) => void   -> HostOnboardingWizard calls goNext(patch)
 * - onBack: () => void
 */
export default function CoverageStep({ record, onNext, onBack }) {
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set(record?.preferred_locker_ids || []));
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let query = supabase
        .from("lockers")
        .select("id, name, address, city")
        .eq("is_active", true)
        .order("name");

      if (record?.city) query = query.eq("city", record.city);

      let { data, error: fetchError } = await query;

      // No lockers in the host's own city yet — widen the search instead
      // of leaving them with nothing to pick.
      if (!fetchError && record?.city && (data ?? []).length === 0) {
        ({ data, error: fetchError } = await supabase
          .from("lockers")
          .select("id, name, address, city")
          .eq("is_active", true)
          .order("name"));
      }

      if (cancelled) return;
      if (fetchError) {
        setLoadError("Could not load lockers. Refresh to try again.");
      } else {
        setLockers(data ?? []);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [record?.city]);

  const toggleLocker = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (lockers.length > 0 && selectedIds.size === 0) {
      setError("Pick at least one locker you can reach.");
      return;
    }
    onNext({ preferred_locker_ids: Array.from(selectedIds) });
  };

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-primary leading-snug mb-2">
        Where can you drop off items?
      </h1>
      <p className="text-text-muted text-sm leading-relaxed mb-8">
        Pick the lockers you can get to. Renters will pick up and return your items there.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-text-muted">Loading lockers…</p>
        ) : lockers.length === 0 ? (
          <p className="text-sm text-text-muted">
            No lockers are set up yet. You can still continue and pick one later.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {lockers.map((locker) => {
              const active = selectedIds.has(locker.id);
              return (
                <li key={locker.id}>
                  <button
                    type="button"
                    onClick={() => toggleLocker(locker.id)}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-primary bg-surface-raised"
                        : "border-border bg-surface hover:border-primary"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        active ? "bg-primary text-white" : "bg-surface-raised text-primary"
                      }`}
                    >
                      {active ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text truncate">
                        {locker.name}
                      </span>
                      <span className="block text-xs text-text-muted truncate">
                        {locker.address} · {locker.city}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-primary font-medium text-base hover:bg-surface-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-deep-purple to-lavender text-white font-medium text-base py-3.5 rounded-xl glow-sm transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
