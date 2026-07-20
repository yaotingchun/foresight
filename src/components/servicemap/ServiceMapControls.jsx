import { Plus, Minus, Maximize2, Expand, Shrink } from 'lucide-react'

export default function ServiceMapControls({ onZoomIn, onZoomOut, onFit, onToggleExpand, expanded }) {
  const zoom = [
    { id: 'in', icon: Plus, label: 'Zoom in', onClick: onZoomIn },
    { id: 'out', icon: Minus, label: 'Zoom out', onClick: onZoomOut },
    { id: 'fit', icon: Maximize2, label: 'Fit to screen', onClick: onFit },
  ]

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      <button
        type="button"
        aria-label={expanded ? 'Exit fullscreen' : 'Expand to fullscreen'}
        onClick={onToggleExpand}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft shadow-card transition-colors hover:bg-muted"
      >
        {expanded ? <Shrink size={17} strokeWidth={1.75} /> : <Expand size={17} strokeWidth={1.75} />}
      </button>

      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {zoom.map(({ id, icon: Icon, label, onClick }, i) => (
          <button
            key={id}
            type="button"
            aria-label={label}
            onClick={onClick}
            className={`flex h-10 w-10 items-center justify-center text-ink-soft transition-colors hover:bg-muted ${
              i > 0 ? 'border-t border-line' : ''
            }`}
          >
            <Icon size={17} strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  )
}
