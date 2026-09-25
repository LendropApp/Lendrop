// supabase.functions.invoke() returns `data: null` for any non-2xx
// response, so the Edge Function's own `{ error }` message ends up on the
// error's Response instead. This reads it back so the user sees the real
// reason ("2 tries left", "Incorrect password") rather than a generic one.
export async function functionErrorMessage(error, data, fallback) {
  if (data?.error) return data.error
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return body.error
  } catch {
    // Not JSON; fall through.
  }
  return fallback
}
