import { useEffect, useState } from 'react'
import ServiceMap from './servicemap/ServiceMap'

/** Card wrapper: handles zoom pan fullscreen layout. */
export default function ServiceMapPanel({ query, sidebarOpen, appliedUpgrades }) {
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
