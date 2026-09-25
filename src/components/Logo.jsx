/**
 * The Lendrop wordmark, drawn from logo-lendrop.png as an alpha mask and
 * filled with --primary. The PNG itself is Lavender, which measures under
 * 3:1 on a white header; as a mask it becomes Deep Purple in light mode
 * and Lavender in dark mode without a second asset. The PNG is trimmed
 * to the ink, so the aspect ratio below must match its pixel size.
 */
export default function Logo({ className = 'h-7' }) {
  return (
    <span
      role="img"
      aria-label="Lendrop"
      className={`inline-block aspect-[872/240] bg-primary ${className}`}
      style={{
        maskImage: 'url(/logo-lendrop.png)',
        WebkitMaskImage: 'url(/logo-lendrop.png)',
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
