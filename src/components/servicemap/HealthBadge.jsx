import { statusOf } from './statusColors'

export default function HealthBadge({ health }) {
  const status = statusOf(health)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: status.tint, color: status.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
      {status.label}
    </span>
  )
}
