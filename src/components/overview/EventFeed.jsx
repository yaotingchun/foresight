import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

const KIND = {
  healthy: { Icon: CheckCircle2, color: '#10B981', tint: '#E6F4EA', border: 'border-l-emerald-500' },
  warning: { Icon: AlertTriangle, color: '#F59E0B', tint: '#FEF3C7', border: 'border-l-amber-500' },
  critical: { Icon: XCircle, color: '#EF4444', tint: '#FEE2E2', border: 'border-l-rose-500' },
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
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {events.map((e) => {
        const k = KIND[e.kind] || KIND.healthy
        return (
          <li 
            key={e.id} 
            className={`flex items-start gap-3 rounded-xl border border-slate-100 border-l-4 bg-slate-50/20 px-3.5 py-3 hover:border-slate-200/80 hover:bg-slate-50/50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.015)] hover:translate-x-0.5 transition-all duration-200 ${k.border}`}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${k.color}12` }}
            >
              <k.Icon size={14} strokeWidth={2.2} style={{ color: k.color }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">{e.text}</p>
              <p className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                <span className="font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-100/60 border border-slate-200/30 px-1.5 py-0.5 rounded-md">
                  {e.source}
                </span>
                <span>·</span>
                <span>{ago(e.at)}</span>
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
