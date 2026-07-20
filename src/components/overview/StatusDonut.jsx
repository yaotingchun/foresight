const SEGMENTS = [
  { key: '2xx', label: '2xx Success', color: '#22C55E' },
  { key: '3xx', label: '3xx Redirect', color: '#3B82F6' },
  { key: '4xx', label: '4xx Client', color: '#F59E0B' },
  { key: '5xx', label: '5xx Server', color: '#EF4444' },
]

const R = 52
const STROKE = 16
const C = 2 * Math.PI * R

/**
 * Response-code distribution as a donut. The categories map to HTTP status
 * classes, so their colours intentionally reuse the app's status palette.
 */
export default function StatusDonut({ mix }) {
  let offset = 0
  const arcs = SEGMENTS.map((s) => {
    const pct = mix[s.key] || 0
    const len = (pct / 100) * C
    const arc = { ...s, pct, dash: len, gap: C - len, rot: (offset / 100) * 360 }
    offset += pct
    return arc
  })

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width="132" height="132" viewBox="0 0 132 132">
          <circle cx="66" cy="66" r={R} fill="none" stroke="#F1F5F9" strokeWidth={STROKE} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx="66"
              cy="66"
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth={STROKE}
              strokeDasharray={`${a.dash} ${a.gap}`}
              strokeDashoffset={-((a.rot / 360) * C)}
              strokeLinecap="butt"
              transform="rotate(-90 66 66)"
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-ink tabular-nums">{(mix['2xx'] || 0).toFixed(1)}%</span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">success</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {arcs.map((a) => (
          <li key={a.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: a.color }} />
            <span className="truncate text-ink-soft">{a.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-ink">{a.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
