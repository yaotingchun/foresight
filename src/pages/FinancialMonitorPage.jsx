import { useState, useMemo } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { CircleDollarSign, CheckCircle, XCircle, ArrowUpRight } from 'lucide-react'
import { useFinancialStream } from '../hooks/useFinancialStream'
import { computeMetrics } from '../data/financialData'
import LiveBadge from '../components/servicemap/LiveBadge'
import FinSummaryMetrics from '../components/financial/FinSummaryMetrics'
import FinFilters from '../components/financial/FinFilters'
import TxFeed from '../components/financial/TxFeed'

/**
 * FinancialMonitorPage
 *
 * Real-time financial transaction monitoring with:
 *  - Live-scrolling transaction feed (normal / flagged / blocked)
 *  - Filter by status, amount range, time window, anomaly category
 *  - Per-flagged anomaly detail: confidence score, dominant feature,
 *    infra correlation indicator (topology-awareness differentiator),
 *    and routing callout (fraud vs infra-induced)
 *  - Summary KPI row: volume vs baseline, flagged split, value at risk
 *  - Action panel: approve / block / escalate with action history
 */
export default function FinancialMonitorPage() {
  const { txs, newIds, isPaused, togglePause, applyAction } = useFinancialStream()
  const handleActionClick = (txId, action) => {
    const tx = txs.find(t => t.id === txId)
    if (!tx) return

    const colors = {
      approve: { icon: 'success', color: '#059669', title: 'Approve Transaction', label: 'approve' },
      block: { icon: 'error', color: '#dc2626', title: 'Block Transaction', label: 'block' },
      escalate: { icon: 'warning', color: '#d97706', title: 'Escalate Transaction', label: 'escalate' }
    }
    const theme = colors[action]

    Swal.fire({
      title: theme.title,
      html: `
        <div style="text-align: left; font-size: 13.5px; font-family: inherit; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; font-weight: 500;">
            <span style="color: #64748b;">Transaction ID</span>
            <span style="font-family: monospace; font-weight: 700; color: #334155;">${tx.id}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; font-weight: 500;">
            <span style="color: #64748b;">Amount</span>
            <span style="font-weight: 700; color: #0f172a;">$${tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; font-weight: 500;">
            <span style="color: #64748b;">Type</span>
            <span style="font-family: monospace; color: #334155;">${tx.type.replace(/_/g, ' ')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: 500;">
            <span style="color: #64748b;">Flow</span>
            <span style="color: #334155; font-family: monospace;">${tx.src} &rarr; ${tx.dst}</span>
          </div>
        </div>
        <p style="margin-top: 16px; font-size: 14px; color: #475569; text-align: left; font-weight: 500;">
          Are you sure you want to <strong>${theme.label}</strong> this transaction? This action will write to the secure ledger.
        </p>
      `,
      icon: theme.icon,
      showCancelButton: true,
      confirmButtonColor: theme.color,
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Confirm ${theme.label.charAt(0).toUpperCase() + theme.label.slice(1)}`,
      cancelButtonText: 'Cancel',
      customClass: {
        popup: 'rounded-2xl shadow-xl border border-slate-100 font-sans',
        title: 'text-[18px] font-bold text-slate-800',
        confirmButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white',
        cancelButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white',
      }
    }).then((result) => {
      if (result.isConfirmed) {
        applyAction(txId, action)
      }
    })
  }

  // ── Filter state ────────────────────────────────────────────────────────────
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [minAmount,      setMinAmount]      = useState('')
  const [maxAmount,      setMaxAmount]      = useState('')
  const [timeMs,         setTimeMs]         = useState(86400000) // 1d default (24h)
  const [categoryFilter, setCategoryFilter] = useState('all')

  // ── Time-range filter ───────────────────────────────────────────────────────
  const timeFiltered = useMemo(() => {
    const effectiveTimeMs = categoryFilter === 'infra' ? Math.max(timeMs, 86400000) : timeMs
    const cutoff = Date.now() - effectiveTimeMs
    return txs.filter((t) => t.timestamp >= cutoff)
  }, [txs, timeMs, categoryFilter])

  // ── Full filter for table ───────────────────────────────────────────────────
  const tableFiltered = useMemo(() => {
    return timeFiltered.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false

      const min = parseFloat(minAmount)
      const max = parseFloat(maxAmount)
      if (!isNaN(min) && t.amount < min) return false
      if (!isNaN(max) && t.amount > max) return false

      if (categoryFilter === 'fraud') {
        // Only flagged/blocked with NO infra correlation
        if (t.status === 'normal') return false
        if (t.infraCorrelation)    return false
      } else if (categoryFilter === 'infra') {
        // Only flagged/blocked WITH infra correlation
        if (t.status === 'normal') return false
        if (!t.infraCorrelation)   return false
      }

      return true
    })
  }, [timeFiltered, statusFilter, minAmount, maxAmount, categoryFilter])

  // ── Summary metrics ─────────────────────────────────────────────────────────
  const metrics = useMemo(() => computeMetrics(timeFiltered), [timeFiltered])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6">

        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div>
            <div className="flex items-center gap-2.5">
              <CircleDollarSign size={20} className="text-emerald-600" />
              <h1 className="text-xl font-semibold tracking-tight text-ink">Financial Monitor</h1>
              <LiveBadge />
            </div>
            <p className="mt-0.5 text-sm text-ink-soft">
              Real-time transaction triage with topology-aware anomaly classification
            </p>
          </div>
        </div>

        {/* ── Summary KPIs ─────────────────────────────────────────────────────── */}
        <FinSummaryMetrics metrics={metrics} />



        {/* ── Filter bar ──────────────────────────────────────────────────────── */}
        <div className="bg-card border border-slate-200 rounded-2xl px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <FinFilters
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmount={setMinAmount}
            onMaxAmount={setMaxAmount}
            timeMs={timeMs}
            onTimeMs={setTimeMs}
            categoryFilter={categoryFilter}
            onCategoryFilter={setCategoryFilter}
            totalVisible={tableFiltered.length}
            totalCount={timeFiltered.length}
            isPaused={isPaused}
            onTogglePause={togglePause}
          />
        </div>

        {/* ── Transaction feed ────────────────────────────────────────────────── */}
        <div className="bg-card border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <TxFeed
            txs={tableFiltered}
            newIds={newIds}
            onAction={handleActionClick}
          />
        </div>

      </div>
    </div>
  )
}
