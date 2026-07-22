/**
 * ForecastChart
 *
 * A single metric panel rendered with Recharts. Shows:
 *   • A shaded baseline band (mean ± std)
 *   • The actual historical line
 *   • A dashed forecast line with widening confidence band
 *   • Red ReferenceArea overlays for every anomaly window
 *   • A per-chart AI insight snippet beneath the graph
 *
 * Uses the app's design token classes (bg-card, border-line, text-ink…)
 * so it matches the rest of the UI perfectly.
 */
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts'
import { AlertTriangle, TrendingUp, Loader2 } from 'lucide-react'
import { METRIC_META } from '../../hooks/useForecastData'

// ─── helpers ───────────────────────────────────────────────────────────────

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

const CustomTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5 shadow-card text-xs">
      <p className="mb-1.5 font-semibold text-ink-soft">{fmtDateFull(label)}</p>
      {payload.map(p => p.value != null && (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: p.color }}>
          <span className="h-1.5 w-1.5 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}:
          <span className="font-bold ml-0.5 text-ink">
            {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}{unit}
          </span>
        </p>
      ))}
    </div>
  )
}

// Build unified array: historical rows + forecast rows
function buildChartData(chartData) {
  if (!chartData) return []
  const { historical, forecast, baseline } = chartData
  const mean = baseline?.mean || 0
  const std  = baseline?.std  || 0

  const rows = historical.times.map((t, i) => ({
    time:     t,
    actual:   historical.values[i],
    baseHigh: parseFloat((mean + std).toFixed(3)),
    baseLow:  parseFloat(Math.max(0, mean - std).toFixed(3)),
  }))

  forecast?.times?.forEach((t, i) => {
    rows.push({
      time:     t,
      forecast: forecast.values[i],
      fcHigh:   forecast.upper[i],
      fcLow:    forecast.lower[i],
    })
  })

  return rows
}

// ─── skeleton ─────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-line bg-card shadow-card p-5 min-h-[300px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
        <div>
          <div className="h-3.5 w-24 rounded bg-muted animate-pulse mb-1.5" />
          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-ink-faint" size={24} />
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────

export default function ForecastChart({ metric, chartData, isLoading }) {
  const meta = METRIC_META[metric] || { label: metric, unit: '', color: '#6366f1' }

  if (isLoading) return <Skeleton />
  if (!chartData) return null

  const data            = buildChartData(chartData)
  const anomalyWindows  = chartData.anomaly_windows || []
  const insight         = chartData.chart_insight
  const hasAnomalies    = anomalyWindows.length > 0
  const lastActual      = chartData.historical.values.at(-1)

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card shadow-card overflow-hidden transition-shadow hover:shadow-md">
      {/* ── header ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: meta.color + '18' }}
          >
            <TrendingUp size={15} style={{ color: meta.color }} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-ink">{meta.label}</p>
            <p className="text-[11px] text-ink-faint">
              Current: <span className="font-semibold text-ink-soft">
                {lastActual != null ? `${lastActual.toFixed(1)}${meta.unit}` : '—'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnomalies && (
            <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              <AlertTriangle size={9} />
              {anomalyWindows.length} anomaly{anomalyWindows.length > 1 ? ' windows' : ' window'}
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: meta.color + '15', color: meta.color }}
          >
            {meta.unit}
          </span>
        </div>
      </div>

      {/* ── chart ── */}
      <div className="px-3 pt-3 pb-1" style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 12, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id={`base-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={meta.color} stopOpacity={0.10} />
                <stop offset="100%" stopColor={meta.color} stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id={`fc-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={80}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={v => `${v}${meta.unit}`}
            />

            <Tooltip
              content={<CustomTooltip unit={meta.unit} />}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            />

            {/* Baseline band */}
            <Area dataKey="baseHigh" stroke="none" fill={`url(#base-${metric})`} legendType="none" isAnimationActive={false} dot={false} name="Baseline +" />
            <Area dataKey="baseLow"  stroke="none" fill="white"                  legendType="none" isAnimationActive={false} dot={false} name="Baseline -" />

            {/* Forecast confidence band */}
            <Area dataKey="fcHigh" stroke="none" fill={`url(#fc-${metric})`} legendType="none" isAnimationActive={false} dot={false} name="Forecast +" />
            <Area dataKey="fcLow"  stroke="none" fill="white"                legendType="none" isAnimationActive={false} dot={false} name="Forecast -" />

            {/* Anomaly windows — red overlay */}
            {anomalyWindows.map((w, i) => (
              <ReferenceArea
                key={i}
                x1={w.start}
                x2={w.end}
                fill="#fef2f2"
                stroke="#fca5a5"
                strokeWidth={1}
              />
            ))}

            {/* Threshold lines */}
            {meta.warnAt && (
              <ReferenceLine y={meta.warnAt} stroke="#f59e0b88" strokeDasharray="4 3"
                label={{ value: 'warn', position: 'right', fill: '#f59e0b', fontSize: 9 }} />
            )}
            {meta.critAt && (
              <ReferenceLine y={meta.critAt} stroke="#ef444488" strokeDasharray="4 3"
                label={{ value: 'crit', position: 'right', fill: '#ef4444', fontSize: 9 }} />
            )}

            {/* Actual line */}
            <Line
              dataKey="actual"
              stroke={meta.color}
              strokeWidth={2}
              dot={false}
              name="Actual"
              isAnimationActive={false}
              connectNulls
            />

            {/* Forecast dashed line */}
            <Line
              dataKey="forecast"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              name="Forecast"
              isAnimationActive={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── per-chart insight ── */}
      {insight && (
        <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
          <span className="text-[11px] mt-0.5 shrink-0">🤖</span>
          <p
            className="text-[11.5px] leading-relaxed text-indigo-900"
            dangerouslySetInnerHTML={{
              __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            }}
          />
        </div>
      )}
    </div>
  )
}
