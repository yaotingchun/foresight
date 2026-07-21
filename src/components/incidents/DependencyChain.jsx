import { ArrowRight } from 'lucide-react'
import { statusOf } from '../servicemap/statusColors'

/** Renders a chain of components as connected pills, colored by health. */
export default function DependencyChain({ nodes, size = 'md' }) {
  const isSm = size === 'sm'
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {nodes.map((n, i) => {
        const status = statusOf(n.health)
        return (
          <span key={n.id} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg border font-mono font-medium
                ${isSm ? 'px-1.5 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[12.5px]'}`}
              style={{ borderColor: `${status.color}40`, backgroundColor: status.tint, color: status.color }}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
              {n.label ?? n.id}
            </span>
            {i < nodes.length - 1 && (
              <ArrowRight size={isSm ? 11 : 14} className="text-ink-faint shrink-0" />
            )}
          </span>
        )
      })}
    </div>
  )
}
