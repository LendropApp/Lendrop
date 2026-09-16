/**
 * Two soft, drifting gradient blobs (deep-purple/lavender) used behind hero
 * and header sections for the "aurora glow" look. Purely decorative —
 * render it inside a `relative overflow-hidden` ancestor so the blobs stay
 * clipped to that section, and keep real content in a sibling with a
 * higher z-index.
 */
export default function AuroraBlobs({ className = "" }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      <div className="animate-aurora absolute -left-24 -top-32 h-96 w-96 rounded-full bg-lavender/25 blur-3xl" />
      <div
        className="animate-aurora absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-deep-purple/25 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
    </div>
  );
}
