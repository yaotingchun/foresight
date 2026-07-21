import { Cpu, MemoryStick, HardDrive, Network } from 'lucide-react'

const ROWS = [
  { key: 'cpu', label: 'CPU', icon: Cpu, sub: '48 vCPU' },
  { key: 'memory', label: 'Memory', icon: MemoryStick, sub: '256 GB' },
  { key: 'disk', label: 'Disk I/O', icon: HardDrive, sub: '4 TB NVMe' },
  { key: 'network', label: 'Network', icon: Network, sub: '10 Gb/s' },
]

/** Threshold styles: calm below 70%, warning to 85%, critical beyond. */
function styleFor(v) {
  if (v >= 85) {
    return {
      bar: 'from-rose-500 to-red-600',
      text: 'text-rose-600',
      track: 'bg-rose-50/50 border border-rose-100/50',
      iconTint: 'bg-rose-50 text-rose-500 border-rose-100/30'
    }
  }
  if (v >= 70) {
    return {
      bar: 'from-amber-400 to-orange-500',
      text: 'text-amber-600',
      track: 'bg-amber-50/50 border border-amber-100/50',
      iconTint: 'bg-amber-50 text-amber-500 border-amber-100/30'
    }
  }
  return {
    bar: 'from-emerald-400 to-teal-500',
    text: 'text-emerald-600',
    track: 'bg-emerald-50/50 border border-emerald-100/50',
    iconTint: 'bg-emerald-50 text-emerald-500 border-emerald-100/30'
  }
}

/** Horizontal utilisation meters for the core infrastructure resources. */
export default function ResourceMeters({ resources }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      {ROWS.map((r) => {
        const v = resources[r.key]
        const tone = styleFor(v)
        return (
          <div key={r.key} className="group">
            <div className="mb-2 flex items-center gap-2.5">
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg border bg-slate-50 border-slate-200/50 text-slate-500 transition-colors duration-200 group-hover:bg-white group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.03)]`}>
                <r.icon size={13} strokeWidth={2.2} />
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800 leading-tight">{r.label}</span>
                <span className="text-[9px] font-semibold text-slate-400">{r.sub}</span>
              </div>
              <span className={`ml-auto text-xs font-bold tabular-nums ${tone.text}`}>{v}%</span>
            </div>
            <div className={`h-2.5 w-full overflow-hidden rounded-full ${tone.track}`}>
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tone.bar} transition-[width] duration-700 ease-out`}
                style={{ width: `${v}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
