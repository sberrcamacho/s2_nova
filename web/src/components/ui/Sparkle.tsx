interface SparkleProps {
  className?: string
  size?: number
}

// The S2 Nova four-point sparkle — the one recurring "Nova" motif used
// across the wordmark, splash screen, and small decorative accents. Kept to
// a single restrained shape so it never tips into sci-fi iconography.
export function Sparkle({ className, size = 16 }: SparkleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 1.5c.6 4.6 1.4 7.1 2.9 8.6 1.5 1.5 4 2.3 8.6 2.9-4.6.6-7.1 1.4-8.6 2.9-1.5 1.5-2.3 4-2.9 8.6-.6-4.6-1.4-7.1-2.9-8.6C7.6 14.4 5.1 13.6.5 13c4.6-.6 7.1-1.4 8.6-2.9C10.6 8.6 11.4 6.1 12 1.5z"
        fill="currentColor"
      />
    </svg>
  )
}
