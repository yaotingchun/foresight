/** Shared dashboard panel — matches the app's card language (border, radius, shadow). */
export default function Card({ title, subtitle, right, children, className = '', bodyClassName = 'px-4 pb-4' }) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-card border border-line bg-card shadow-card ${className}`}
    >
      {(title || right) && (
        <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-xs text-ink-faint">{subtitle}</p>}
          </div>
          {right && <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
