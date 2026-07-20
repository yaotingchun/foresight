import ServiceEdge from './ServiceEdge'
import { CANVAS, EDGES, NODE_BY_ID } from '../../data/serviceMapData'
import { STATUS, EDGE_NEUTRAL } from './statusColors'

const ARROWS = [
  ['neutral', EDGE_NEUTRAL],
  ['healthy', STATUS.healthy.color],
  ['warning', STATUS.warning.color],
  ['critical', STATUS.critical.color],
  ['unknown', STATUS.unknown.color],
]

/** SVG surface holding every edge and its traffic particles, behind the nodes. */
export default function EdgeLayer({ edgeState }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={CANVAS.width}
      height={CANVAS.height}
      aria-hidden="true"
    >
      <defs>
        {ARROWS.map(([id, color]) => (
          <marker
            key={id}
            id={`arrow-${id}`}
            viewBox="0 0 8 8"
            refX="6.5"
            refY="4"
            markerWidth="5.5"
            markerHeight="5.5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 6 4 L 0 7 z" fill={color} />
          </marker>
        ))}
      </defs>

      {EDGES.map((edge) => {
        const source = NODE_BY_ID[edge.source]
        const target = NODE_BY_ID[edge.target]
        if (!source || !target) return null
        return (
          <ServiceEdge
            key={`${edge.source}->${edge.target}`}
            edge={edge}
            source={source}
            target={target}
            state={edgeState(edge)}
          />
        )
      })}
    </svg>
  )
}
