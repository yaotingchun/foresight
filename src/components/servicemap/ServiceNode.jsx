import { statusOf } from './statusColors'
import { AlertTriangle, ShieldAlert } from 'lucide-react'

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
        <Icon size={r * 0.82} strokeWidth={1.75} style={{ color: status.color }} />
        {isBottleneck ? (
          <div
            className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-orange-500 text-white shadow-md ring-2 ring-white animate-pulse"
            title="Active Bottleneck Anomaly"
            style={{ width: 24, height: 24 }}
          >
            <AlertTriangle size={13} className="stroke-[2.5]" />
          </div>
        ) : isSPOF ? (
          <div
            className="absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white shadow-md ring-2 ring-white"
            title="Single Point of Failure (SPOF)"
            style={{ width: 24, height: 24 }}
          >
            <ShieldAlert size={13} className="stroke-[2.5]" />
          </div>
        ) : (
          <span
            className="absolute right-0 top-0 block rounded-full ring-2 ring-white"
            style={{ width: 11, height: 11, backgroundColor: status.color }}
          />
        )}
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
