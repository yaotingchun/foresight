import ServiceNode from './ServiceNode'

/** Absolutely-positioned HTML node layer, sitting on top of the edge SVG. */
export default function NodeLayer({ nodes, nodeState, focusId, selectedId, onHover, onSelect }) {
  return (
    <div className="absolute inset-0">
      {nodes.map((node) => (
        <ServiceNode
          key={node.id}
          node={node}
          state={nodeState(node.id)}
          primary={node.id === focusId}
          selected={node.id === selectedId}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
