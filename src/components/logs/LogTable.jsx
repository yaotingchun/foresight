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

// ─── Single log row ────────────────────────────────────────────────────────────
function LogRow({ log, isNew, isFlash }) {
  const [expanded, setExpanded] = useState(false)
  const cfg  = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.info
  const Icon = cfg.icon
  const { date, time, ms } = formatTimestamp(log.timestamp)
  const hasChain = log.affectedChain?.length > 0

  return (
    <div
      className={`border-b border-line transition-colors ${cfg.rowBorder}
        ${isNew   ? 'animate-slide-fade' : ''}
        ${isFlash ? 'animate-log-flash'  : cfg.rowBg}`}
    >
      <div
        className="flex items-start gap-3 px-4 py-2.5 cursor-pointer"
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

        {hasChain && (
          <div className="shrink-0 mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.badge} opacity-80`}>chain ↓</span>
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
          visible.map((log, i) => (
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
