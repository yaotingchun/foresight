import { Search } from 'lucide-react'

export default function SearchInput() {
  return (
    <div className="relative ml-12 h-10 w-full max-w-[440px]">
      <Search
        size={18}
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
      />
      <input
        type="text"
        placeholder="Search components, services, or alerts..."
        className="h-full w-full rounded-[10px] bg-muted pl-10 pr-12 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-status-indigo/30"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border border-line bg-card text-[11px] text-ink-faint">
        /
      </kbd>
    </div>
  )
}
