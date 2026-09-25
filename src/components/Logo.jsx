/**
 * The Lendrop wordmark, drawn from logo-lendrop.png as an alpha mask and
 * filled with --primary. The PNG itself is pale lavender, which measures
 * under 2:1 on a white header; as a mask it becomes Deep Purple in light
 * mode and Lavender in dark mode without a second asset.
 */
export default function Logo({ className = 'h-7' }) {
  return (
    <span
      role="img"
      aria-label="Lendrop"
      className={`inline-block aspect-[991/332] bg-primary ${className}`}
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
