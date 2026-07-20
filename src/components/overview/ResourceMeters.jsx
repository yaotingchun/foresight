import { Cpu, MemoryStick, HardDrive, Network } from 'lucide-react'

const ROWS = [
  { key: 'cpu', label: 'CPU', icon: Cpu, sub: '48 vCPU' },
  { key: 'memory', label: 'Memory', icon: MemoryStick, sub: '256 GB' },
  { key: 'disk', label: 'Disk I/O', icon: HardDrive, sub: '4 TB NVMe' },
  { key: 'network', label: 'Network', icon: Network, sub: '10 Gb/s' },
]

/** Threshold colour: calm below 70%, warning to 85%, critical beyond. */
function toneFor(v) {
  if (v >= 85) return { bar: '#EF4444', text: 'text-status-red', track: '#FEE2E2' }
  if (v >= 70) return { bar: '#F59E0B', text: 'text-status-orange', track: '#FEF3C7' }
  return { bar: '#22C55E', text: 'text-status-green', track: '#DCFCE7' }
}

/** Horizontal utilisation meters for the core infrastructure resources. */
export default function ResourceMeters({ resources }) {
  return (
    <div className="flex h-full flex-col justify-between gap-3.5">
      {ROWS.map((r) => {
        const v = resources[r.key]
        const tone = toneFor(v)
        return (
          <div key={r.key}>
            <div className="mb-1.5 flex items-center gap-2">
              <r.icon size={15} strokeWidth={2} className="text-ink-faint" />
              <span className="text-xs font-semibold text-ink">{r.label}</span>
              <span className="text-[11px] text-ink-faint">{r.sub}</span>
              <span className={`ml-auto text-sm font-semibold tabular-nums ${tone.text}`}>{v}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: tone.track }}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${v}%`, backgroundColor: tone.bar }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
