import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { getCategoryIcon } from "../../lib/categoryIcons";

/**
 * "categories" step of HostOnboardingWizard.
 *
 * Reads from the `categories` table (never hardcoded — see CLAUDE.md's
 * note on the old Home.jsx/Explore drift) so this list can't fall out of
 * sync with what PublishItem lets you actually list under.
 *
 * Props:
 * - record: current host_onboarding row (categories_interest: text[] of slugs)
 * - onNext: (patch) => void   -> HostOnboardingWizard calls goNext(patch)
 * - onBack: () => void
 */
export default function CategoriesStep({ record, onNext, onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState(new Set(record?.categories_interest || []));
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;
        if (fetchError) {
          setLoadError("Could not load categories. Refresh to try again.");
        } else {
          setCategories(data ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCategory = (slug) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    if (error) setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSlugs.size === 0) {
      setError("Pick at least one category.");
      return;
    }
    onNext({ categories_interest: Array.from(selectedSlugs) });
  };

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-2">
        What will you list?
      </h1>
      <p className="text-jet-black/60 text-sm leading-relaxed mb-8">
        Pick every category you plan to rent out. You can list items in more categories later.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {loadError ? (
          <p className="text-sm text-red-500">{loadError}</p>
        ) : loading ? (
          <p className="text-sm text-jet-black/40">Loading categories…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = selectedSlugs.has(cat.slug);
              const Icon = getCategoryIcon(cat.slug);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.slug)}
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                    active
                      ? "border-transparent bg-linear-to-r from-deep-purple to-lavender text-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)]"
                      : "border-lavender/40 text-jet-black/70 hover:border-lavender hover:text-deep-purple"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-deep-purple font-medium text-base hover:bg-lavender/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-deep-purple to-lavender text-white font-medium text-base py-3.5 rounded-xl shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
