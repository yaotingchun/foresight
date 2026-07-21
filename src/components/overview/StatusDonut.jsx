const SEGMENTS = [
  { key: '2xx', label: '2xx Success', color: '#10B981' },
  { key: '3xx', label: '3xx Redirect', color: '#3B82F6' },
  { key: '4xx', label: '4xx Client', color: '#F59E0B' },
  { key: '5xx', label: '5xx Server', color: '#EF4444' },
]

const R = 52
const STROKE = 12
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
    <div className="flex items-center justify-between gap-6">
      <div className="relative shrink-0">
        <svg width="132" height="132" viewBox="0 0 132 132" className="drop-shadow-sm">
          <circle cx="66" cy="66" r={R} fill="none" stroke="#F8FAFC" strokeWidth={STROKE} />
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
              strokeLinecap="round"
              transform="rotate(-90 66 66)"
              style={{ transition: 'stroke-dasharray 0.7s ease' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-slate-800 tabular-nums">{(mix['2xx'] || 0).toFixed(1)}%</span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">success</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((a) => (
          <li 
            key={a.key} 
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 hover:border-slate-200/50 px-2.5 py-1.5 text-xs transition-colors duration-200"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="truncate font-semibold text-slate-500">{a.label}</span>
            <span className="ml-auto font-bold tabular-nums text-slate-800">{a.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
