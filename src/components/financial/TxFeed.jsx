/**
 * TxFeed
 *
 * The main live-scrolling transaction table with:
 *  - Status column (normal / flagged / blocked) with visually distinct row styles
 *  - Category badge for flagged rows: FRAUD (red) vs INFRA-INDUCED (amber)
 *  - Expandable detail panel (TxAnomalyDetail)
 *  - Pagination + "new entries" jump-to-top
 */
import { useState, useEffect } from 'react'
import {
  ChevronRight, ChevronDown, CheckCircle, AlertTriangle,
  XCircle, ArrowUp, ArrowRight, Building2, ServerCrash,
} from 'lucide-react'
import TxAnomalyDetail from './TxAnomalyDetail'

// ─── Visual config per status ────────────────────────────────────────────────
const STATUS_CONFIG = {
  normal: {
    icon:      CheckCircle,
    label:     'NORMAL',
    rowBorder: 'border-l-4 border-l-emerald-300',
    rowBg:     'hover:bg-muted/40',
    badge:     'bg-emerald-100 text-emerald-700',
    dot:       'bg-emerald-400',
  },
  flagged: {
    icon:      AlertTriangle,
    label:     'FLAGGED',
    rowBorder: 'border-l-4 border-l-amber-400',
    rowBg:     'bg-amber-50/60 hover:bg-amber-50',
    badge:     'bg-amber-100 text-amber-700',
    dot:       'bg-amber-400',
  },
  blocked: {
    icon:      XCircle,
    label:     'BLOCKED',
    rowBorder: 'border-l-4 border-l-red-500',
    rowBg:     'bg-red-50/60 hover:bg-red-50',
    badge:     'bg-red-100 text-red-700',
    dot:       'bg-red-500',
  },
}

function fmtAmount(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtTs(ts) {
  const d = new Date(ts)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    ms:   String(d.getMilliseconds()).padStart(3, '0'),
  }
}

function TypeChip({ type }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted border border-line
                     text-[10px] font-mono font-medium text-ink-soft truncate max-w-[120px]">
      {type.replace(/_/g, ' ')}
    </span>
  )
}

