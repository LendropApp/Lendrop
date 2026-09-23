import Field, { CONTROL, CONTROL_ERROR, CONTROL_OK, useFieldIds } from './Field'

/**
 * Textarea — DESIGN.md sec. 7.2. Same skin as Input; only the height differs.
 *
 * Props: label, help, error, rows (default 4), plus anything <textarea> takes.
 */
export default function Textarea({
  label,
  help,
  error,
  rows = 4,
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
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL} ${error ? CONTROL_ERROR : CONTROL_OK} resize-y py-2.5 ${className}`}
        {...rest}
      />
    </Field>
  )
}
