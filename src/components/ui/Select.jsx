import { ChevronDown } from 'lucide-react'
import Field, { CONTROL, CONTROL_ERROR, CONTROL_OK, useFieldIds } from './Field'

/**
 * Select — DESIGN.md sec. 7.2
 *
 * Props:
 *   options   [{ value, label, disabled? }]
 *   placeholder   renders a disabled empty-value option first
 *   label, help, error, plus anything <select> takes.
 *
 * A native <select> on purpose: the OS picker on mobile beats any custom
 * listbox we would have to make keyboard- and screen-reader-correct ourselves.
 */
export default function Select({
  label,
  help,
  error,
  options = [],
  placeholder,
  id: idProp,
  className = '',
  required,
  ...rest
}) {
  const { id, helpId, errorId, describedBy } = useFieldIds(idProp, { help, error })

  return (
    <Field
      id={id}
      label={label}
      help={help}
      error={error}
      helpId={helpId}
      errorId={errorId}
      required={required}
    >
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} ${error ? CONTROL_ERROR : CONTROL_OK} appearance-none pr-10 ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={2}
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-ink"
        />
      </div>
    </Field>
  )
}
