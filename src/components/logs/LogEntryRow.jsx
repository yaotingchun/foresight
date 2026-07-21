import { useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Info,
  XOctagon,
  Wrench,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'

const SEVERITY_STYLES = {
  Info: 'text-status-blue bg-status-blue-tint',
  Warn: 'text-status-orange bg-status-orange-tint',
  Error: 'text-status-red bg-status-red-tint',
  Critical: 'text-status-purple bg-status-purple-tint',
}

const SEVERITY_ICONS = {
  Info: Info,
  Warn: AlertTriangle,
  Error: XOctagon,
  Critical: AlertCircle,
}

const TYPE_STYLES = {
  'System': 'bg-muted text-ink-soft',
  'IT-Anomaly': 'bg-status-orange-tint text-status-orange',
  'Financial-Anomaly': 'bg-status-red-tint text-status-red',
  'Remediation-Action': 'bg-status-blue-tint text-status-blue',
}

export default function LogEntryRow({ log, isNew }) {
  const [expanded, setExpanded] = useState(false)
  const isRemediation = log.type === 'Remediation-Action'
  const Icon = isRemediation ? Wrench : (SEVERITY_ICONS[log.severity] || Info)

  // Format timestamp (e.g., 14:32:01.123)
  const date = new Date(log.timestamp)
  const timeStr = date.toISOString().split('T')[1].replace('Z', '')

  return (
    <div
      className={`border-b border-line group transition-colors ${isNew ? 'animate-slide-fade' : ''
        } ${isRemediation ? 'border-l-4 border-l-status-blue bg-status-blue-tint/10' : 'hover:bg-muted/50'
        }`}
    >
      <div
        className="flex items-start px-4 py-2.5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 shrink-0 mt-0.5 text-ink-soft flex items-center justify-start">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        <div className="w-28 shrink-0 text-[13px] font-mono text-ink-soft mt-0.5">
          {timeStr}
        </div>

        <div className="w-24 shrink-0 flex items-center gap-1.5 mt-0.5">
          <div className={`flex items-center justify-center p-1 rounded ${SEVERITY_STYLES[log.severity]}`}>
            <Icon size={12} />
          </div>
          <span className="text-xs font-medium text-ink-soft uppercase tracking-wider">
            {log.severity}
          </span>
        </div>

        <div className="w-40 shrink-0 mt-0.5 pr-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[log.type]}`}>
            {log.type}
          </span>
        </div>

        <div className="w-40 shrink-0 text-[13px] font-medium text-ink truncate mt-0.5 pr-2">
          {log.sourceLabel}
        </div>

        <div className="flex-1 text-[13px] font-mono text-ink min-w-0 pr-4 mt-0.5 leading-relaxed">
          <span className="truncate block">
            {log.message}
          </span>
          {isRemediation && log.outcome && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`font-semibold ${log.outcome === 'Success' ? 'text-status-green' :
                  log.outcome === 'Failed' ? 'text-status-red' : 'text-status-orange'
                }`}>
                [{log.outcome}]
              </span>
              {log.retryCount > 0 && (
                <span className="text-ink-faint">
                  {log.retryCount} retries ({log.retryTimestamps.map(t => new Date(t).toLocaleTimeString()).join(', ')})
                </span>
              )}
            </div>
          )}
        </div>

        {log.incidentId && (
          <div className="shrink-0 mt-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-status-red-tint text-status-red text-[11px] font-bold cursor-pointer hover:bg-status-red hover:text-white transition-colors">
              ↳ Incident #{log.incidentId}
            </span>
          </div>
        )}
      </div>

      {expanded && (
        <div className="pl-[270px] pr-4 pb-4">
          <div className="bg-ink text-white p-4 rounded-md overflow-x-auto text-xs font-mono">
            <pre>{JSON.stringify(log.payload, null, 2)}</pre>
            {log.payload?.stackTrace && (
              <div className="mt-4 pt-4 border-t border-ink-soft text-status-red">
                <pre>{log.payload.stackTrace}</pre>
              </div>
            )}
          </div>
          {log.incidentId && log.incidentSummary && (
            <div className="mt-3 p-3 bg-status-red-tint/30 border border-status-red-tint rounded-md flex gap-4 text-sm">
              <div><span className="font-semibold text-ink-soft">Severity:</span> <span className="text-status-red font-bold">{log.incidentSummary.severity}</span></div>
              <div><span className="font-semibold text-ink-soft">Nodes:</span> {log.incidentSummary.nodesInvolved.join(', ')}</div>
              <div><span className="font-semibold text-ink-soft">Anomalies:</span> {log.incidentSummary.anomalies.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
