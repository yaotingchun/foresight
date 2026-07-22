import { useState, useMemo } from 'react'
import { CircleDollarSign } from 'lucide-react'
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

  // ── Filter state ────────────────────────────────────────────────────────────
  const [statusFilter,   setStatusFilter]   = useState('all')
  const [minAmount,      setMinAmount]      = useState('')
  const [maxAmount,      setMaxAmount]      = useState('')
  const [timeMs,         setTimeMs]         = useState(900000) // 15 min
  const [categoryFilter, setCategoryFilter] = useState('all')

  // ── Time-range filter ───────────────────────────────────────────────────────
  const timeFiltered = useMemo(() => {
    const cutoff = Date.now() - timeMs
    return txs.filter((t) => t.timestamp >= cutoff)
  }, [txs, timeMs])

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
        <div className="bg-card border border-line rounded-xl px-3 py-2 shadow-card">
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
        <div className="bg-card border border-line rounded-xl shadow-card overflow-hidden">
          <TxFeed
            txs={tableFiltered}
            newIds={newIds}
            onAction={applyAction}
          />
        </div>

      </div>
    </div>
  )
}
