import { useRef, useState } from 'react'
import { scaleLinear, niceMax, smoothPath, areaFrom, indexFromPointer, formatCompact, clockLabel } from './chartUtils'

const VW = 760
const VH = 280
const PAD = { top: 16, right: 12, bottom: 26, left: 36 }

const CURRENT = '#3B82F6'
const PREV = '#94A3B8'

function axisLabel(date, range) {
  if (range.id === '7d') {
    return date.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return clockLabel(date, range.withSeconds && range.id === 'live')
}

/**
 * Real-time request throughput. Single measure (requests/sec) so it stays a
 * one-axis chart: the current window is the filled blue series, the dashed grey
 * line is the same measure over the previous period for context.
 */
export default function TrafficChart({ series, range }) {
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)

  const { t, requests, prev } = series
  const n = requests.length
  const yMax = niceMax(Math.max(...requests, ...prev) * 1.08)
  const x = scaleLinear(0, n - 1, PAD.left, VW - PAD.right)
  const y = scaleLinear(0, yMax, VH - PAD.bottom, PAD.top)

  const curPts = requests.map((v, i) => [x(i), y(v)])
  const prevPts = prev.map((v, i) => [x(i), y(v)])
  const curLine = smoothPath(curPts)
  const curArea = areaFrom(curLine, curPts, VH - PAD.bottom)
  const prevLine = smoothPath(prevPts)
  const end = curPts[curPts.length - 1]

  const yTicks = 4
  const gridVals = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * i)
  const xTickIdx = Array.from({ length: 6 }, (_, i) => Math.round((i / 5) * (n - 1)))

  const onMove = (e) => {
    if (!svgRef.current) return
    const idx = indexFromPointer(e, svgRef.current, n, PAD.left, PAD.right, VW)
    setHover(idx)
  }

  const hoverX = hover !== null ? x(hover) : 0
  const tipLeftPct = (hoverX / VW) * 100

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        className="w-full overflow-visible"
        style={{ height: 'clamp(220px, 30vh, 300px)' }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="traffic-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CURRENT} stopOpacity="0.24" />
            <stop offset="100%" stopColor={CURRENT} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal grid + y labels */}
        {gridVals.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={VW - PAD.right} y1={y(v)} y2={y(v)} stroke="#EEF1F5" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-ink-faint" fontSize="10">
              {formatCompact(v)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {xTickIdx.map((idx) => (
          <text key={idx} x={x(idx)} y={VH - 8} textAnchor="middle" className="fill-ink-faint" fontSize="10">
            {axisLabel(t[idx], range)}
          </text>
        ))}

        {/* previous-period ghost */}
        <path d={prevLine} fill="none" stroke={PREV} strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" opacity="0.8" />

        {/* current series */}
        <path d={curArea} fill="url(#traffic-area)" />
        <path d={curLine} fill="none" stroke={CURRENT} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />

        {/* live pulse at the leading edge */}
        <circle cx={end[0]} cy={end[1]} r="7" fill={CURRENT} opacity="0.16">
          <animate attributeName="r" values="5;10;5" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.28;0;0.28" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle cx={end[0]} cy={end[1]} r="3.5" fill={CURRENT} stroke="#fff" strokeWidth="1.5" />

        {/* hover crosshair */}
        {hover !== null && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={VH - PAD.bottom} stroke={CURRENT} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={hoverX} cy={y(requests[hover])} r="4" fill={CURRENT} stroke="#fff" strokeWidth="1.5" />
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg border border-line bg-card px-3 py-2 shadow-md"
          style={{ left: `clamp(56px, ${tipLeftPct}%, calc(100% - 56px))` }}
        >
          <p className="text-[11px] font-medium text-ink-faint">{clockLabel(t[hover], range.withSeconds && range.id === 'live')}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
            {requests[hover].toLocaleString()} <span className="font-normal text-ink-faint">req/s</span>
          </p>
          <p className="text-[11px] text-ink-soft tabular-nums">prev {prev[hover].toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}
