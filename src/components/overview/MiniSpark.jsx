import { smoothPath, areaFrom } from './chartUtils'

/** Compact filled sparkline used inside KPI tiles. Fixed viewBox, scales to fit. */
export default function MiniSpark({ data = [], color = '#3B82F6', height = 40 }) {
  const W = 120
  const H = height
  if (data.length < 2) return <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = W / (data.length - 1)
  const points = data.map((v, i) => [i * stepX, H - 3 - ((v - min) / range) * (H - 8)])

  const line = smoothPath(points, 0.5)
  const area = areaFrom(line, points, H)
  const gid = `mspark-${color.replace('#', '')}`
  const last = points[points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.26" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
