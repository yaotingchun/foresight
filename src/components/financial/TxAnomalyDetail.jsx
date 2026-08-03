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

function RoutingCallout({ recAction }) {
  if (recAction === 'approve') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
        <CheckCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-emerald-900">Recommended path: Approve</p>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
            Correlated with known infrastructure incident. Safe to approve and clear transaction — root cause is system retry-storm.
          </p>
        </div>
      </div>
    )
  }

  if (recAction === 'block') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
        <XCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] font-bold text-red-900">Recommended path: Block</p>
          <p className="text-[11px] text-red-700 mt-0.5 leading-snug">
            High fraud risk confidence (≥ 0.75) with no infra correlation. Policy recommends blocking transaction.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <ArrowUpRight size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-[12px] font-bold text-amber-900">Recommended path: Escalate</p>
        <p className="text-[11px] text-amber-700 mt-0.5 leading-snug">
          No infra incident correlation. Escalate for manual analyst review and account velocity check.
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

  let recAction = 'escalate'
  if (isInfra) {
    recAction = 'approve'
  } else if (tx.status === 'blocked' || tx.anomalyScore >= 0.75) {
    recAction = 'block'
  } else {
    recAction = 'escalate'
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-4 pt-1 ml-9">
      {/* Score bar */}
      <ScoreBar score={tx.anomalyScore} />

      {/* Dominant feature */}
      {feature && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{feature.icon}</span>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mr-2">
                Dominant trigger:
              </span>
              <span className="text-[12px] font-semibold text-ink">{feature.label}</span>
            </div>
          </div>
          
          {/* AI Explanation block */}
          {tx.mlExplanation && (
            <div className="mt-1 ml-7 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
              <Zap size={14} className="text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 mb-0.5">
                  AI Explanation
                </p>
                <p className="text-[12.5px] leading-relaxed text-indigo-950">
                  {tx.mlExplanation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Infra correlation */}
      <InfraCorrelationBadge correlation={tx.infraCorrelation} />

      {/* Routing callout */}
      <RoutingCallout recAction={recAction} isInfra={isInfra} />

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint mr-1">
          Actions:
        </span>
        <button
          onClick={() => onAction(tx.id, 'approve')}
          style={{
            backgroundColor: recAction === 'approve' ? '#D1FAE5' : '#ECFDF5',
            color: '#047857',
            borderColor: recAction === 'approve' ? '#059669' : '#A7F3D0',
            borderWidth: recAction === 'approve' ? '2px' : '1px',
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
            recAction === 'approve' ? 'font-bold shadow-sm hover:bg-emerald-200/60' : 'font-semibold hover:bg-emerald-100 opacity-75'
          }`}
        >
          <CheckCircle size={12} />
          Approve
        </button>
        <button
          onClick={() => onAction(tx.id, 'block')}
          style={{
            backgroundColor: recAction === 'block' ? '#FEE2E2' : '#FEF2F2',
            color: '#B91C1C',
            borderColor: recAction === 'block' ? '#DC2626' : '#FECACA',
            borderWidth: recAction === 'block' ? '2px' : '1px',
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
            recAction === 'block' ? 'font-bold shadow-sm hover:bg-red-200/60' : 'font-semibold hover:bg-red-100 opacity-75'
          }`}
        >
          <XCircle size={12} />
          Block
        </button>
        <button
          onClick={() => onAction(tx.id, 'escalate')}
          style={{
            backgroundColor: recAction === 'escalate' ? '#FEF3C7' : '#FFFBEB',
            color: '#B45309',
            borderColor: recAction === 'escalate' ? '#D97706' : '#FDE68A',
            borderWidth: recAction === 'escalate' ? '2px' : '1px',
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
            recAction === 'escalate' ? 'font-bold shadow-sm hover:bg-amber-200/60' : 'font-semibold hover:bg-amber-100 opacity-75'
          }`}
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
