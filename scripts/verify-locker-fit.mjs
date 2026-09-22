// Ad-hoc verification script for computeRequiredLockerSize (Task 6.2 of
// the item-size-locker-fit brief) -- this repo has no test runner
// configured (see CLAUDE.md), so this isn't a checked-in automated test;
// it's a one-off script run manually to confirm the client-side fit
// preview agrees with the 6 cases given in the brief. Run: node scripts/verify-locker-fit.mjs
import { computeRequiredLockerSize } from '../src/services/items/lockerFit.js'

const SIZE_CLASSES = [
  { code: 'small', label: 'S', rank: 1, inner_height_cm: 12, inner_width_cm: 42, inner_depth_cm: 60, max_weight_kg: 10 },
  { code: 'medium', label: 'M', rank: 2, inner_height_cm: 30, inner_width_cm: 42, inner_depth_cm: 60, max_weight_kg: 20 },
  { code: 'large', label: 'L', rank: 3, inner_height_cm: 60, inner_width_cm: 42, inner_depth_cm: 60, max_weight_kg: 30 },
  { code: 'xlarge', label: 'XL', rank: 4, inner_height_cm: 190, inner_width_cm: 110, inner_depth_cm: 60, max_weight_kg: 40 },
]

const cases = [
  { name: 'camara 25x20x12 / 1.5kg', l: 25, w: 20, h: 12, kg: 1.5, expected: 'small' },
  { name: 'maleta cabina 55x40x23 / 8kg', l: 55, w: 40, h: 23, kg: 8, expected: 'medium' },
  { name: 'guitarra 105x40x12 / 3.5kg', l: 105, w: 40, h: 12, kg: 3.5, expected: 'xlarge' },
  { name: 'bici 175x105x30 / 14kg', l: 175, w: 105, h: 30, kg: 14, expected: 'xlarge' },
  { name: 'kayak 300x80x40', l: 300, w: 80, h: 40, kg: 1, expected: null },
  { name: 'caja 40x40x40 / 50kg (too heavy)', l: 40, w: 40, h: 40, kg: 50, expected: null },
]

let failures = 0
for (const c of cases) {
  const result = computeRequiredLockerSize(c.l, c.w, c.h, c.kg, SIZE_CLASSES)
  const got = result?.code ?? null
  const ok = got === c.expected
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(38)} expected=${String(c.expected).padEnd(7)} got=${got}`)
}

console.log(failures === 0 ? '\nAll cases match.' : `\n${failures} case(s) FAILED.`)
process.exit(failures === 0 ? 0 : 1)
