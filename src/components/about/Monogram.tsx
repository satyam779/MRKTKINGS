export function Monogram({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden="true" className="monogram">
      <circle r="46" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
      <circle r="38" fill="none" stroke="var(--red)" strokeWidth="1.5" />
      <text
        x="0"
        y="2"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        style={{ font: '800 30px var(--font-display)', letterSpacing: '-1px' }}
      >
        {initials}
      </text>
    </svg>
  )
}
