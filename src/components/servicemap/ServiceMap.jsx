import { useEffect, useMemo, useState } from 'react'
import EdgeLayer from './EdgeLayer'
import NodeLayer from './NodeLayer'
import ServiceMapLegend from './ServiceMapLegend'
import ServiceMapControls from './ServiceMapControls'
import ServiceDetailPanel from './ServiceDetailPanel'
import { useZoomPan } from '../../hooks/useZoomPan'
import { useSimulatedNodes } from '../../hooks/useSimulatedNodes'
import { CANVAS, EDGES } from '../../data/serviceMapData'

/**
 * Interactive canvas. Owns hover / selection / search focus and derives the
 * per-node and per-edge visual state from it, then hands geometry to the layers.
 */
export default function ServiceMap({ query = '', expanded = false, onToggleExpand }) {
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const { viewportRef, transform, animated, handlers, controls } = useZoomPan(CANVAS)
  const nodes = useSimulatedNodes()
  const nodeById = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes])

  // Re-fit after the container resizes between windowed and fullscreen. Two
  // rAFs let the fixed-position relayout settle before we measure.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => controls.fit()))
    return () => cancelAnimationFrame(id)
  }, [expanded, controls])

  const NEIGHBORS = useMemo(() => {
    const map = {}
    nodes.forEach((n) => { map[n.id] = new Set() })
    EDGES.forEach((e) => {
      map[e.source]?.add(e.target)
      map[e.target]?.add(e.source)
    })
    return map
  }, [nodes])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return new Set(nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id))
  }, [query, nodes])

  // Precedence: transient hover > active search > persistent selection.
  const focusId = hoveredId ?? (matches ? null : selectedId)

  const nodeState = (id) => {
    if (focusId) {
      return id === focusId || NEIGHBORS[focusId]?.has(id) ? 'active' : 'dim'
    }
    if (matches) return matches.has(id) ? 'active' : 'dim'
    return 'normal'
  }

  const edgeState = (edge) => {
    if (focusId) {
      return edge.source === focusId || edge.target === focusId ? 'active' : 'dim'
    }
    if (matches) return matches.has(edge.source) && matches.has(edge.target) ? 'active' : 'dim'
    return 'normal'
  }

  return (
    <div
      ref={viewportRef}
      className="relative h-full w-full touch-none overflow-hidden rounded-xl border border-line bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.16)_1px,transparent_0)] [background-size:22px_22px]"
      style={{ cursor: 'grab' }}
      onClick={() => setSelectedId(null)}
      {...handlers}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CANVAS.width,
          height: CANVAS.height,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: animated ? 'transform 260ms ease' : 'none',
        }}
      >
        <EdgeLayer edgeState={edgeState} nodeById={nodeById} />
        <NodeLayer
          nodes={nodes}
          nodeState={nodeState}
          focusId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={setSelectedId}
        />
      </div>

      <ServiceMapLegend />
      <ServiceMapControls
        onZoomIn={controls.zoomIn}
        onZoomOut={controls.zoomOut}
        onFit={controls.fit}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
      />
      <ServiceDetailPanel nodeId={selectedId} nodeById={nodeById} onClose={() => setSelectedId(null)} />
    </div>
  )
}
