// The Lendrop ID is stored as 6 bare characters (see 0030_lendrop_id.sql)
// and always shown and typed as ABC-123. These keep that consistent.

// Characters the code can contain: 2-9 and A-Z without 0, 1, I, L, O.
const INVALID = /[^2-9A-HJKMNP-Z]/g

export function normalizeLendropId(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(INVALID, '')
    .slice(0, 6)
}

export function formatLendropId(value) {
  const code = normalizeLendropId(value)
  return code.length > 3 ? `${code.slice(0, 3)}-${code.slice(3)}` : code
}

export function isCompleteLendropId(value) {
  return normalizeLendropId(value).length === 6
}
