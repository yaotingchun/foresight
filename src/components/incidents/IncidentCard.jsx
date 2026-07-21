import { useEffect, useState } from 'react'
import { AlertTriangle, ShieldOff, Clock } from 'lucide-react'
import { deriveIncidentStatus, chainNodesFor } from '../../data/simulationEngine'
import IncidentStatusBadge from './IncidentStatusBadge'
import DependencyChain from './DependencyChain'

function fmtTime(ms) {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export default function IncidentCard({ incident, onClick }) {
  const [, setTock] = useState(0)
  const isLive = !incident.frozenStatus

  useEffect(() => {
    if (!isLive) return undefined
    const id = setInterval(() => setTock((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isLive])

  const status = deriveIncidentStatus(incident.stages, Date.now(), incident.frozenStatus)
  const nodes = chainNodesFor(incident)
  const { impact } = incident

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-2.5 rounded-xl border border-line bg-card p-4 text-left shadow-card
                 transition-colors hover:border-indigo-200 hover:bg-indigo-50/30"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold leading-snug text-ink">{incident.title}</h3>
        <IncidentStatusBadge status={status} />
      </div>

      <DependencyChain nodes={nodes} size="sm" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-faint">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {fmtTime(incident.runStart)}
        </span>
        {impact.txTotal > 0 && (
          <span className="flex items-center gap-1">
            <AlertTriangle size={11} className="text-amber-500" />
            {impact.txFlagged + impact.txBlocked} flagged/blocked tx
          </span>
        )}
        {impact.valueAtRisk > 0 && (
          <span className="flex items-center gap-1">
            <ShieldOff size={11} className="text-red-500" />
            {fmtMoney(impact.valueAtRisk)} at risk
          </span>
        )}
        {incident.stoppedEarly && (
          <span className="font-semibold text-amber-600">Stopped manually</span>
        )}
      </div>
    </button>
  )
}
