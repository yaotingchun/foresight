import { useMemo, useRef, useEffect, useState } from 'react'
import { bucketLogs } from '../../data/logsData'

const BAR_W_FRAC = 0.68

function formatBucketTime(ts, rangeMs) {
  const d = new Date(ts)
  if (rangeMs <= 15 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  if (rangeMs <= 60 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  // 1 day: show HH:MM
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function LogChart({ logs, rangeMs }) {
  const BUCKETS = 32
  const BAR_H = 80   // px — chart bars area
  const LABEL_H = 20   // px — x-axis label row
  const TOTAL_H = BAR_H + LABEL_H

  const containerRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [hoverIndex, setHoverIndex] = useState(null)

  // Measure container width for accurate label rendering
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width || 800)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(() => bucketLogs(logs, rangeMs, BUCKETS), [logs, rangeMs])

  const maxVal = useMemo(
    () => Math.max(1, ...data.map((d) => d.error + d.warn + d.info)),
    [data]
  )

  const bucketPx = width / BUCKETS
  const barPx = bucketPx * BAR_W_FRAC

  // Show ~7 evenly spaced tick labels
  const tickEvery = Math.max(1, Math.floor(BUCKETS / 7))
  const tickIndices = Array.from({ length: BUCKETS }, (_, i) => i).filter(
    (i) => i % tickEvery === 0 || i === BUCKETS - 1
  )

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((x / width) * BUCKETS)))
    setHoverIndex(idx)
  }

  const hoverBucket = hoverIndex !== null ? data[hoverIndex] : null
  const hoverX = hoverIndex !== null ? (hoverIndex + 0.5) * bucketPx : 0
  const tipLeftPct = width > 0 ? (hoverX / width) * 100 : 0

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
    >
      <svg
        width={width}
        height={TOTAL_H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={0}
            y1={BAR_H * (1 - f)}
            x2={width}
            y2={BAR_H * (1 - f)}
            stroke="#E5E7EB"
            strokeWidth={1}
          />
        ))}

        {/* Hover highlight column */}
        {hoverIndex !== null && (
          <rect
            x={hoverIndex * bucketPx}
            y={0}
            width={bucketPx}
            height={BAR_H}
            fill="#3B82F6"
            fillOpacity={0.06}
            rx={3}
          />
        )}

        {/* Bars */}
        {data.map((bucket, i) => {
          const x = i * bucketPx + (bucketPx - barPx) / 2
          const scale = BAR_H / maxVal

          const errorH = bucket.error * scale
          const warnH = bucket.warn * scale
          const infoH = bucket.info * scale

          let y = BAR_H
          const segs = []
          const isHovered = i === hoverIndex

          if (infoH > 0) {
            y -= infoH
            segs.push(<rect key="info" x={x} y={y} width={barPx} height={infoH} fill="#60A5FA" rx={1.5} opacity={hoverIndex === null || isHovered ? 1 : 0.65} />)
          }
          if (warnH > 0) {
            y -= warnH
            segs.push(<rect key="warn" x={x} y={y} width={barPx} height={warnH} fill="#FBBF24" rx={1.5} opacity={hoverIndex === null || isHovered ? 1 : 0.65} />)
          }
          if (errorH > 0) {
            y -= errorH
            segs.push(<rect key="err" x={x} y={y} width={barPx} height={errorH} fill="#F87171" rx={1.5} opacity={hoverIndex === null || isHovered ? 1 : 0.65} />)
          }

          return <g key={i}>{segs}</g>
        })}

        {/* Hover guideline */}
        {hoverIndex !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={0}
            y2={BAR_H}
            stroke="#94A3B8"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.6}
          />
        )}

        {/* X-axis tick labels — rendered in pixel space, no clipping */}
        {tickIndices.map((i) => {
          const cx = i * bucketPx + bucketPx / 2
          // clamp so first/last labels don't get cut
          const x = Math.max(24, Math.min(width - 24, cx))
          return (
            <text
              key={i}
              x={x}
              y={BAR_H + LABEL_H - 3}
              textAnchor="middle"
              fontSize={10}
              fill="#94A3B8"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {formatBucketTime(data[i]?.t ?? 0, rangeMs)}
            </text>
          )
        })}
      </svg>

      {/* Info Card Tooltip */}
      {hoverBucket && (
        <div
          className="pointer-events-none absolute -top-1.5 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card p-2.5 shadow-lg min-w-[140px] text-xs backdrop-blur-sm"
          style={{ left: `clamp(75px, ${tipLeftPct}%, calc(100% - 75px))` }}
        >
          <div className="font-semibold text-ink border-b border-line pb-1 mb-1.5 flex items-center justify-between gap-3">
            <span>{formatBucketTime(hoverBucket.t, rangeMs)}</span>
            <span className="text-[10px] font-normal text-ink-faint">
              {(hoverBucket.error + hoverBucket.warn + hoverBucket.info).toLocaleString()} events
            </span>
          </div>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-red-500 font-medium">
                <span className="w-2 h-2 rounded-sm bg-red-400 shrink-0" />
                Error
              </span>
              <span className="font-semibold tabular-nums text-ink">{hoverBucket.error}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                <span className="w-2 h-2 rounded-sm bg-amber-400 shrink-0" />
                Warning
              </span>
              <span className="font-semibold tabular-nums text-ink">{hoverBucket.warn}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                <span className="w-2 h-2 rounded-sm bg-blue-400 shrink-0" />
                Info
              </span>
              <span className="font-semibold tabular-nums text-ink">{hoverBucket.info}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend row */}
      <div className="flex items-center gap-4 mt-1 px-0.5">
        {[
          { color: 'bg-red-400', label: 'Error' },
          { color: 'bg-amber-400', label: 'Warning' },
          { color: 'bg-blue-400', label: 'Info' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${color}`} />
            {label}
          </span>
        ))}
        <span className="ml-auto text-[11px] text-ink-faint">
          {logs.length.toLocaleString()} events in window
        </span>
      </div>
    </div>
  )
}
