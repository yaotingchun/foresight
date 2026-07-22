/**
 * BottleneckChart
 *
 * Scatter plot — X = Throughput (RPS), Y = Latency (ms), bubble radius = CPU%.
 * Components in the top-right quadrant are bottlenecks.
 * Quadrant lines at system medians are drawn as ReferenceLine.
 */
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell, ZAxis,
} from 'recharts'
import { AlertTriangle, Loader2, Activity } from 'lucide-react'

const STATUS_COLOR = {
  bottleneck: '#ef4444',
  stressed:   '#f59e0b',
  healthy:    '#22c55e',
}

const STATUS_LABEL = {
  bottleneck: { label: 'Bottleneck', bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500 animate-pulse' },
  stressed:   { label: 'Stressed',   bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  healthy:    { label: 'Healthy',    bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' },
}

const CustomScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const s = STATUS_LABEL[d.status] || STATUS_LABEL.healthy
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5 shadow-card text-xs min-w-[160px]">
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`h-1.5 w-1.5 rounded-full inline-block ${s.dot}`} />
        <p className="font-bold text-ink">{d.component}</p>
        <span className={`ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${s.bg} ${s.text}`}>
          {s.label}
        </span>
      </div>
      <div className="space-y-0.5 text-ink-soft">
        <p>Throughput: <span className="font-semibold text-ink">{d.throughput} rps</span></p>
        <p>Latency: <span className="font-semibold text-ink">{d.latency} ms</span></p>
        <p>CPU: <span className="font-semibold text-ink">{d.cpu}%</span></p>
        <p>Error rate: <span className="font-semibold text-ink">{d.error_rate}%</span></p>
        {d.bandwidth_pct != null && <p>Bandwidth: <span className="font-semibold text-ink">{d.bandwidth_pct}%</span></p>}
        {d.connections   != null && <p>Connections: <span className="font-semibold text-ink">{d.connections}</span></p>}
      </div>
    </div>
  )
}

const CustomDot = ({ cx, cy, payload, onSelect }) => {
  const color = STATUS_COLOR[payload.status] || '#6366f1'
  const r = Math.max(8, Math.min(24, payload.cpu / 4))
  return (
    <g
      onClick={() => onSelect?.(payload.component)}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={r + 4} fill={color} fillOpacity={0.12} />
      <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.85} stroke="white" strokeWidth={1.5} />
      <text x={cx} y={cy + r + 11} textAnchor="middle" fill="#475569" fontSize={9} fontWeight={600}>
        {payload.component.split('-')[0]}
      </text>
    </g>
  )
}

export default function BottleneckChart({ bottleneckData, isLoading, onSelectComponent }) {
  if (isLoading) {
    return (
      <div className="flex flex-col rounded-xl border border-line bg-card shadow-card p-5 min-h-[320px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-ink-faint" size={24} />
        </div>
      </div>
    )
  }

  if (!bottleneckData?.points?.length) return null

  const { points, thresholds, bottlenecks, stressed } = bottleneckData

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 border border-red-100">
            <Activity size={14} className="text-red-500" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Bottleneck Analysis</p>
            <p className="text-[11px] text-ink-faint">
              Throughput vs Latency — bubble size = CPU%. Top-right = bottleneck zone.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bottlenecks.length > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              <AlertTriangle size={9} />
              {bottlenecks.length} bottleneck{bottlenecks.length > 1 ? 's' : ''}
            </span>
          )}
          {stressed.length > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              {stressed.length} stressed
            </span>
          )}
        </div>
      </div>

      {/* Quadrant legend */}
      <div className="px-5 pt-3 pb-0 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-ink-faint">
        <span>Top-right: <strong className="text-red-600">Bottleneck</strong> (high load + high latency)</span>
        <span>Top-left: <strong className="text-amber-600">Stressed</strong> (low traffic but slow)</span>
        <span>Bottom-right: <strong className="text-blue-600">High Traffic</strong> (handling load well)</span>
        <span>Bottom-left: <strong className="text-emerald-600">Healthy</strong> (normal operation)</span>
      </div>

      {/* Scatter chart */}
      <div className="px-3 pb-6 pt-2" style={{ height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              type="number"
              dataKey="throughput"
              name="Throughput"
              unit=" rps"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              label={{ value: 'Throughput (rps) →', position: 'insideBottom', offset: -14, fill: '#94a3b8', fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="latency"
              name="Latency"
              unit=" ms"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              label={{ value: '↑ Latency (ms)', angle: -90, position: 'insideLeft', offset: 12, fill: '#94a3b8', fontSize: 10 }}
            />
            <ZAxis dataKey="cpu" range={[60, 500]} name="CPU" />

            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* Quadrant lines at system medians */}
            <ReferenceLine
              x={thresholds.throughput}
              stroke="#6366f144"
              strokeDasharray="5 4"
              label={{ value: 'med tput', position: 'top', fill: '#6366f1', fontSize: 9 }}
            />
            <ReferenceLine
              y={thresholds.latency * 1.3}
              stroke="#ef444444"
              strokeDasharray="5 4"
              label={{ value: 'latency threshold', position: 'right', fill: '#ef4444', fontSize: 9 }}
            />

            <Scatter
              data={points}
              shape={(props) => (
                <CustomDot {...props} onSelect={onSelectComponent} />
              )}
            >
              {points.map((p) => (
                <Cell key={p.component} fill={STATUS_COLOR[p.status] || '#6366f1'} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Component list */}
      {(bottlenecks.length > 0 || stressed.length > 0) && (
        <div className="border-t border-line px-5 py-3 flex flex-wrap gap-2">
          {bottlenecks.map(c => (
            <button key={c} onClick={() => onSelectComponent?.(c)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {c}
            </button>
          ))}
          {stressed.map(c => (
            <button key={c} onClick={() => onSelectComponent?.(c)}
              className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
