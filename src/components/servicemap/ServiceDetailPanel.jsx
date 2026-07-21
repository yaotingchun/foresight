import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import HealthBadge from './HealthBadge'
import Sparkline from './Sparkline'
import { statusOf } from './statusColors'
import { upstreamIdsOf, downstreamIdsOf } from '../../data/serviceMapData'

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-line bg-page/60 px-3 py-2">
      <div className="text-[11px] font-medium text-ink-faint">{label}</div>
      <div className="text-[16px] font-bold" style={{ color: tone ?? '#0F172A' }}>
        {value}
      </div>
    </div>
  )
}

function DepRow({ node, direction }) {
  const status = statusOf(node.health)
  const Arrow = direction === 'up' ? ArrowDownLeft : ArrowUpRight
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Arrow size={14} className="text-ink-faint" />
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
      <span className="truncate text-[12.5px] text-ink-soft">{node.label}</span>
    </div>
  )
}

/** Right-hand inspector. Rendered mounted at all times; slides via translate. */
export default function ServiceDetailPanel({ nodeId, nodeById, onClose }) {
  const node = nodeId ? nodeById[nodeId] : null
  const open = Boolean(node)
  const status = node ? statusOf(node.health) : null

  const upstream = node ? upstreamIdsOf(node.id).map((id) => nodeById[id]).filter(Boolean) : []
  const downstream = node ? downstreamIdsOf(node.id).map((id) => nodeById[id]).filter(Boolean) : []

  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-40 h-full w-[300px] p-3"
      style={{
        transform: open ? 'translateX(0)' : 'translateX(110%)',
        transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {node && (
        <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]">
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: status.tint }}
              >
                <node.icon size={20} strokeWidth={1.75} style={{ color: status.color }} />
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink">{node.label}</div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                  {node.kind}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-muted"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <HealthBadge health={node.health} />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Metric label="Requests / sec" value={node.metrics.rps.toLocaleString()} />
              <Metric
                label="p95 Latency"
                value={`${node.metrics.latency} ms`}
                tone={node.metrics.latency > 200 ? '#EF4444' : node.metrics.latency > 100 ? '#F59E0B' : undefined}
              />
              <Metric
                label="Error Rate"
                value={`${node.metrics.errorRate}%`}
                tone={node.metrics.errorRate > 5 ? '#EF4444' : node.metrics.errorRate > 1 ? '#F59E0B' : undefined}
              />
              <Metric label="Uptime" value={`${node.metrics.uptime}%`} />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Throughput (last 15m)
              </div>
              <Sparkline data={node.metrics.spark} color={status.color} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Upstream ({upstream.length})
                </div>
                {upstream.length ? (
                  upstream.map((n) => <DepRow key={n.id} node={n} direction="up" />)
                ) : (
                  <div className="py-1.5 text-[12.5px] text-ink-faint">No callers</div>
                )}
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Downstream ({downstream.length})
                </div>
                {downstream.length ? (
                  downstream.map((n) => <DepRow key={n.id} node={n} direction="down" />)
                ) : (
                  <div className="py-1.5 text-[12.5px] text-ink-faint">No dependencies</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
