import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const KIND = {
  healthy: { Icon: CheckCircle2, color: '#22C55E', tint: '#DCFCE7' },
  warning: { Icon: AlertTriangle, color: '#F59E0B', tint: '#FEF3C7' },
  critical: { Icon: XCircle, color: '#EF4444', tint: '#FEE2E2' },
}

function ago(date) {
  const s = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

/** Rolling stream of system events, newest first, colour-coded by severity. */
export default function EventFeed({ events }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((e) => {
        const k = KIND[e.kind] || KIND.healthy
        return (
          <li key={e.id} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: k.tint }}
            >
              <k.Icon size={14} strokeWidth={2.2} style={{ color: k.color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-ink">{e.text}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                <span className="font-mono">{e.source}</span> · {ago(e.at)}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
