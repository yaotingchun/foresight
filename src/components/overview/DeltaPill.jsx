import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

/**
 * A signed change indicator. `polarity` decides which direction is "good":
 * for throughput up is good; for latency/errors up is bad. Colour follows the
 * meaning, not the sign.
 */
export default function DeltaPill({ value, polarity = 'up-good', suffix = '%' }) {
  const flat = Math.abs(value) < 0.05
  const up = value > 0
  const good = flat ? null : polarity === 'up-good' ? up : !up

  const tone = flat
    ? { bg: 'bg-muted', fg: 'text-ink-soft', Icon: Minus }
    : good
      ? { bg: 'bg-status-green-tint', fg: 'text-status-green', Icon: up ? ArrowUpRight : ArrowDownRight }
      : { bg: 'bg-status-red-tint', fg: 'text-status-red', Icon: up ? ArrowUpRight : ArrowDownRight }

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full ${tone.bg} px-1.5 py-0.5 text-xs font-semibold ${tone.fg}`}
    >
      <tone.Icon size={12} strokeWidth={2.5} />
      {flat ? '0' : `${Math.abs(value).toFixed(1)}`}
      {suffix}
    </span>
  )
}
