import { useEffect, useState } from 'react'
import ServiceMap from './servicemap/ServiceMap'
import ServiceMapToolbar from './servicemap/ServiceMapToolbar'
import LiveBadge from './servicemap/LiveBadge'

/** Card wrapper: header (title + live badge + toolbar) above the interactive map. */
export default function ServiceMapPanel() {
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
      <header className="mb-3 flex shrink-0 items-center">
        <h2 className="text-base font-semibold text-ink">Service Map</h2>
        <span className="ml-3">
          <LiveBadge />
        </span>
        <span className="ml-auto">
          <ServiceMapToolbar query={query} onQueryChange={setQuery} />
        </span>
      </header>

      <div className="min-h-0 flex-1">
        <ServiceMap
          query={query}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
        />
      </div>
    </section>
  )
}
