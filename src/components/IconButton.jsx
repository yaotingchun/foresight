export default function IconButton({ icon: Icon, badge, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-muted"
    >
      <Icon size={20} strokeWidth={1.75} />
      {badge != null && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}
