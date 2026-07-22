/**
 * TrafficChart
 *
 * Shows throughput (req/s), bandwidth utilisation (%), and active connections
 * for the selected component — all on one ComposedChart with dual Y-axes.
 */
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Wifi, Loader2 } from 'lucide-react'

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function fmtDateFull(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5 shadow-card text-xs">
      <p className="mb-1.5 font-semibold text-ink-soft">{fmtDateFull(label)}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-bold ml-0.5 text-ink">{
            typeof p.value === 'number' ? p.value.toFixed(1) : p.value
          }{p.unit}</span>
        </p>
      ))}
    </div>
  )
}

// Merge three time-series arrays into one unified data array
function mergeTrafficData(trafficData) {
  if (!trafficData?.throughput) return []

  const map = new Map()

  trafficData.throughput.times.forEach((t, i) => {
    map.set(t, { time: t, throughput: trafficData.throughput.values[i] })
  })
  trafficData.bandwidth?.times?.forEach((t, i) => {
    if (map.has(t)) map.get(t).bandwidth = trafficData.bandwidth.values[i]
    else map.set(t, { time: t, bandwidth: trafficData.bandwidth.values[i] })
  })
  trafficData.connections?.times?.forEach((t, i) => {
    if (map.has(t)) map.get(t).connections = trafficData.connections.values[i]
    else map.set(t, { time: t, connections: trafficData.connections.values[i] })
  })

  return Array.from(map.values()).sort((a, b) => a.time.localeCompare(b.time))
}

export default function TrafficChart({ trafficData, isLoading, component }) {
  if (isLoading) {
    return (
      <div className="flex flex-col rounded-xl border border-line bg-card shadow-card p-5 min-h-[280px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-ink-faint" size={24} />
        </div>
      </div>
    )
  }

  if (!trafficData?.throughput) return null

  const data = mergeTrafficData(trafficData)
  const hasNetwork = !!(trafficData.bandwidth || trafficData.connections)

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
            <Wifi size={14} className="text-emerald-600" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">Traffic Overview</p>
            <p className="text-[11px] text-ink-faint">
              {component} · throughput{hasNetwork ? ', bandwidth & connections' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-[10px] text-ink-faint">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-5 rounded inline-block bg-emerald-500" /> RPS
          </span>
          {trafficData.bandwidth && (
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-5 rounded inline-block bg-blue-400" /> BW%
            </span>
          )}
          {trafficData.connections && (
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-5 rounded inline-block" style={{ background: '#f59e0b' }} /> Conns
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 py-3" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="tputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              interval="preserveStartEnd" minTickGap={80}
            />
            {/* Left Y axis — throughput */}
            <YAxis
              yAxisId="rps"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={44}
              tickFormatter={v => `${v}`}
            />
            {/* Right Y axis — bandwidth % */}
            {trafficData.bandwidth && (
              <YAxis
                yAxisId="pct"
                orientation="right"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                axisLine={false} tickLine={false}
                width={36}
                tickFormatter={v => `${v}%`}
                domain={[0, 100]}
              />
            )}

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />

            {/* Throughput area */}
            <Area
              yAxisId="rps"
              dataKey="throughput"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#tputGrad)"
              dot={false}
              name="Throughput"
              unit=" rps"
              isAnimationActive={false}
              connectNulls
            />

            {/* Bandwidth utilisation line */}
            {trafficData.bandwidth && (
              <Line
                yAxisId="pct"
                dataKey="bandwidth"
                stroke="#60a5fa"
                strokeWidth={1.5}
                dot={false}
                name="Bandwidth"
                unit="%"
                isAnimationActive={false}
                connectNulls
              />
            )}

            {/* Connection count line */}
            {trafficData.connections && (
              <Line
                yAxisId="rps"
                dataKey="connections"
                stroke="#f59e0b"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                name="Connections"
                unit=""
                isAnimationActive={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
