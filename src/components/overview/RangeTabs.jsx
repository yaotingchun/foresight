import { TIME_RANGES } from '../../hooks/useLiveDashboard'

/** Segmented time-range control that sits above the traffic chart. */
export default function RangeTabs({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100/80 border border-slate-200/50 p-1">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 ${
              active
                ? 'bg-white text-indigo-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/20'
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
