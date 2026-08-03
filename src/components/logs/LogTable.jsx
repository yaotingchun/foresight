import { useState, useEffect } from 'react'
import {
  ChevronRight,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowLeft,
  ArrowRight,
  Hash,
  Cpu,
  ArrowUp,
} from 'lucide-react'
import { serviceHealth } from '../../data/dataSource'
import { useSettings } from '../../context/SettingsContext'

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  error: {
    icon:        AlertCircle,
    label:       'ERROR',
    rowBg:       'bg-red-50/60 hover:bg-red-50',
    rowBorder:   'border-l-4 border-l-red-400',
    badge:       'bg-red-100 text-red-600',
    text:        'text-red-500',
    chainBg:     'bg-red-50',
    chainBorder: 'border border-red-100',
  },
  warn: {
    icon:        AlertTriangle,
    label:       'WARN',
    rowBg:       'bg-amber-50/60 hover:bg-amber-50',
    rowBorder:   'border-l-4 border-l-amber-400',
    badge:       'bg-amber-100 text-amber-600',
    text:        'text-amber-500',
    chainBg:     'bg-amber-50',
    chainBorder: 'border border-amber-100',
  },
  info: {
    icon:        Info,
    label:       'INFO',
    rowBg:       'hover:bg-muted/50',
    rowBorder:   'border-l-4 border-l-blue-300',
    badge:       'bg-blue-100 text-blue-600',
    text:        'text-blue-500',
    chainBg:     'bg-blue-50',
    chainBorder: 'border border-blue-100',
  },
}

function formatTimestamp(ts) {
  const d    = new Date(ts)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  const ms   = String(d.getMilliseconds()).padStart(3, '0')
  return { date, time, ms }
}

