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
    <section className="flex flex-col justify-between rounded-2xl border border-slate-200/50 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.035)]">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
          style={{ 
            backgroundColor: `${iconColor}12`, 
            border: `1px solid ${iconColor}20`,
            boxShadow: `0 0 12px ${iconColor}15`
          }}
        >
          <Icon size={18} strokeWidth={2.5} style={{ color: iconColor }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</span>
            {unit && <span className="text-xs font-semibold text-ink-faint">{unit}</span>}
          </div>
        </div>
        {delta !== undefined && <DeltaPill value={delta} polarity={polarity} />}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="text-[11px] font-medium text-ink-faint">{footnote}</span>
        {spark && (
          <div className="h-9 w-28 opacity-90 hover:opacity-100 transition-opacity duration-200">
            <MiniSpark data={spark} color={sparkColor} height={36} />
          </div>
        )}
      </div>
    </section>
  )
}
