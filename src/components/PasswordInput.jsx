import { useState } from 'react'


export default function PasswordInput({
  id,
  name,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete,
  required = true,
  minLength,
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 pr-16 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute inset-y-0 right-3 text-xs font-medium text-jet-black/40 hover:text-deep-purple"
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}
