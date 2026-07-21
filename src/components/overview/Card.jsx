/** Shared dashboard panel — matches the app's card language (border, radius, shadow). */
export default function Card({ title, subtitle, right, children, className = '', bodyClassName = 'px-5 pb-5' }) {
  return (
    <section
      className={`flex min-w-0 flex-col rounded-2xl border border-slate-200/50 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.035)] ${className}`}
    >
      {(title || right) && (
        <header className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="truncate text-sm font-semibold tracking-tight text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 truncate text-[11px] font-medium text-ink-faint">{subtitle}</p>}
          </div>
          {right && <div className="ml-auto flex shrink-0 items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={`min-w-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
