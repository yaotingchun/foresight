import DeltaPill from './DeltaPill'
import MiniSpark from './MiniSpark'

/**
 * A key-metric tile: icon chip + label, a hero figure, a signed delta, and a
 * sparkline footer. This is a "stat tile" in dataviz terms — the number is the
 * headline and the spark gives just enough context.
 */
export default function MetricCard({
  icon: Icon,
  tint,
  iconColor,
  label,
  value,
  unit,
  delta,
  polarity,
  spark,
  sparkColor,
  footnote,
}) {
  return (
    <section className="flex flex-col justify-between rounded-card border border-line bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint }}
        >
          <Icon size={18} strokeWidth={2} style={{ color: iconColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold leading-none text-ink tabular-nums">{value}</span>
            {unit && <span className="text-sm font-medium text-ink-faint">{unit}</span>}
          </div>
        </div>
        {delta !== undefined && <DeltaPill value={delta} polarity={polarity} />}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-xs text-ink-faint">{footnote}</span>
        {spark && (
          <div className="h-9 w-28">
            <MiniSpark data={spark} color={sparkColor} height={36} />
          </div>
        )}
      </div>
    </section>
  )
}
