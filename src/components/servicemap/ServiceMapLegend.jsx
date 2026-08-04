import { LEGEND_ITEMS, statusOf } from './statusColors'

export default function ServiceMapLegend() {
  return (
    <div className="flex items-center gap-3 rounded-full border border-line bg-white/95 px-3 py-1 select-none shadow-sm backdrop-blur-sm">
      {LEGEND_ITEMS.map(({ health, label }) => (
        <div key={health} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: statusOf(health).color }}
          />
          <span className="text-[10px] font-bold text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  )
}
