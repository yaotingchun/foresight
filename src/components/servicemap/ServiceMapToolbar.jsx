import { Search, Layers3, ChevronDown } from 'lucide-react'

/**
 * Header controls. The environment/view dropdowns are placeholders; the search
 * box is live — it highlights matching services and dims the rest.
 */
export default function ServiceMapToolbar({ query, onQueryChange }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        <Search
          size={15}
          strokeWidth={1.75}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search services…"
          className="h-9 w-52 rounded-lg border border-line bg-white pl-8 pr-3 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-status-indigo/25"
        />
      </div>

      <button
        type="button"
        className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 transition-colors hover:bg-muted"
      >
        <Layers3 size={15} strokeWidth={1.75} className="text-status-blue" />
        <span className="text-[13px] font-medium text-ink-soft">Environment: Production</span>
        <ChevronDown size={15} strokeWidth={1.75} className="text-ink-faint" />
      </button>
    </div>
  )
}
