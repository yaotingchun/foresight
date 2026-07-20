import { LEGEND_ITEMS, statusOf } from './statusColors'

export default function ServiceMapLegend() {
  return (
    <div className="pointer-events-auto absolute bottom-4 left-4 z-30 rounded-xl border border-line bg-white/85 px-4 py-3 shadow-card backdrop-blur">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        Service Health
      </div>
      <div className="flex flex-col gap-2">
        {LEGEND_ITEMS.map(({ health, label }) => (
          <div key={health} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusOf(health).color }}
            />
            <span className="text-[12px] font-medium text-ink-soft">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
