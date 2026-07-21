import { useRef, useState } from 'react'
import { scaleLinear, niceMax, smoothPath, areaFrom, indexFromPointer, clockLabel } from './chartUtils'

const VW = 520
const VH = 240
const PAD = { top: 16, right: 14, bottom: 24, left: 38 }

// Single-hue sequential ramp: same measure (latency), increasing severity.
const SERIES = [
  { key: 'p50', label: 'p50', color: '#0EA5E9' },
  { key: 'p95', label: 'p95', color: '#4F46E5' },
  { key: 'p99', label: 'p99', color: '#9333EA' },
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
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            <span className="h-1.5 w-3.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-[10px] font-bold tracking-wider text-slate-400 uppercase">ms</span>
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
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridVals.map((v, i) => (
            <g key={i}>
              <line x1={PAD.left} x2={VW - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(226, 232, 240, 0.45)" strokeWidth="1" />
              <text x={PAD.left - 7} y={y(v) + 3.5} textAnchor="end" className="fill-slate-400 font-medium" fontSize="9">
                {Math.round(v)}
              </text>
            </g>
          ))}
          {xTickIdx.map((idx) => (
            <text key={idx} x={x(idx)} y={VH - 7} textAnchor="middle" className="fill-slate-400 font-medium" fontSize="9">
              {clockLabel(t[idx], range.withSeconds && range.id === 'live')}
            </text>
          ))}

          <path d={p99area} fill="url(#lat-area)" />
          {paths.map((p) => (
            <path key={p.key} d={p.line} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}

          {hover !== null && (
            <g>
              <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={VH - PAD.bottom} stroke="#4F46E5" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              {paths.map((p) => (
                <circle key={p.key} cx={hoverX} cy={y(series[p.key][hover])} r="3.5" fill={p.color} stroke="#fff" strokeWidth="1.5" />
              ))}
            </g>
          )}
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-xl border border-slate-700/40 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 shadow-xl text-white transition-all duration-100"
            style={{ left: `clamp(52px, ${tipLeftPct}%, calc(100% - 52px))` }}
          >
            <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
              {clockLabel(t[hover], range.withSeconds && range.id === 'live')}
            </p>
            <div className="mt-1.5 space-y-1">
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center gap-2 text-xs tabular-nums text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-slate-400 font-semibold">{s.label}</span>
                  <span className="ml-auto font-bold text-slate-100">{series[s.key][hover]}ms</span>
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
