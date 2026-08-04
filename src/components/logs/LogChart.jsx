import { useMemo, useRef, useEffect, useState } from 'react'
import { bucketLogs } from '../../data/logsData'

function formatBucketTime(ts, rangeMs) {
  const d = new Date(ts)
  if (rangeMs <= 15 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  if (rangeMs <= 60 * 60 * 1000)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function LogChart({ logs, rangeMs, selectedBucketIndex = null, onSelectBucket, referenceTime = null }) {
  const TARGET_BAR_W = 18 // Fixed consistent bar width in px
  const BAR_GAP = 1      // 1px hairline separator
  const SLOT_PX = TARGET_BAR_W + BAR_GAP // 19px per bucket slot

  const BAR_H = 75    // px — height for clear vertical range
  const LABEL_H = 18   // px — x-axis label row
  const Y_AXIS_W = 28  // px — space for y-axis count labels
  const TOTAL_H = BAR_H + LABEL_H

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

  const chartW = Math.max(100, width - Y_AXIS_W)
  const BUCKETS = Math.max(10, Math.floor(chartW / SLOT_PX))
  const bucketPx = chartW / BUCKETS
  const barW = Math.max(1, bucketPx - BAR_GAP)

  const data = useMemo(() => bucketLogs(logs, rangeMs, BUCKETS, referenceTime), [logs, rangeMs, BUCKETS, referenceTime])

  const maxVal = useMemo(
    () => Math.max(1, ...data.map((d) => d.error + d.warn + d.info)),
    [data]
  )

  // Show evenly spaced tick labels with minimum pixel gap to prevent overlaps
  const tickIndices = useMemo(() => {
    const MIN_GAP_PX = 85
    const indices = []
    let lastX = -999
    for (let i = 0; i < BUCKETS; i++) {
      const cx = Y_AXIS_W + i * bucketPx + bucketPx / 2
      if (cx - lastX >= MIN_GAP_PX) {
        indices.push(i)
        lastX = cx
      }
    }
    if (indices.length > 0) {
      const lastIdx = BUCKETS - 1
      const lastCX = Y_AXIS_W + lastIdx * bucketPx + bucketPx / 2
      if (lastCX - lastX < MIN_GAP_PX && indices.length > 1) {
        indices[indices.length - 1] = lastIdx
      } else if (lastCX - lastX >= MIN_GAP_PX && indices[indices.length - 1] !== lastIdx) {
        indices.push(lastIdx)
      }
    }
    return indices
  }, [BUCKETS, bucketPx])

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
    const targetBucket = data[idx]
    if (!targetBucket || (targetBucket.error + targetBucket.warn + targetBucket.info) === 0) return
    onSelectBucket(idx === selectedBucketIndex ? null : idx, targetBucket)
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
              fill="#21C085"
              fillOpacity={0.15}
              rx={2}
            />
            <rect
              x={Y_AXIS_W + selectedBucketIndex * bucketPx}
              y={0}
              width={bucketPx}
              height={2}
              fill="#21C085"
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

        {/* Stacked Histogram Bars — Continuous Strip with 1px separator */}
        {data.map((bucket, i) => {
          const x = Y_AXIS_W + i * bucketPx

          // Power scaling (exponent 0.6) ensures 1-2 event baseline bars stay clearly visible (~12-20px)
          // even when a massive incident error spike (e.g. 19 events) dominates the maxVal.
          const getSegH = (count) => {
            if (!count || count === 0) return 0
            const ratio = Math.pow(count / maxVal, 0.58)
            return Math.max(7, Math.round(ratio * BAR_H))
          }

          const totalCount = bucket.info + bucket.warn + bucket.error
          const totalH = getSegH(totalCount)

          // Distribute total scaled height proportionally among severity layers
          const infoH  = totalCount > 0 ? Math.round(totalH * (bucket.info / totalCount)) : 0
          const warnH  = totalCount > 0 ? Math.round(totalH * (bucket.warn / totalCount)) : 0
          const errorH = totalCount > 0 ? Math.max(0, totalH - infoH - warnH) : 0

          let y = BAR_H
          const segs = []
          const isHovered = i === hoverIndex
          const isSelected = i === selectedBucketIndex

          const opacity =
            (hoverIndex === null && selectedBucketIndex === null) || isHovered || isSelected ? 1 : 0.65

          // Bottom: Info (Blue)
          if (infoH > 0) {
            y -= infoH
            segs.push(
              <rect
                key="info"
                x={x}
                y={y}
                width={barW}
                height={infoH}
                fill="#60A5FA"
                opacity={opacity}
              />
            )
          }

          // Middle: Warning (Yellow)
          if (warnH > 0) {
            y -= warnH
            segs.push(
              <rect
                key="warn"
                x={x}
                y={y}
                width={barW}
                height={warnH}
                fill="#FBBF24"
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
                width={barW}
                height={errorH}
                fill="#F87171"
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
              fill={i === selectedBucketIndex ? '#21C085' : '#94A3B8'}
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
