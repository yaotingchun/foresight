import { useEffect, useState } from 'react'
import ServiceMap from './servicemap/ServiceMap'
import ServiceMapToolbar from './servicemap/ServiceMapToolbar'
import LiveBadge from './servicemap/LiveBadge'
import ServiceMapLegend from './servicemap/ServiceMapLegend'

/** Card wrapper: header (title + live badge + toolbar) above the interactive map. */
export default function ServiceMapPanel({ headerActions, sidebarOpen, appliedUpgrades }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  // Escape exits fullscreen.
  useEffect(() => {
    if (!expanded) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <section
      className={
        expanded
          ? 'fixed inset-0 z-50 flex flex-col bg-card p-5'
          : 'flex h-full min-h-[500px] flex-1 flex-col rounded-card border border-line bg-card p-5 shadow-card'
      }
    >
      <header className="mb-3 flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <h2 className="text-base font-semibold text-ink whitespace-nowrap">Service Map</h2>
          <LiveBadge />
        </div>
        <div className="hidden xl:block shrink-0">
          <ServiceMapLegend />
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {headerActions}
          <ServiceMapToolbar query={query} onQueryChange={setQuery} />
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <ServiceMap
          query={query}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
          sidebarOpen={sidebarOpen}
          appliedUpgrades={appliedUpgrades}
        />
      </div>
    </section>
  )
}
