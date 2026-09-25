import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCategoryIcon } from "../lib/categoryIcons";
import PageHeader from "../components/PageHeader";

// Pick the categories you're interested in, then browse them in Explore.
// Reads the live `categories` table (the same list Explore and Publish
// use) rather than a hardcoded copy, so the three can't drift apart.
export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (cancelled) return;
        setCategories(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleCategory = (slug) => {
    setSelected((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]
    );
  };

  // Explore filters by one category at a time, so it opens on the first
  // one picked.
  const handleContinue = () => {
    if (selected.length === 0) return;
    navigate(`/explore?category=${encodeURIComponent(selected[0])}`);
  };

  return (
    <div className="min-h-dvh bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/explore" backLabel="Explore" maxWidth="max-w-5xl" />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h1 className="max-w-[18ch] text-4xl font-extrabold sm:text-5xl">What are you interested in renting?</h1>
        <p className="mt-4 max-w-[60ch] text-text-muted">
          From a camera for the weekend to the perfect costume for tonight. Pick one or more.
        </p>

        {loading ? (
          <p className="mt-10 text-sm text-text-muted">Loading categories…</p>
        ) : (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Categories">
            {categories.map((category) => {
              const isSelected = selected.includes(category.slug);
              const Icon = getCategoryIcon(category.slug);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => toggleCategory(category.slug)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-4 rounded-2xl border bg-surface p-5 text-left ${
                    isSelected ? "border-lavender ring-1 ring-lavender" : "border-border hover:border-primary"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                      isSelected ? "stamp" : "bg-surface-raised text-primary"
                    }`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 text-lg font-bold">{category.name}</span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                      isSelected ? "stamp border-transparent" : "border-border"
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-5 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted" aria-live="polite">
            {selected.length === 0 ? (
              "Select at least one category."
            ) : (
              <>
                <span className="num text-lg text-text">{selected.length}</span>{" "}
                {selected.length === 1 ? "category" : "categories"} selected
              </>
            )}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cta-outline rounded-xl px-7 py-2.5 text-sm font-semibold"
            >
              Back
            </button>
            <button
              type="button"
              disabled={selected.length === 0}
              onClick={handleContinue}
              className="cta-brand rounded-xl px-7 py-3 text-sm font-bold text-soft-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Browse these
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
