import { statusOf } from './statusColors'

/**
 * A single service rendered as an absolutely-positioned HTML circle so text and
 * icons stay crisp and hover states are trivial. `state` is
 * 'active' | 'dim' | 'normal'; `primary` marks the hovered/selected focus node.
 */
export default function ServiceNode({ node, state, primary, selected, onHover, onSelect, sidebarOpen, appliedUpgrades }) {
  const { icon: Icon, r, x, y, health, label, kind } = node
  const status = statusOf(health)
  const size = r * 2

  const dim = state === 'dim'
  const emphasized = primary || selected

  const isBottleneck = sidebarOpen && health !== 'healthy'
  const isSPOF = sidebarOpen && !isBottleneck && (
    (node.id === 'auth-service' && !appliedUpgrades?.authReplicas) ||
    (node.id === 'primary-db' && !appliedUpgrades?.dbReplicas)
  )

  return (
    <div
      data-node={node.id}
      className="absolute flex flex-col items-center"
      style={{
        left: x - r,
        top: y - r,
        width: size,
        opacity: dim ? 0.28 : 1,
        transition: 'opacity 260ms ease, transform 180ms ease',
        transform: emphasized ? 'scale(1.08)' : 'scale(1)',
        zIndex: emphasized ? 20 : 10,
        cursor: 'pointer',
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(node.id)
      }}
    >
      <div
        className="relative flex items-center justify-center rounded-full bg-white"
        style={{
          width: size,
          height: size,
          border: `2.5px solid ${status.color}`,
          boxShadow: emphasized
            ? `0 0 0 4px ${status.soft}, 0 8px 20px rgba(15,23,42,0.14)`
            : '0 2px 6px rgba(15,23,42,0.08)',
          transition: 'box-shadow 200ms ease',
        }}
      >
        {isBottleneck && (
          <div
            className="absolute rounded-full bg-red-500/25 animate-pulse pointer-events-none"
            style={{
              width: size + 16,
              height: size + 16,
              left: -8,
              top: -8,
              boxShadow: '0 0 16px 8px rgba(239, 68, 68, 0.45)',
              zIndex: -1,
            }}
          />
        )}
        {isSPOF && (
          <div
            className="absolute rounded-full bg-amber-500/20 animate-pulse pointer-events-none"
            style={{
              width: size + 16,
              height: size + 16,
              left: -8,
              top: -8,
              boxShadow: '0 0 14px 6px rgba(245, 158, 11, 0.35)',
              zIndex: -1,
            }}
          />
        )}
        <Icon size={r * 0.82} strokeWidth={1.75} style={{ color: status.color }} />
        <span
          className="absolute right-0 top-0 block rounded-full ring-2 ring-white"
          style={{ width: 11, height: 11, backgroundColor: status.color }}
        />
      </div>

      <div className="mt-2 flex flex-col items-center" style={{ width: Math.max(size + 40, 96) }}>
        <span className="whitespace-nowrap text-[12.5px] font-semibold text-ink">{label}</span>
        <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">
          {kind}
        </span>
      </div>
    </div>
  )
}
