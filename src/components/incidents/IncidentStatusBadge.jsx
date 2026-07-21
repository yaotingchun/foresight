import { Eye, Search, Wrench, CheckCircle2 } from 'lucide-react'
import { STATUS_META } from '../../data/simulationEngine'

const STATUS_ICONS = {
  detected: Eye,
  investigating: Search,
  mitigating: Wrench,
  resolved: CheckCircle2,
}

export default function IncidentStatusBadge({ status, size = 'md' }) {
  const meta = STATUS_META[status] ?? STATUS_META.detected
  const Icon = STATUS_ICONS[status] ?? Eye
  const isSm = size === 'sm'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wide
        ${isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'}`}
      style={{ backgroundColor: meta.tint, color: meta.color }}
    >
      <Icon size={isSm ? 10 : 12} className={status !== 'resolved' ? 'animate-pulse' : ''} />
      {meta.label}
    </span>
  )
}
