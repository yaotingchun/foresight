import { formatCompact } from './chartUtils'

/**
 * Busiest endpoints by share of live traffic. The bar encodes share; the
 * req/s figure is derived from the current total throughput.
 */
export default function TopEndpoints({ endpoints, throughput }) {
  const max = Math.max(...endpoints.map((e) => e.share))
  return (
    <ul className="space-y-3">
      {endpoints.map((e) => {
        const rps = Math.round((throughput * e.share) / 100)
        return (
          <li key={e.path}>
            <div className="mb-1 flex items-center gap-2">
              <code className="truncate font-mono text-xs text-ink-soft">{e.path}</code>
              <span className="ml-auto shrink-0 text-xs font-semibold tabular-nums text-ink">
                {formatCompact(rps)}
                <span className="font-normal text-ink-faint"> req/s</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-status-indigo transition-[width] duration-500"
                style={{ width: `${(e.share / max) * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