// ─── Service chip ──────────────────────────────────────────────────────────────
function ServiceChip({ name, variant = 'default' }) {
  const styles = {
    error:   'bg-red-100 text-red-700 border border-red-200',
    warn:    'bg-amber-100 text-amber-700 border border-amber-200',
    info:    'bg-blue-100 text-blue-700 border border-blue-200',
    default: 'bg-muted text-ink-soft border border-line',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${styles[variant]}`}>
      <Cpu size={10} />
      {name}
    </span>
  )
}

// ─── Affected service chain ────────────────────────────────────────────────────
function AffectedChain({ chain, status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.info
  if (!chain || chain.length === 0) return null
  return (
    <div className={`mt-2.5 px-3 py-2.5 rounded-xl ${cfg.chainBg} ${cfg.chainBorder} flex flex-col gap-2`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.text}`}>Affected Service Chain</p>
      <div className="flex flex-col gap-1.5">
        {chain.map((seg, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap">
            {seg.direction === 'upstream'
              ? <ArrowLeft  size={12} className="text-ink-faint shrink-0" />
              : <ArrowRight size={12} className="text-ink-faint shrink-0" />
            }
            <span className="text-[11px] text-ink-soft font-medium w-16 shrink-0">{seg.label}:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {seg.services.map((svc) => (
                <ServiceChip key={svc} name={svc} variant={seg.severity} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Threshold Evaluator Helper ───────────────────────────────────────────────
function evaluateThreshold(val, threshold) {
  const v = parseFloat(val)
  const t = parseFloat(threshold)
  if (isNaN(v) || isNaN(t)) {
    return { indicator: null, badgeStyle: null }
  }

  // 1. Strictly greater than threshold: "Above threshold"
  if (v > t) {
    return {
      indicator: '⚠ Above threshold',
      badgeStyle: 'above',
    }
  }

  // 2. Approaching threshold: within ~8% relative margin under threshold
  const margin = Math.max(0.04, t * 0.08)
  if (v >= t - margin) {
    return {
      indicator: '⚡ Approaching threshold',
      badgeStyle: 'approaching',
    }
  }

  // 3. Well below threshold: no badge at all
  return {
    indicator: null,
    badgeStyle: null,
  }
}

// ─── Operational Evidence Generator ─────────────────────────────────────────────
function getEvidenceForLog(log, thresholds = {}) {
  // INFO logs remain unchanged — no Evidence section rendered
  if (!log || log.status === 'info' || log.severity === 'info') {
    return null
  }

  const msg = (log.message || '').toLowerCase()
  const service = log.service || log.component_id || ''
  const svcMetrics = serviceHealth[service]?.metrics || {}

  // Rule-based thresholds from SettingsContext with prompt defaults
  const thresConnPool = thresholds.connectionPool ?? 95
  const thresCpu = thresholds.cpu ?? 85
  const thresMem = thresholds.memory ?? 90
  const thresLatency = thresholds.latency ?? 1000
  const thresErrorRate = thresholds.errorRate ?? 5
  const thresIsoForest = thresholds.isolationForest ?? 0.70

  // 1. Database Connection Pool Error
  if (
    msg.includes('db connection') ||
    msg.includes('connection from pool') ||
    msg.includes('deadlock') ||
    msg.includes('acquire db')
  ) {
    const connPoolVal = svcMetrics.rps ? Math.min(99, Math.round(93 + (svcMetrics.errorRate || 2) * 1.5)) : 98
    const retriesVal = svcMetrics.errorRate ? Math.round(svcMetrics.errorRate * 45 + 180) : 320
    const anomalyScore = parseFloat((0.83 + (log.status === 'error' ? 0.04 : 0.01)).toFixed(2))

    const connEval = evaluateThreshold(connPoolVal, thresConnPool)
    const isoEval = evaluateThreshold(anomalyScore, thresIsoForest)

    return [
      {
        name: 'Connection Pool Usage',
        value: `${connPoolVal}%`,
        threshold: `Threshold: ${thresConnPool}%`,
        indicator: connEval.indicator,
        badgeStyle: connEval.badgeStyle,
      },
      {
        name: 'Retry Count',
        value: `${retriesVal}`,
        threshold: '+280% vs 5-min average',
        indicator: '+280% vs 5-min avg',
        badgeStyle: 'delta',
      },
      {
        name: 'Anomaly Score',
        value: `${anomalyScore}`,
        threshold: `Isolation Forest (Threshold: ${thresIsoForest.toFixed(2)})`,
        indicator: isoEval.indicator,
        badgeStyle: isoEval.badgeStyle,
      },
    ]
  }

  // 2. Slow Query
  if (msg.includes('slow query') || msg.includes('query latency')) {
    const latencyVal = svcMetrics.latency ? Math.round(svcMetrics.latency * 2.8 + 180) : 450
    const p95Baseline = Math.round(latencyVal * 0.27) || 120
    const rpsVal = svcMetrics.rps ? Math.round(svcMetrics.rps) : 45
    const pctDiff = Math.round(((latencyVal - p95Baseline) / p95Baseline) * 100)
    const latEval = evaluateThreshold(latencyVal, p95Baseline)

    return [
      {
        name: 'Query Latency',
        value: `${latencyVal} ms`,
        threshold: `p95 Baseline: ${p95Baseline} ms`,
        indicator: latEval.indicator || `+${pctDiff}% vs baseline`,
        badgeStyle: latEval.badgeStyle || 'delta',
      },
      {
        name: 'p95 Baseline',
        value: `${p95Baseline} ms`,
        threshold: 'Historical p95',
        indicator: 'Normal baseline',
        badgeStyle: 'delta',
      },
      {
        name: 'Request/sec',
        value: `${rpsVal} RPS`,
        threshold: `Baseline: ${Math.round(rpsVal * 1.05)} RPS`,
        indicator: 'Normal',
        badgeStyle: 'delta',
      },
    ]
  }

  // 3. Timeout Error
  if (
    msg.includes('timeout') ||
    msg.includes('503') ||
    msg.includes('circuit breaker') ||
    msg.includes('retry limit') ||
    msg.includes('degraded') ||
    msg.includes('not responding')
  ) {
    const latVal = svcMetrics.latency ? Math.round(svcMetrics.latency * 12 + 600) : 2400
    const errVal = svcMetrics.errorRate ? (svcMetrics.errorRate * 4 + 10).toFixed(1) : '18.5'
    const timeoutCount = Math.round((parseFloat(errVal) || 15) * 2.4) || 42

    const latEval = evaluateThreshold(latVal, thresLatency)
    const timeoutEval = evaluateThreshold(timeoutCount, 10)
    const errEval = evaluateThreshold(parseFloat(errVal), thresErrorRate)

    return [
      {
        name: 'Response Latency',
        value: `${latVal.toLocaleString()} ms`,
        threshold: `p95 Baseline: ${thresLatency} ms`,
        indicator: latEval.indicator,
        badgeStyle: latEval.badgeStyle,
      },
      {
        name: 'Timeout Count',
        value: `${timeoutCount} / min`,
        threshold: 'Threshold: 10 / min',
        indicator: timeoutEval.indicator,
        badgeStyle: timeoutEval.badgeStyle,
      },
      {
        name: 'Error Rate',
        value: `${errVal}%`,
        threshold: `Threshold: ${thresErrorRate}%`,
        indicator: errEval.indicator,
        badgeStyle: errEval.badgeStyle,
      },
    ]
  }

  // 4. CPU-related Alert
  if (msg.includes('cpu') || msg.includes('scaling in progress')) {
    const cpuVal = svcMetrics.rps ? Math.min(99, Math.round(89 + (svcMetrics.errorRate || 1) * 2)) : 96
    const anomalyScore = parseFloat((0.81 + (log.status === 'error' ? 0.06 : 0.02)).toFixed(2))

    const cpuEval = evaluateThreshold(cpuVal, thresCpu)
    const isoEval = evaluateThreshold(anomalyScore, thresIsoForest)

    return [
      {
        name: 'CPU Utilization',
        value: `${cpuVal}%`,
        threshold: `Threshold: ${thresCpu}%`,
        indicator: cpuEval.indicator,
        badgeStyle: cpuEval.badgeStyle,
      },
      {
        name: 'Load Average',
        value: '4.8',
        threshold: 'Baseline: 1.5',
        indicator: '+220% vs baseline',
        badgeStyle: 'delta',
      },
      {
        name: 'Anomaly Score',
        value: `${anomalyScore}`,
        threshold: `Isolation Forest (Threshold: ${thresIsoForest.toFixed(2)})`,
        indicator: isoEval.indicator,
        badgeStyle: isoEval.badgeStyle,
      },
    ]
  }

  // 5. Memory Alert
  if (
    msg.includes('memory') ||
    msg.includes('oomkilled') ||
    msg.includes('heap') ||
    msg.includes('leak')
  ) {
    const memVal = svcMetrics.rps ? Math.min(99, Math.round(92 + (svcMetrics.errorRate || 1) * 1.5)) : 97
    const memEval = evaluateThreshold(memVal, thresMem)

    return [
      {
        name: 'Memory Usage',
        value: `${memVal}%`,
        threshold: `Threshold: ${thresMem}%`,
        indicator: memEval.indicator,
        badgeStyle: memEval.badgeStyle,
      },
      {
        name: 'Available Memory',
        value: '128 MB',
        threshold: 'Baseline: 2.0 GB',
        indicator: '⚠ Depleted',
        badgeStyle: 'above',
      },
      {
        name: 'Swap Usage',
        value: 'Metric unavailable',
        threshold: 'N/A',
        indicator: '',
        badgeStyle: null,
      },
    ]
  }

  // 6. Queue Depth Alert
  if (msg.includes('queue depth') || msg.includes('queue')) {
    const qEval = evaluateThreshold(94, 80)
    const isoEval = evaluateThreshold(0.78, thresIsoForest)
    return [
      {
        name: 'Queue Depth',
        value: '94%',
        threshold: 'Threshold: 80%',
        indicator: qEval.indicator,
        badgeStyle: qEval.badgeStyle,
      },
      {
        name: 'Processing Rate',
        value: '120 msg/s',
        threshold: 'Baseline: 500 msg/s',
        indicator: '-76% vs baseline',
        badgeStyle: 'delta',
      },
      {
        name: 'Anomaly Score',
        value: '0.78',
        threshold: `Isolation Forest (Threshold: ${thresIsoForest.toFixed(2)})`,
        indicator: isoEval.indicator,
        badgeStyle: isoEval.badgeStyle,
      },
    ]
  }

  // 7. Cache Miss Rate Alert
  if (msg.includes('cache miss') || msg.includes('cache')) {
    const cacheEval = evaluateThreshold(42, 5)
    const latEval = evaluateThreshold(320, 40)
    const isoEval = evaluateThreshold(0.74, thresIsoForest)
    return [
      {
        name: 'Cache Miss Rate',
        value: '42%',
        threshold: 'Baseline: 5%',
        indicator: cacheEval.indicator,
        badgeStyle: cacheEval.badgeStyle,
      },
      {
        name: 'Response Latency',
        value: '320 ms',
        threshold: 'p95 Baseline: 40 ms',
        indicator: latEval.indicator,
        badgeStyle: latEval.badgeStyle,
      },
      {
        name: 'Anomaly Score',
        value: '0.74',
        threshold: `Isolation Forest (Threshold: ${thresIsoForest.toFixed(2)})`,
        indicator: isoEval.indicator,
        badgeStyle: isoEval.badgeStyle,
      },
    ]
  }

  // Generic WARN/ERROR log fallback
  if (svcMetrics && (svcMetrics.latency || svcMetrics.errorRate)) {
    const latVal = Math.round(svcMetrics.latency * 2.5 || 450)
    const errVal = parseFloat(((svcMetrics.errorRate || 1.2) * 2.5).toFixed(1))
    const anomalyVal = 0.76

    const latEval = evaluateThreshold(latVal, thresLatency)
    const errEval = evaluateThreshold(errVal, thresErrorRate)
    const isoEval = evaluateThreshold(anomalyVal, thresIsoForest)

    return [
      {
        name: 'Response Latency',
        value: `${latVal} ms`,
        threshold: `p95 Baseline: ${thresLatency} ms`,
        indicator: latEval.indicator,
        badgeStyle: latEval.badgeStyle,
      },
      {
        name: 'Error Rate',
        value: `${errVal}%`,
        threshold: `Threshold: ${thresErrorRate}%`,
        indicator: errEval.indicator,
        badgeStyle: errEval.badgeStyle,
      },
      {
        name: 'Anomaly Score',
        value: `${anomalyVal}`,
        threshold: `Isolation Forest (Threshold: ${thresIsoForest.toFixed(2)})`,
        indicator: isoEval.indicator,
        badgeStyle: isoEval.badgeStyle,
      },
    ]
  }

  return null
}

// ─── Evidence block ────────────────────────────────────────────────────────────
function EvidenceBlock({ evidence, status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.info
  if (!evidence || evidence.length === 0) return null

  return (
    <div className={`mt-2.5 px-3 py-2.5 rounded-xl ${cfg.chainBg} ${cfg.chainBorder} flex flex-col gap-2`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${cfg.text}`}>EVIDENCE</p>
      <div className="flex flex-col gap-1.5 font-mono">
        {evidence.map((item, idx) => {
          let badgeClass = `${cfg.badge} font-bold`
          if (item.badgeStyle === 'approaching') {
            badgeClass = 'bg-amber-100/90 text-amber-700 border border-amber-300/60 font-bold'
          }

          return (
            <div key={idx} className="flex items-center gap-3 text-xs py-0.5 flex-wrap">
              <span className="text-ink font-semibold w-48 shrink-0">{item.name}:</span>
              <span
                className={`font-bold min-w-[55px] ${
                  item.value === 'Metric unavailable' ? 'text-ink-faint italic font-normal' : 'text-ink'
                }`}
              >
                {item.value}
              </span>
              {item.threshold && (
                <span className="text-[11px] text-ink-faint">({item.threshold})</span>
              )}
              {item.indicator && item.value !== 'Metric unavailable' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeClass}`}>
                  {item.indicator}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getMetricPreview(evidence) {
  if (!evidence || evidence.length === 0) return null
  const first = evidence[0]
  if (!first || !first.name || !first.value || first.value === 'Metric unavailable') return null

  const shortNames = {
    'Connection Pool Usage': 'Pool',
    'Query Latency': 'Latency',
    'Response Latency': 'Latency',
    'CPU Utilization': 'CPU',
    'Memory Usage': 'Memory',
    'Queue Depth': 'Queue',
    'Cache Miss Rate': 'Cache Miss',
  }
  const label = shortNames[first.name] || first.name
  return `${label}: ${first.value}`
}

// ─── Single log row ────────────────────────────────────────────────────────────
function LogRow({ log, isNew, isFlash }) {
  const [expanded, setExpanded] = useState(false)
  const { thresholds } = useSettings()
  const cfg  = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.info
  const Icon = cfg.icon
  const { date, time, ms } = formatTimestamp(log.timestamp)
  const hasChain = log.affectedChain?.length > 0
  const evidence = getEvidenceForLog(log, thresholds)
  const metricPreview = getMetricPreview(evidence)

  return (
    <div
      className={`border-b border-line transition-colors ${cfg.rowBorder}
        ${isNew   ? 'animate-slide-fade' : ''}
        ${isFlash ? 'animate-log-flash'  : cfg.rowBg}`}
    >
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Toggle */}
        <div className="shrink-0 mt-0.5 text-ink-faint">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Timestamp */}
        <div className="w-36 shrink-0">
          <div className="text-[11px] font-mono text-ink-soft leading-tight">{date}</div>
          <div className="text-[12px] font-mono text-ink leading-tight">
            {time}<span className="text-ink-faint">.{ms}</span>
          </div>
        </div>

        {/* Status */}
        <div className="w-20 shrink-0 mt-0.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest uppercase ${cfg.badge}`}>
            <Icon size={10} />
            {cfg.label}
          </span>
        </div>

        {/* Service */}
        <div className="w-40 shrink-0 mt-0.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-line text-[11px] font-mono font-medium text-ink truncate max-w-full">
            <Cpu size={10} className="text-ink-faint shrink-0" />
            <span className="truncate">{log.service}</span>
          </span>
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0 mt-0.5">
          <p className="text-[13px] text-ink font-mono leading-relaxed truncate">{log.message}</p>
        </div>

        {/* Inline Metric Preview (for collapsed ERROR/WARN rows with Evidence) */}
        {metricPreview && !expanded && (
          <div className="shrink-0 mt-0.5 text-[11px] font-mono text-ink-faint">
            {metricPreview}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 ml-[30px]">
          <div className="flex items-center gap-4 mb-2.5 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1">
              <Hash size={10} />
              Trace: <span className="font-mono text-ink-soft ml-0.5">{log.traceId}</span>
            </span>
            <span className="flex items-center gap-1">
              <Hash size={10} />
              Span: <span className="font-mono text-ink-soft ml-0.5">{log.spanId}</span>
            </span>
          </div>
          <div className="bg-ink rounded-xl p-3.5 text-xs font-mono text-slate-300 leading-relaxed overflow-x-auto">
            <span className={`${cfg.text} font-bold`}>[{cfg.label}]</span>{' '}
            <span className="text-slate-400">{new Date(log.timestamp).toISOString()}</span>{' '}
            <span className="text-white">{log.service}</span>{' '}
            <span>{log.message}</span>
          </div>
          {hasChain && <AffectedChain chain={log.affectedChain} status={log.status} />}
          {evidence && <EvidenceBlock evidence={evidence} status={log.status} />}
        </div>
      )}
    </div>
  )
}

// ─── Sticky table header ───────────────────────────────────────────────────────
function TableHeader() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b-2 border-line bg-muted/70 sticky top-0 z-10">
      <div className="w-[14px] shrink-0" />
      <div className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Timestamp</div>
      <div className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Status</div>
      <div className="w-40 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Service</div>
      <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Message</div>
    </div>
  )
}

// ─── Main export ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

export default function LogTable({ logs, newIds = new Set() }) {
  const [page, setPage] = useState(0)

  // Track cumulative "new entries" while user is off page 0
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (newIds.size === 0) return
    if (page === 0) {
      // Already on first page — no banner needed
      setPendingCount(0)
    } else {
      // Accumulate so user knows how many arrived
      setPendingCount((n) => n + newIds.size)
    }
  }, [newIds, page])

  // Jump to top resets pending
  function jumpToTop() {
    setPage(0)
    setPendingCount(0)
  }

  // When filters change logs array identity, reset to page 0
  useEffect(() => {
    setPage(0)
    setPendingCount(0)
  }, [logs.length === 0 ? null : logs[logs.length - 1]?.id])

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE))
  const visible    = logs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <TableHeader />

      {/* "New entries" jump-to-top banner */}
      {pendingCount > 0 && page > 0 && (
        <button
          onClick={jumpToTop}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-indigo-500 text-white text-xs font-semibold
                     hover:bg-indigo-600 transition-colors animate-slide-fade"
        >
          <ArrowUp size={12} />
          {pendingCount} new {pendingCount === 1 ? 'entry' : 'entries'} — jump to latest
        </button>
      )}

      {/* Rows */}
      <div>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-faint gap-2">
            <Info size={32} className="opacity-40" />
            <p className="text-sm">No log entries match the current filters.</p>
          </div>
        ) : (
          visible.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              isNew={page === 0 && newIds.has(log.id)}
              isFlash={page === 0 && newIds.has(log.id)}
            />
          ))
        )}
      </div>

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-card shrink-0">
          <span className="text-xs text-ink-faint">
            Showing{' '}
            <span className="font-medium text-ink">{page * PAGE_SIZE + 1}</span>–
            <span className="font-medium text-ink">{Math.min((page + 1) * PAGE_SIZE, logs.length)}</span>
            {' '}of <span className="font-medium text-ink">{logs.length.toLocaleString()}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => { setPage(0); setPendingCount(0) }}
              disabled={page === 0}
              className="px-2 py-1 rounded-lg text-xs text-ink-soft hover:bg-muted disabled:opacity-30 transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>

            {/* Page number buttons — windowed to 7 */}
            {(() => {
              const start = Math.max(0, Math.min(page - 3, totalPages - 7))
              const end   = Math.min(totalPages, start + 7)
              return Array.from({ length: end - start }, (_, i) => start + i).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); if (p === 0) setPendingCount(0) }}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                    ${p === page ? 'bg-indigo-500 text-white' : 'hover:bg-muted text-ink-soft'}`}
                >
                  {p + 1}
                </button>
              ))
            })()}

            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage(totalPages - 1)}
              disabled={page === totalPages - 1}
              className="px-2 py-1 rounded-lg text-xs text-ink-soft hover:bg-muted disabled:opacity-30 transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
