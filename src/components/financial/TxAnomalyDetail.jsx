/**
 * TxAnomalyDetail
 *
 * Expanded anomaly detail panel shown inside a flagged/blocked transaction row:
 *  - Confidence score bar
 *  - Dominant trigger feature
 *  - Infra correlation indicator (the topology-awareness differentiator)
 *  - Routing callout: fraud → block/review path | infra → "likely duplicate" path
 *  - Action buttons: approve / block / escalate
 *  - Action history log
 */
import {
  ShieldAlert, Zap, Info, CheckCircle, XCircle, ArrowUpRight,
  Clock, User, AlertTriangle, ServerCrash,
} from 'lucide-react'

function ScoreBar({ score }) {
  const pct  = Math.round(score * 100)
  const color = score >= 0.75 ? '#EF4444' : score >= 0.55 ? '#F59E0B' : '#3B82F6'
  const label = score >= 0.75 ? 'High risk' : score >= 0.55 ? 'Medium risk' : 'Low-medium risk'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Anomaly confidence
        </span>
        <span className="text-[12px] font-bold tabular-nums" style={{ color }}>
          {pct}% · {label}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function InfraCorrelationBadge({ correlation }) {
  if (!correlation) return null
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <ServerCrash size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-amber-800">
          ⚠ Correlated with infra incident
        </p>
        <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
          <span className="font-mono font-semibold">{correlation.label}</span>
          {' '}(t={correlation.tStart}s – {correlation.tEnd}s) ·{' '}
          severity: <span className="font-semibold">{correlation.severity}</span>
        </p>
        <p className="text-[11px] text-amber-600 mt-1">
          This anomaly occurred during a known infrastructure fault. It may be a{' '}
          <strong>retry-storm duplicate charge</strong>, not genuine fraud.
        </p>
      </div>
    </div>
  )
}

function RoutingCallout({ isInfra }) {
  if (isInfra) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3">
        <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-sky-800">Recommended path: Infra triage</p>
          <p className="text-[11px] text-sky-700 mt-0.5 leading-snug">
            Verify against transaction ID for duplicates before taking action.
            Do <em>not</em> treat customer as suspicious — root cause is infrastructure.
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
      <ShieldAlert size={15} className="text-red-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-[12px] font-bold text-red-800">Recommended path: Fraud review</p>
        <p className="text-[11px] text-red-700 mt-0.5 leading-snug">
          No infra incident correlation. Escalate or block pending manual review.
          Consider account-level velocity check.
        </p>
      </div>
    </div>
  )
}

function ActionHistory({ history }) {
  if (!history?.length) {
    return (
      <p className="text-[11px] text-ink-faint italic">No actions taken yet.</p>
    )
  }
  const ACTION_COLORS = {
    approve:  'text-emerald-600',
    block:    'text-red-600',
    escalate: 'text-amber-600',
  }
  return (
    <div className="flex flex-col gap-1.5">
      {history.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <Clock size={10} className="text-ink-faint shrink-0" />
          <span className="text-ink-faint">{new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}</span>
          <span className={`font-semibold capitalize ${ACTION_COLORS[entry.action] ?? 'text-ink'}`}>
            {entry.action}
          </span>
          <User size={10} className="text-ink-faint shrink-0" />
          <span className="text-ink-soft font-mono">{entry.analyst}</span>
        </div>
      ))}
    </div>
  )
}

export default function TxAnomalyDetail({ tx, onAction }) {
  const isInfra = !!tx.infraCorrelation
  const feature = tx.dominantFeature

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-1 ml-9">
      {/* Score bar */}
      <ScoreBar score={tx.anomalyScore} />

      {/* Dominant feature */}
      {feature && (
        <div className="flex items-center gap-2">
          <span className="text-base">{feature.icon}</span>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mr-2">
              Dominant trigger:
            </span>
            <span className="text-[12px] font-semibold text-ink">{feature.label}</span>
          </div>
        </div>
      )}

      {/* Infra correlation */}
      <InfraCorrelationBadge correlation={tx.infraCorrelation} />

      {/* Routing callout */}
      <RoutingCallout isInfra={isInfra} />

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mr-1">
          Actions:
        </span>
        <button
          onClick={() => onAction(tx.id, 'approve')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700
                     border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
        >
          <CheckCircle size={12} />
          Approve
        </button>
        <button
          onClick={() => onAction(tx.id, 'block')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700
                     border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
        >
          <XCircle size={12} />
          Block
        </button>
        <button
          onClick={() => onAction(tx.id, 'escalate')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700
                     border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
        >
          <ArrowUpRight size={12} />
          Escalate
        </button>
      </div>

      {/* Action history */}
      {tx.actionHistory?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Action history
          </span>
          <ActionHistory history={tx.actionHistory} />
        </div>
      )}
    </div>
  )
}