function AccountChip({ id }) {
  const isExt = id.startsWith('EXT-') || id.startsWith('MERCH-')
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium
      ${isExt
        ? 'bg-purple-50 text-purple-700 border border-purple-200'
        : 'bg-muted text-ink-soft border border-line'}`}>
      <Building2 size={9} />
      {id}
    </span>
  )
}

// ─── Category badge (the key differentiator) ──────────────────────────────────
function CategoryBadge({ tx }) {
  if (tx.status === 'normal') return null
  const isInfra = !!tx.infraCorrelation

  if (isInfra) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                       bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold">
        <ServerCrash size={9} />
        INFRA
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
                     bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold">
      <AlertTriangle size={9} />
      FRAUD
    </span>
  )
}

// ─── Single transaction row ───────────────────────────────────────────────────
function TxRow({ tx, isNew, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.normal
  const Icon = cfg.icon
  const { date, time, ms } = fmtTs(tx.timestamp)
  const canExpand = tx.status !== 'normal' || tx.actionHistory?.length > 0

  return (
    <div
      className={`border-b border-line transition-colors ${cfg.rowBorder}
        ${isNew ? 'animate-slide-fade' : ''}
        ${expanded ? '' : cfg.rowBg}`}
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 ${canExpand ? 'cursor-pointer' : ''}`}
        onClick={() => canExpand && setExpanded((v) => !v)}
      >
        {/* Expand toggle */}
        <div className="w-4 shrink-0 text-ink-faint">
          {canExpand
            ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
            : <span className="inline-block w-4" />
          }
        </div>

        {/* Timestamp */}
        <div className="w-32 shrink-0">
          <div className="text-[10px] font-mono text-ink-faint leading-tight">{date}</div>
          <div className="text-[12px] font-mono text-ink leading-tight">
            {time}<span className="text-ink-faint">.{ms}</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="w-24 shrink-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                           text-[10px] font-bold tracking-widest uppercase ${cfg.badge}`}>
            <Icon size={9} />
            {cfg.label}
          </span>
        </div>

        {/* Amount */}
        <div className="w-28 shrink-0">
          <span className={`text-[13px] font-bold tabular-nums
            ${tx.status === 'blocked' ? 'text-red-600'
            : tx.status === 'flagged' ? 'text-amber-700'
            : 'text-ink'}`}>
            {fmtAmount(tx.amount)}
          </span>
        </div>

        {/* Type */}
        <div className="w-32 shrink-0">
          <TypeChip type={tx.type} />
        </div>

        {/* Source → Dest */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          <AccountChip id={tx.src} />
          <ArrowRight size={12} className="text-ink-faint shrink-0" />
          <AccountChip id={tx.dst} />
        </div>

        {/* Category badge */}
        <div className="shrink-0">
          <CategoryBadge tx={tx} />
        </div>

        {/* Action history indicator */}
        {tx.actionHistory?.length > 0 && (
          <div className="shrink-0">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded
                             bg-indigo-100 text-indigo-600 border border-indigo-200">
              {tx.actionHistory.length} action{tx.actionHistory.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Expanded anomaly detail */}
      {expanded && (
        <TxAnomalyDetail tx={tx} onAction={onAction} />
      )}
    </div>
  )
}

// ─── Table header ─────────────────────────────────────────────────────────────
function TableHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b-2 border-line bg-muted/70 sticky top-0 z-10">
      <div className="w-4 shrink-0" />
      <div className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Timestamp</div>
      <div className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Status</div>
      <div className="w-28 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Amount</div>
      <div className="w-32 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Type</div>
      <div className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Source → Destination</div>
      <div className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Category</div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 50

export default function TxFeed({ txs, newIds = new Set(), onAction }) {
  const [page, setPage] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (newIds.size === 0) return
    if (page === 0) {
      setPendingCount(0)
    } else {
      setPendingCount((n) => n + newIds.size)
    }
  }, [newIds, page])

  function jumpToTop() {
    setPage(0)
    setPendingCount(0)
  }

  useEffect(() => {
    setPage(0)
    setPendingCount(0)
  }, [txs.length === 0 ? null : txs[txs.length - 1]?.id])

  const totalPages = Math.max(1, Math.ceil(txs.length / PAGE_SIZE))
  const visible    = txs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div>
      <TableHeader />

      {pendingCount > 0 && page > 0 && (
        <button
          onClick={jumpToTop}
          className="flex items-center justify-center gap-1.5 w-full py-1.5 bg-indigo-500
                     text-white text-xs font-semibold hover:bg-indigo-600 transition-colors animate-slide-fade"
        >
          <ArrowUp size={12} />
          {pendingCount} new {pendingCount === 1 ? 'transaction' : 'transactions'} — jump to latest
        </button>
      )}

      <div>
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-faint gap-2">
            <AlertTriangle size={32} className="opacity-30" />
            <p className="text-sm">No transactions match the current filters.</p>
          </div>
        ) : (
          visible.map((tx) => (
            <TxRow
              key={tx.id}
              tx={tx}
              isNew={page === 0 && newIds.has(tx.id)}
              onAction={onAction}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-line bg-card">
          <span className="text-xs text-ink-faint">
            Showing{' '}
            <span className="font-medium text-ink">{page * PAGE_SIZE + 1}</span>–
            <span className="font-medium text-ink">{Math.min((page + 1) * PAGE_SIZE, txs.length)}</span>
            {' '}of <span className="font-medium text-ink">{txs.length.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(0); setPendingCount(0) }} disabled={page === 0}
              className="px-2 py-1 rounded-lg text-xs text-ink-soft hover:bg-muted disabled:opacity-30 transition-colors">«</button>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight size={14} className="rotate-180" /></button>

            {(() => {
              const start = Math.max(0, Math.min(page - 3, totalPages - 7))
              const end   = Math.min(totalPages, start + 7)
              return Array.from({ length: end - start }, (_, i) => start + i).map((p) => (
                <button key={p}
                  onClick={() => { setPage(p); if (p === 0) setPendingCount(0) }}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors
                    ${p === page ? 'bg-indigo-500 text-white' : 'hover:bg-muted text-ink-soft'}`}>
                  {p + 1}
                </button>
              ))
            })()}

            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight size={14} /></button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1}
              className="px-2 py-1 rounded-lg text-xs text-ink-soft hover:bg-muted disabled:opacity-30 transition-colors">»</button>
          </div>
        </div>
      )}
    </div>
  )
}
