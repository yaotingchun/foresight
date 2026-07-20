import { User, ChevronDown } from 'lucide-react'

export default function ProfileBlock({ name = 'IT Ops Admin', role = 'Administrator' }) {
  return (
    <button
      type="button"
      className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <User size={18} strokeWidth={1.75} className="text-ink-faint" />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[13px] font-semibold text-ink">{name}</span>
        <span className="block text-[11px] text-ink-faint">{role}</span>
      </span>
      <ChevronDown size={16} strokeWidth={1.75} className="text-ink-faint" />
    </button>
  )
}
