import { useMemo, useRef, useEffect, useState } from 'react'
import { bucketLogs, LOG_BUCKET_COUNT } from '../../data/logsData'

function formatBucketTime(ts, rangeMs) {
  const d = new Date(ts)
  if (rangeMs <= 15 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  if (rangeMs <= 60 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function LogChart({ logs, rangeMs, selectedBucketIndex = null, onSelectBucket, referenceTime = null }) {
  const BUCKETS = LOG_BUCKET_COUNT
  const BAR_H = 75    // px — modest height increase for clear vertical range
  const LABEL_H = 18   // px — x-axis label row
  const Y_AXIS_W = 28  // px — space for y-axis count labels
  const TOTAL_H = BAR_H + LABEL_H
  const BAR_W_FRAC = 0.56 // Balanced bar width with clean gaps

  const containerRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [hoverIndex, setHoverIndex] = useState(null)

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width || 800)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const data = useMemo(() => bucketLogs(logs, rangeMs, BUCKETS, referenceTime), [logs, rangeMs, BUCKETS, referenceTime])

  const maxVal = useMemo(
    () => Math.max(1, ...data.map((d) => d.error + d.warn + d.info)),
    [data]
  )

  const chartW = Math.max(100, width - Y_AXIS_W)
  const bucketPx = chartW / BUCKETS
  const barPx = Math.max(16, Math.min(24, bucketPx * BAR_W_FRAC))

  // Show ~5 evenly spaced tick labels
  const tickEvery = Math.max(1, Math.floor(BUCKETS / 5))
  const tickIndices = Array.from({ length: BUCKETS }, (_, i) => i).filter(
    (i) => i % tickEvery === 0 || i === BUCKETS - 1
  )

  const handleMouseMove = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - Y_AXIS_W
    if (x < 0) {
      setHoverIndex(null)
      return
    }
    const idx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((x / chartW) * BUCKETS)))
    setHoverIndex(idx)
  }

  const handleClick = (e) => {
    if (!containerRef.current || !onSelectBucket) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - Y_AXIS_W
    if (x < 0) return
    const idx = Math.max(0, Math.min(BUCKETS - 1, Math.floor((x / chartW) * BUCKETS)))
    onSelectBucket(idx === selectedBucketIndex ? null : idx)
  }

  const hoverBucket = hoverIndex !== null ? data[hoverIndex] : null
  const hoverX = hoverIndex !== null ? Y_AXIS_W + (hoverIndex + 0.5) * bucketPx : 0
  const tipLeftPct = width > 0 ? (hoverX / width) * 100 : 0

  const midCount = Math.round(maxVal / 2)

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIndex(null)}
      onClick={handleClick}
    >
      <svg
        width={width}
        height={TOTAL_H}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Y-axis Gridlines & Count Labels */}
        <line
          x1={Y_AXIS_W}
          y1={0}
          x2={width}
          y2={0}
          stroke="#E5E7EB"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
        <text
          x={Y_AXIS_W - 4}
          y={8}
          textAnchor="end"
          fontSize={9}
          fill="#94A3B8"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {maxVal}
        </text>

        {maxVal > 1 && (
          <>
            <line
              x1={Y_AXIS_W}
              y1={BAR_H * 0.5}
              x2={width}
              y2={BAR_H * 0.5}
              stroke="#E5E7EB"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <text
              x={Y_AXIS_W - 4}
              y={BAR_H * 0.5 + 3}
              textAnchor="end"
              fontSize={9}
              fill="#94A3B8"
              fontFamily="Inter, system-ui, sans-serif"
            >
              {midCount}
            </text>
          </>
        )}

        <line
          x1={Y_AXIS_W}
          y1={BAR_H}
          x2={width}
          y2={BAR_H}
          stroke="#CBD5E1"
          strokeWidth={1}
        />
        <text
          x={Y_AXIS_W - 4}
          y={BAR_H}
          textAnchor="end"
          fontSize={9}
          fill="#94A3B8"
          fontFamily="Inter, system-ui, sans-serif"
        >
          0
        </text>

        {/* Selected Bucket Highlight */}
        {selectedBucketIndex !== null && (
          <g>
            <rect
              x={Y_AXIS_W + selectedBucketIndex * bucketPx}
              y={0}
              width={bucketPx}
              height={BAR_H}
              fill="#6366F1"
              fillOpacity={0.15}
              rx={2}
            />
            <rect
              x={Y_AXIS_W + selectedBucketIndex * bucketPx}
              y={0}
              width={bucketPx}
              height={2}
              fill="#6366F1"
              rx={1}
            />
          </g>
        )}

        {/* Hover Highlight Column */}
        {hoverIndex !== null && hoverIndex !== selectedBucketIndex && (
          <rect
            x={Y_AXIS_W + hoverIndex * bucketPx}
            y={0}
            width={bucketPx}
            height={BAR_H}
            fill="#3B82F6"
            fillOpacity={0.08}
            rx={2}
          />
        )}

        {/* Stacked Histogram Bars */}
        {data.map((bucket, i) => {
          const x = Y_AXIS_W + i * bucketPx + (bucketPx - barPx) / 2
          const scale = BAR_H / maxVal

          const infoH = bucket.info * scale
          const warnH = bucket.warn * scale
          const errorH = bucket.error * scale
          const totalH = infoH + warnH + errorH

          let y = BAR_H
          const segs = []
          const isHovered = i === hoverIndex
          const isSelected = i === selectedBucketIndex

          const opacity =
            (hoverIndex === null && selectedBucketIndex === null) || isHovered || isSelected ? 1 : 0.6

          const hasError = errorH > 0
          const hasWarn = warnH > 0

          // Bottom: Info (Blue)
          if (infoH > 0) {
            y -= infoH
            const isTop = !hasWarn && !hasError
            segs.push(
              <rect
                key="info"
                x={x}
                y={y}
                width={barPx}
                height={infoH}
                fill="#60A5FA"
                rx={isTop ? 1.5 : 0}
                opacity={opacity}
              />
            )
          }

          // Middle: Warning (Yellow)
          if (warnH > 0) {
            y -= warnH
            const isTop = !hasError
            segs.push(
              <rect
                key="warn"
                x={x}
                y={y}
                width={barPx}
                height={warnH}
                fill="#FBBF24"
                rx={isTop ? 1.5 : 0}
                opacity={opacity}
              />
            )
          }

          // Top: Error (Red)
          if (errorH > 0) {
            y -= errorH
            segs.push(
              <rect
                key="err"
                x={x}
                y={y}
                width={barPx}
                height={errorH}
                fill="#F87171"
                rx={1.5}
                opacity={opacity}
              />
            )
          }

          return <g key={i}>{segs}</g>
        })}

        {/* Hover Guideline */}
        {hoverIndex !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={0}
            y2={BAR_H}
            stroke="#94A3B8"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.7}
          />
        )}

        {/* X-Axis Tick Labels */}
        {tickIndices.map((i) => {
          const cx = Y_AXIS_W + i * bucketPx + bucketPx / 2
          const x = Math.max(Y_AXIS_W + 20, Math.min(width - 20, cx))
          return (
            <text
              key={i}
              x={x}
              y={BAR_H + LABEL_H - 3}
              textAnchor="middle"
              fontSize={10}
              fill={i === selectedBucketIndex ? '#4F46E5' : '#94A3B8'}
              fontWeight={i === selectedBucketIndex ? 600 : 400}
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
          className="pointer-events-none absolute -top-1.5 z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card p-2 shadow-lg min-w-[140px] text-xs backdrop-blur-sm"
          style={{ left: `clamp(85px, ${tipLeftPct}%, calc(100% - 85px))` }}
        >
          <div className="font-semibold text-ink border-b border-line pb-1 mb-1 flex items-center justify-between gap-3">
            <span>{formatBucketTime(hoverBucket.t, rangeMs)}</span>
            <span className="text-[10px] font-normal text-ink-faint">
              {(hoverBucket.error + hoverBucket.warn + hoverBucket.info).toLocaleString()} events
            </span>
          </div>
          <div className="space-y-0.5 text-[11px]">
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

      {/* Legend Row */}
      <div className="flex items-center gap-4 mt-0.5 px-0.5">
        {[
          { color: 'bg-red-400', label: 'Error' },
          { color: 'bg-amber-400', label: 'Warning' },
          { color: 'bg-blue-400', label: 'Info' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-ink-faint">
            <span className={`w-2 h-2 rounded-sm shrink-0 ${color}`} />
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
