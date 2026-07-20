/**
 * FinFilters
 *
 * Filter bar for the transaction feed:
 *  - Status pills (all / normal / flagged / blocked)
 *  - Amount range slider
 *  - Time window selector
 *  - Category split toggle (fraud / infra / all)
 *  - Pause/play stream
 */
import { Pause, Play, SlidersHorizontal } from 'lucide-react'

const STATUS_OPTS = ['all', 'normal', 'flagged', 'blocked']
const TIME_OPTS   = [
  { label: '15min', ms: 15 * 60 * 1000 },
  { label: '1h',    ms: 60 * 60 * 1000 },
  { label: '1d',    ms: 24 * 60 * 60 * 1000 },
]
const CATEGORY_OPTS = [
  { key: 'all',   label: 'All anomalies' },
  { key: 'fraud', label: 'Fraud-pattern only' },
  { key: 'infra', label: 'Infra-induced only' },
]

const STATUS_STYLES = {
  all:     'bg-muted text-ink-soft border-line hover:bg-line',
  normal:  'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  flagged: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  blocked: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
}
const STATUS_ACTIVE = {
  all:     'bg-ink text-white border-ink',
  normal:  'bg-emerald-500 text-white border-emerald-500',
  flagged: 'bg-amber-500 text-white border-amber-500',
  blocked: 'bg-red-500 text-white border-red-500',
}

export default function FinFilters({
  statusFilter, onStatusFilter,
  minAmount, maxAmount, onMinAmount, onMaxAmount,
  timeMs, onTimeMs,
  categoryFilter, onCategoryFilter,
  totalVisible, totalCount,
  isPaused, onTogglePause,
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Live indicator + pause */}
      <button
        onClick={onTogglePause}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors
          ${isPaused
            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
      >
        {isPaused ? <Play size={12} /> : <Pause size={12} />}
        {isPaused ? 'Paused' : 'Live'}
      </button>

      <div className="h-5 w-px bg-line" />

      {/* Status pills */}
      <div className="flex items-center gap-1">
        {STATUS_OPTS.map((s) => (
          <button
            key={s}
            onClick={() => onStatusFilter(s)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors capitalize
              ${statusFilter === s ? STATUS_ACTIVE[s] : STATUS_STYLES[s]}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-line" />

      {/* Time window */}
      <div className="flex items-center gap-1">
        {TIME_OPTS.map(({ label, ms }) => (
          <button
            key={ms}
            onClick={() => onTimeMs(ms)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors
              ${timeMs === ms
                ? 'bg-ink text-white border-ink'
                : 'bg-muted text-ink-soft border-line hover:bg-line'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-line" />

      {/* Category filter */}
      <div className="flex items-center gap-1">
        {CATEGORY_OPTS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onCategoryFilter(key)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors
              ${categoryFilter === key
                ? key === 'fraud'
                  ? 'bg-red-500 text-white border-red-500'
                  : key === 'infra'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-ink text-white border-ink'
                : 'bg-muted text-ink-soft border-line hover:bg-line'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-line" />

      {/* Amount range */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={13} className="text-ink-faint" />
        <span className="text-xs text-ink-faint">Amount:</span>
        <input
          type="number"
          placeholder="Min $"
          value={minAmount}
          onChange={(e) => onMinAmount(e.target.value)}
          className="w-20 px-2 py-1 rounded-lg border border-line bg-muted text-xs text-ink-soft focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-xs text-ink-faint">–</span>
        <input
          type="number"
          placeholder="Max $"
          value={maxAmount}
          onChange={(e) => onMaxAmount(e.target.value)}
          className="w-24 px-2 py-1 rounded-lg border border-line bg-muted text-xs text-ink-soft focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* Count badge */}
      <span className="ml-auto text-xs text-ink-faint">
        <span className="font-semibold text-ink">{totalVisible.toLocaleString()}</span>
        {' '}/ {totalCount.toLocaleString()} transactions
      </span>
    </div>
  )
}
