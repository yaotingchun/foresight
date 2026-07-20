/**
 * Builds a smooth cubic-bezier path between two nodes, trimmed to each node's
 * radius so the line starts/ends at the circle border (with a little extra gap
 * at the target for the arrowhead). Control points are pulled horizontally to
 * give the flowing left-to-right feel of a Datadog service map.
 */
export function buildEdgePath(source, target) {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const dist = Math.hypot(dx, dy) || 1
  const ux = dx / dist
  const uy = dy / dist

  const startGap = source.r + 3
  const endGap = target.r + 9

  const sx = source.x + ux * startGap
  const sy = source.y + uy * startGap
  const tx = target.x - ux * endGap
  const ty = target.y - uy * endGap

  // Horizontal-tangent control points → gentle S-curves.
  const cx = Math.abs(tx - sx) * 0.5
  const c1x = sx + cx
  const c2x = tx - cx

  const d = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${sy.toFixed(1)}, ${c2x.toFixed(1)} ${ty.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`

  return { d, sx, sy, tx, ty }
}

/** Particle travel time (seconds): busier edges flow faster. */
export function flowDuration(throughput) {
  const dur = 3.4 - throughput / 900
  return Math.min(3.2, Math.max(1.1, dur))
}
