import { TIME_RANGES } from '../../hooks/useLiveDashboard'

/** Segmented time-range control that sits above the traffic chart. */
export default function RangeTabs({ value, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {TIME_RANGES.map((r) => {
        const active = r.id === value
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onChange(r.id)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
              active
                ? 'bg-card text-ink shadow-card'
                : 'text-ink-faint hover:text-ink-soft'
            }`}
          >
            {r.label}
          </button>
        )
      })}
    </div>
  )
}
