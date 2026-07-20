/**
 * FinSummaryMetrics
 *
 * Four KPI tiles at the top of the Financial Monitor:
 *   - Transaction volume vs baseline
 *   - Flagged count split by fraud vs infra-induced
 *   - Total value at risk
 *   - Blocked count
 */
import { TrendingUp, AlertTriangle, ShieldOff, Zap } from 'lucide-react'

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function pct(a, b) {
  if (!b) return 0
  return Math.round(((a - b) / b) * 100)
}

function Tile({ icon: Icon, iconBg, iconColor, label, value, sub, badge, badgeColor }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none text-ink tabular-nums">{value}</p>
        </div>
        {badge !== undefined && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: badgeColor + '22', color: badgeColor }}
          >
            {badge}
          </span>
        )}
      </div>
      {sub && (
        <p className="mt-3 text-xs text-ink-faint leading-snug">{sub}</p>
      )}
    </div>
  )
}

export default function FinSummaryMetrics({ metrics }) {
  const volDelta = pct(metrics.total, metrics.baselineTotal)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* Volume */}
      <Tile
        icon={TrendingUp}
        iconBg="#DBEAFE"
        iconColor="#3B82F6"
        label="Tx Volume"
        value={metrics.total.toLocaleString()}
        badge={`${volDelta >= 0 ? '+' : ''}${volDelta}%`}
        badgeColor={volDelta >= 0 ? '#22C55E' : '#EF4444'}
        sub={`Baseline: ${metrics.baselineTotal.toLocaleString()} · ${volDelta >= 0 ? 'above' : 'below'} normal`}
      />

      {/* Flagged split */}
      <Tile
        icon={AlertTriangle}
        iconBg="#FEF3C7"
        iconColor="#F59E0B"
        label="Flagged Transactions"
        value={metrics.flaggedCount + metrics.blockedCount}
        sub={
          <span className="flex gap-3">
            <span>
              <span className="font-semibold text-red-500">{metrics.fraudCount}</span>
              {' '}fraud-pattern
            </span>
            <span>
              <span className="font-semibold text-amber-500">{metrics.infraCount}</span>
              {' '}infra-induced
            </span>
          </span>
        }
      />

      {/* Value at risk */}
      <Tile
        icon={ShieldOff}
        iconBg="#FEE2E2"
        iconColor="#EF4444"
        label="Value at Risk"
        value={fmt(metrics.valueAtRisk)}
        sub="Sum of all flagged & blocked amounts"
      />

      {/* Blocked */}
      <Tile
        icon={Zap}
        iconBg="#EDE9FE"
        iconColor="#8B5CF6"
        label="Auto-Blocked"
        value={metrics.blockedCount}
        sub="Score ≥ 0.75 — blocked by policy"
      />
    </div>
  )
}
