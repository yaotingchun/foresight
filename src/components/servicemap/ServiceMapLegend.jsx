import { LEGEND_ITEMS, statusOf } from './statusColors'

export default function ServiceMapLegend() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-muted/40 px-2.5 py-1 select-none">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Status:
      </div>
      <div className="flex flex-row items-center gap-3">
        {LEGEND_ITEMS.map(({ health, label }) => (
          <div key={health} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: statusOf(health).color }}
            />
            <span className="text-[11px] font-bold text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
