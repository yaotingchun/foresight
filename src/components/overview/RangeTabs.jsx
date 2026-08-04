import { TIME_RANGES } from '../../hooks/useLiveDashboard'

/** Segmented time-range control that sits above the traffic chart. */
export default function RangeTabs({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-[#e6f4ea] border border-brand-tint p-1">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 ${
              active
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
