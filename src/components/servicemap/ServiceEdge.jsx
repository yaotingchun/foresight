import { buildEdgePath, flowDuration } from './edgeGeometry'
import { statusOf, EDGE_NEUTRAL } from './statusColors'

/**
 * One directed dependency edge: a bezier path plus animated traffic particles
 * flowing from source to target. `state` is 'active' | 'dim' | 'normal'.
 */
export default function ServiceEdge({ edge, source, target, health, state }) {
  const { d } = buildEdgePath(source, target)
  const { color } = statusOf(health)
  const dur = flowDuration(edge.throughput)

  const active = state === 'active'
  const dim = state === 'dim'

  const stroke = active ? color : EDGE_NEUTRAL
  const opacity = dim ? 0.12 : active ? 0.9 : 0.5
  const width = active ? 2.4 : 1.5
  const particleColor = active ? color : '#94A3B8'
  const particleOpacity = dim ? 0 : active ? 1 : 0.65

  return (
    <g
      style={{ opacity, transition: 'opacity 260ms ease' }}
      markerEnd={`url(#arrow-${active ? health : 'neutral'})`}
    >
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        markerEnd={`url(#arrow-${active ? health : 'neutral'})`}
        style={{ transition: 'stroke 260ms ease, stroke-width 200ms ease' }}
      />

      {[0, dur / 2].map((begin, i) => (
        <circle key={i} r={active ? 3 : 2.2} fill={particleColor} opacity={particleOpacity}>
          <animateMotion dur={`${dur}s`} begin={`-${begin}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </g>
  )
}
