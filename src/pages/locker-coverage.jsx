import { useEffect, useState } from "react";
import { MapPin, ChevronRight, Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import PageHeader from "../components/PageHeader";

export default function LockerCoverage() {
  const [selectedLockers, setSelectedLockers] = useState([]);
  const [lockers, setLockers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("lockers")
      .select("id, name, address, city")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        if (!cancelled) setLockers(data ?? []);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLocker = (id) => {
    setSelectedLockers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selected = lockers.filter((locker) => selectedLockers.includes(locker.id));

  return (
    <div className="min-h-dvh bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back" maxWidth="max-w-5xl" />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Locker coverage</h1>
        <p className="mt-4 max-w-[60ch] text-text-muted">
          Select the locker locations where renters can pick up and return your items.
        </p>

        <div className="mt-10">
          {loading ? (
            <p className="text-sm text-text-muted">Loading lockers…</p>
          ) : lockers.length === 0 ? (
            <p className="text-sm text-text-muted">No lockers are set up yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2" role="group" aria-label="Locker locations">
              {lockers.map((locker) => {
                const isSelected = selectedLockers.includes(locker.id);
                return (
                  <button
                    key={locker.id}
                    type="button"
                    onClick={() => toggleLocker(locker.id)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-4 rounded-2xl border bg-surface p-5 text-left ${
                      isSelected ? "border-lavender ring-1 ring-lavender" : "border-border hover:border-primary"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isSelected ? "stamp" : "bg-surface-raised text-primary"
                      }`}
                    >
                      <MapPin className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-bold">{locker.name}</span>
                      <span className="mt-0.5 block text-sm font-semibold text-primary">{locker.city}</span>
                      <span className="mt-3 block text-sm text-text-muted">{locker.address}</span>
                    </span>
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
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5" aria-live="polite">
          {selected.length > 0 ? (
            <p className="text-sm text-text-muted">
              <span className="num text-lg text-text">{selected.length}</span>{" "}
              {selected.length === 1 ? "location" : "locations"} selected:{" "}
              <span className="font-semibold text-text">{selected.map((l) => l.name).join(", ")}</span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">Select at least one locker location to continue.</p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border pt-8">
          <button type="button" className="cta-outline rounded-xl px-7 py-2.5 text-sm font-semibold">
            Back
          </button>
          <button
            type="button"
            disabled={selectedLockers.length === 0}
            className="cta-brand flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-bold text-soft-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </main>
    </div>
  );
}  