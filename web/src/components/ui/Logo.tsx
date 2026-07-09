export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-label="Neetpix logo">
      <rect x="10" y="10" width="80" height="80" rx="16" fill="#00897B" />
      <text
        x="50" y="68"
        textAnchor="middle"
        fontFamily="-apple-system, 'Helvetica Neue', 'PingFang SC', sans-serif"
        fontSize="48"
        fontWeight="800"
        fill="white"
      >
        N
      </text>
      <rect x="68" y="16" width="16" height="16" rx="3" fill="#FF6B35" opacity="0.9" />
    </svg>
  );
}
