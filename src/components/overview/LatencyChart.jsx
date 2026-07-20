import { useRef, useState } from 'react'
import { scaleLinear, niceMax, smoothPath, areaFrom, indexFromPointer, clockLabel } from './chartUtils'

const VW = 520
const VH = 240
const PAD = { top: 16, right: 14, bottom: 24, left: 38 }

// Single-hue sequential ramp: same measure (latency), increasing severity.
const SERIES = [
  { key: 'p50', label: 'p50', color: '#93C5FD' },
  { key: 'p95', label: 'p95', color: '#3B82F6' },
  { key: 'p99', label: 'p99', color: '#1D4ED8' },
]

/** Response-time percentiles over time. One axis (ms), three severity steps. */
export default function LatencyChart({ series, range }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const { t } = series
  const n = series.p99.length
  const yMax = niceMax(Math.max(...series.p99) * 1.12)
  const x = scaleLinear(0, n - 1, PAD.left, VW - PAD.right)
  const y = scaleLinear(0, yMax, VH - PAD.bottom, PAD.top)

  const paths = SERIES.map((s) => {
    const pts = series[s.key].map((v, i) => [x(i), y(v)])
    return { ...s, line: smoothPath(pts), pts }
  })
  const p99pts = paths[2].pts
  const p99area = areaFrom(paths[2].line, p99pts, VH - PAD.bottom)

  const gridVals = Array.from({ length: 4 }, (_, i) => (yMax / 3) * i)
  const xTickIdx = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * (n - 1)))

  const onMove = (e) => {
    if (!svgRef.current) return
    setHover(indexFromPointer(e, svgRef.current, n, PAD.left, PAD.right, VW))
  }
  const hoverX = hover !== null ? x(hover) : 0
  const tipLeftPct = (hoverX / VW) * 100

  return (
    <div>
      <div className="mb-2 flex items-center gap-4">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
            <span className="h-1.5 w-3.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-ink-faint">ms</span>
      </div>

      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full"
          style={{ height: 'clamp(180px, 22vh, 240px)' }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="lat-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridVals.map((v, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={VW - PAD.right} y1={y(v)} y2={y(v)} stroke="#EEF1F5" strokeWidth="1" />
              <text x={PAD.left - 7} y={y(v) + 3.5} textAnchor="end" className="fill-ink-faint" fontSize="10">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {xTickIdx.map((idx) => (
            <text key={idx} x={x(idx)} y={VH - 7} textAnchor="middle" className="fill-ink-faint" fontSize="10">
              {clockLabel(t[idx], range.withSeconds && range.id === 'live')}
            </text>
          ))}

          <path d={p99area} fill="url(#lat-area)" />
          {paths.map((p) => (
            <path key={p.key} d={p.line} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {hover !== null && (
            <g>
              <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={VH - PAD.bottom} stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              {paths.map((p) => (
                <circle key={p.key} cx={hoverX} cy={y(series[p.key][hover])} r="3.5" fill={p.color} stroke="#fff" strokeWidth="1.5" />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-2.5 py-2 shadow-md"
            style={{ left: `clamp(52px, ${tipLeftPct}%, calc(100% - 52px))` }}
          >
            <p className="text-[11px] font-medium text-ink-faint">{clockLabel(t[hover], range.withSeconds && range.id === 'live')}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-ink">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
                <span className="ml-auto font-semibold">{series[s.key][hover]}ms</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
