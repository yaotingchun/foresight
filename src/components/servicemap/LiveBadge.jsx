export default function LiveBadge({ label = 'Live' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-green-tint px-2.5 py-1">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-green opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-status-green" />
      </span>
      <span className="text-xs font-semibold text-status-green">{label}</span>
    </span>
  )
}
