import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Every calendar day between two booked reservations' start/end, inclusive,
// as a Set of "YYYY-MM-DD" strings — cheap to check against while rendering.
function buildBookedSet(bookedRanges) {
  const set = new Set()
  for (const range of bookedRanges) {
    const cursor = startOfDay(new Date(`${range.start_date}T00:00:00`))
    const end = startOfDay(new Date(`${range.end_date}T00:00:00`))
    while (cursor <= end) {
      set.add(toISODate(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return set
}

export default function AvailabilityCalendar({ bookedRanges = [], selectedRange, onSelectRange }) {
  const today = startOfDay(new Date())
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const bookedSet = useMemo(() => buildBookedSet(bookedRanges), [bookedRanges])

  const days = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells = Array.from({ length: firstDay.getDay() }, () => null)
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(new Date(year, month, day))
    }
    return cells
  }, [viewDate])

  function isInSelectedRange(date) {
    if (!selectedRange?.start) return false
    const iso = toISODate(date)
    const endIso = toISODate(selectedRange.end ?? selectedRange.start)
    const startIso = toISODate(selectedRange.start)
    return iso >= startIso && iso <= endIso
  }

  function hasBookedBetween(startDate, endDate) {
    const cursor = startOfDay(startDate)
    const end = startOfDay(endDate)
    while (cursor <= end) {
      if (bookedSet.has(toISODate(cursor))) return true
      cursor.setDate(cursor.getDate() + 1)
    }
    return false
  }

  function handleDayClick(date) {
    if (date < today || bookedSet.has(toISODate(date))) return

    const hasCompleteRange = selectedRange?.start && selectedRange?.end
    if (!selectedRange?.start || hasCompleteRange) {
      onSelectRange({ start: date, end: null })
      return
    }

    const start = selectedRange.start
    const [rangeStart, rangeEnd] = date < start ? [date, start] : [start, date]
    if (hasBookedBetween(rangeStart, rangeEnd)) {
      // Can't span a booked day — restart the selection at this day instead.
      onSelectRange({ start: date, end: null })
      return
    }
    onSelectRange({ start: rangeStart, end: rangeEnd })
  }

  return (
    <div className="rounded-2xl border border-lavender/15 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-jet-black/50 transition hover:bg-jet-black/5 hover:text-deep-purple"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-jet-black">
          {viewDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="flex h-7 w-7 items-center justify-center rounded-full text-jet-black/50 transition hover:bg-jet-black/5 hover:text-deep-purple"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-jet-black/40">
        {WEEKDAY_LABELS.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <span key={`blank-${i}`} />
          const isPast = date < today
          const isBooked = bookedSet.has(toISODate(date))
          const isSelected = isInSelectedRange(date)
          const isRangeEdge =
            selectedRange?.start &&
            (toISODate(date) === toISODate(selectedRange.start) ||
              (selectedRange.end && toISODate(date) === toISODate(selectedRange.end)))

          return (
            <button
              key={toISODate(date)}
              type="button"
              disabled={isPast || isBooked}
              onClick={() => handleDayClick(date)}
              className={`aspect-square rounded-lg text-xs font-medium transition ${
                isPast || isBooked
                  ? 'cursor-not-allowed text-jet-black/20 line-through'
                  : isRangeEdge
                    ? 'bg-deep-purple text-white'
                    : isSelected
                      ? 'bg-lavender/25 text-deep-purple'
                      : 'text-jet-black/70 hover:bg-lavender/10'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-jet-black/45">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-deep-purple" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-jet-black/15" /> Already booked
        </span>
      </div>
    </div>
  )
}
