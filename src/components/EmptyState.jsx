// src/components/EmptyState.jsx
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16">
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lavender/10">
          <Icon className="h-8 w-8 text-lavender" />
        </div>
      )}

      <h3 className="font-display text-lg font-semibold text-jet-black mb-2">
        {title}
      </h3>

      <p className="font-body text-sm text-jet-black/60 max-w-xs mb-6">
        {description}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="font-body rounded-lg bg-deep-purple px-4 py-2 text-sm font-medium text-soft-white hover:bg-lavender transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}