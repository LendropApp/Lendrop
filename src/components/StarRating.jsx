import { useState } from 'react'
import { Star } from 'lucide-react'

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
}

// Read-only by default (renders `value` filled stars out of 5). Pass
// `onChange` to make it an interactive 1-5 picker (used on the item
// review form) with hover preview.
export default function StarRating({ value = 0, onChange, size = 'md', className = '' }) {
  const [hovered, setHovered] = useState(0)
  const interactive = typeof onChange === 'function'
  const displayValue = interactive && hovered ? hovered : value
  const starClass = SIZES[size] ?? SIZES.md

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseLeave={interactive ? () => setHovered(0) : undefined}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(displayValue)
        const Tag = interactive ? 'button' : 'span'
        return (
          <Tag
            key={star}
            type={interactive ? 'button' : undefined}
            aria-label={interactive ? `Rate ${star} out of 5` : undefined}
            onClick={interactive ? () => onChange(star) : undefined}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            className={interactive ? 'transition hover:scale-110' : undefined}
          >
            <Star
              className={`${starClass} ${filled ? 'fill-jet-black text-text' : 'fill-transparent text-text-muted'}`}
              strokeWidth={1.75}
            />
          </Tag>
        )
      })}
    </div>
  )
}
