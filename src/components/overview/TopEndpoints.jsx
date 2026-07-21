import { formatCompact } from './chartUtils'

/**
 * Busiest endpoints by share of live traffic. The bar encodes share; the
 * req/s figure is derived from the current total throughput.
 */
export default function TopEndpoints({ endpoints, throughput }) {
  const max = Math.max(...endpoints.map((e) => e.share))
  return (
    <ul className="space-y-3.5">
      {endpoints.map((e) => {
        const rps = Math.round((throughput * e.share) / 100)
        return (
          <li key={e.path} className="group">
            <div className="mb-2 flex items-center justify-between gap-3">
              <code className="max-w-[75%] truncate font-mono text-[10px] font-semibold text-indigo-600 bg-indigo-50/40 border border-indigo-100/30 rounded-lg px-2.5 py-1 transition-colors duration-200 group-hover:bg-indigo-50 group-hover:border-indigo-100/50">
                {e.path}
              </code>
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-700">
                {formatCompact(rps)}
                <span className="text-[10px] font-semibold text-slate-400"> req/s</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100/80 border border-slate-200/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-[width] duration-500 ease-out"
                style={{ width: `${(e.share / max) * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
