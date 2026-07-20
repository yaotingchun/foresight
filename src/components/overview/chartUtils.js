/**
 * Small, dependency-free helpers for the hand-rolled SVG charts on the Overview
 * dashboard. Everything works in a fixed viewBox coordinate space; the SVGs are
 * rendered at width:100% so the charts scale fluidly while the maths stay simple.
 */

/** Linear scale from a data domain to a pixel range. */
export function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (v) => rangeMin + ((v - domainMin) / span) * (rangeMax - rangeMin)
}

/** Nice-ish upper bound so the y-axis has a little headroom above the peak. */
export function niceMax(max) {
  if (max <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const n = max / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

/**
 * Catmull-Rom → cubic-Bézier smoothing. Produces the soft, premium-looking
 * curves you see in polished monitoring UIs without over-rounding the peaks.
 */
export function smoothPath(points, tension = 0.5) {
  if (points.length < 2) return ''
  const d = [`M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`]
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension
    d.push(
      `C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`,
    )
  }
  return d.join(' ')
}

/** Close a line path into a filled area anchored to the baseline. */
export function areaFrom(linePath, points, baseY) {
  if (!linePath) return ''
  const lastX = points[points.length - 1][0]
  const firstX = points[0][0]
  return `${linePath} L ${lastX.toFixed(2)} ${baseY} L ${firstX.toFixed(2)} ${baseY} Z`
}

/** Compact number formatting: 1240 → 1.24k, 2_100_000 → 2.1M. */
export function formatCompact(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return `${Math.round(n)}`
}

/** Clock label for a Date, e.g. 14:07:22 or 14:07 (when seconds omitted). */
export function clockLabel(date, withSeconds = true) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  if (!withSeconds) return `${h}:${m}`
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Map a pointer's clientX over a rendered SVG to the nearest data index.
 * Works regardless of the SVG's on-screen scale because it measures the DOM.
 */
export function indexFromPointer(event, el, count, padLeft, padRight, viewWidth) {
  const rect = el.getBoundingClientRect()
  const relX = ((event.clientX - rect.left) / rect.width) * viewWidth
  const plotW = viewWidth - padLeft - padRight
  const ratio = Math.min(1, Math.max(0, (relX - padLeft) / plotW))
  return Math.round(ratio * (count - 1))
}
