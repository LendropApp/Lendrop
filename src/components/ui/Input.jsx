import Field, { CONTROL, CONTROL_ERROR, CONTROL_OK, useFieldIds } from './Field'

/**
 * Input — DESIGN.md sec. 7.2
 *
 * Props:
 *   label, help, error   strings; `error` replaces `help` and flips the border
 *   suffix               unit rendered INSIDE the field ('cm', 'kg', '$')
 *   numeric              boolean — JetBrains Mono + inputmode="decimal", for
 *                        money and measurements (sec. 7.2)
 *   ...rest              forwarded to <input> (type, value, onChange, required…)
 */
export default function Input({
  label,
  help,
  error,
  suffix,
  numeric = false,
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
        <input
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          inputMode={numeric ? 'decimal' : undefined}
          className={`${CONTROL} ${error ? CONTROL_ERROR : CONTROL_OK} ${
            numeric ? 'font-mono' : ''
          } ${suffix ? 'pr-12' : ''} ${className}`}
          {...rest}
        />
        {suffix && (
          <span
            // Decorative: the label already says what the number means, so a
            // screen reader hearing "cm" again adds nothing.
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-small text-steel-600"
          >
            {suffix}
          </span>
        )}
      </div>
    </Field>
  )
}
