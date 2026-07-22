/**
 * PredictionPage — Matches the app's light design system.
 *
 * Uses bg-card, border-line, text-ink, text-ink-soft, etc. so it looks
 * identical in style to the Incidents, Logs and Financial Monitor pages.
 */
import { useState, useMemo } from 'react'
import {
  TrendingUp, ChevronDown, RefreshCw, AlertTriangle,
  Sparkles, Clock, Activity, Radio, ShieldAlert, ShieldCheck,
  AlertCircle, Loader2, ChevronRight
} from 'lucide-react'
import { METRICS, METRIC_META } from '../hooks/useForecastData'
import { usePrediction } from '../context/PredictionContext'
import ForecastChart from '../components/prediction/ForecastChart'
import TrafficChart from '../components/prediction/TrafficChart'
import LiveBadge from '../components/servicemap/LiveBadge'

const COMPONENTS = [
  'api-gateway', 'auth-service', 'data-warehouse', 'email-provider',
  'inventory-service', 'load-balancer', 'message-queue',
  'notification-service', 'order-service', 'payment-gateway',
  'payment-service', 'primary-db', 'redis-cache',
  'search-service', 'user-service', 'web-portal'
]

const HOURS_OPTIONS = [
  { value: 6,  label: 'Last 6 h' },
  { value: 12, label: 'Last 12 h' },
  { value: 24, label: 'Last 24 h' },
  { value: 48, label: 'Last 48 h' },
]

const FORECAST_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '1 day' },
]

function InlineMarkdown({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i} className="font-semibold text-ink">{p.slice(2, -2)}</strong>
          : <span key={i}>{p}</span>
      )}
    </>
  )
}

const RISK_STYLES = {
  critical: {
    border: 'border-red-200',
    bg: 'bg-red-50',
    badge: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500 animate-pulse',
    icon: ShieldAlert,
    iconColor: 'text-red-500',
    label: 'Critical',
  },
  warning: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    label: 'Warning',
  },
  healthy: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    label: 'Healthy',
  },
}

function SystemAnalysisBanner({ systemAnalysis, systemLoading, onSelectComponent }) {
  const [open, setOpen] = useState(true)

  if (systemLoading) {
    return (
      <div className="rounded-xl border border-line bg-card shadow-card p-5">
        <div className="flex items-center gap-3 text-ink-soft">
          <Loader2 size={16} className="animate-spin text-indigo-500" />
          <span className="text-[13px]">Analysing all {16} components across the system with Gemini AI…</span>
        </div>
      </div>
    )
  }

  if (!systemAnalysis) return null

  const { summary, risk_table = [], stats = {}, generated_at } = systemAnalysis
  const topRisk = risk_table.slice(0, 6)

  // Determine overall system state
  const overallRisk = stats.critical > 0 ? 'critical' : stats.warning > 0 ? 'warning' : 'healthy'
  const rs = RISK_STYLES[overallRisk]
  const RiskIcon = rs.icon

  return (
    <div className={`rounded-xl border ${rs.border} overflow-hidden shadow-card`}>
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 ${rs.bg} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 border ${rs.border}`}>
            <RiskIcon size={16} className={rs.iconColor} />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-bold text-ink">System-Wide AI Analysis</p>
              <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${rs.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${rs.dot}`} />
                {rs.label}
              </span>
            </div>
            <p className="text-[11px] text-ink-faint">
              {stats.total_components} components · {stats.critical} critical · {stats.warning} warning · {stats.healthy} healthy
              {generated_at && ` · Updated ${new Date(generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <ChevronDown size={15} className={`text-ink-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="bg-card border-t border-line">
          {/* AI summary paragraph */}
          <div className="px-5 py-4 border-b border-line">
            {summary ? (
              <p className="text-[13px] leading-relaxed text-ink-soft">
                <InlineMarkdown text={summary} />
              </p>
            ) : (
              <p className="text-[12px] text-ink-faint italic">AI summary unavailable.</p>
            )}
          </div>

          {/* Component risk table */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint mb-3">
              Component Risk Overview (top {topRisk.length})
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {topRisk.map(row => {
                const s = RISK_STYLES[row.risk_level] || RISK_STYLES.healthy
                const RowIcon = s.icon
                return (
                  <button
                    key={row.component}
                    onClick={() => onSelectComponent(row.component)}
                    className="flex items-center justify-between rounded-lg border border-line bg-muted/50 px-3 py-2.5 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      <div>
                        <p className="text-[12px] font-semibold text-ink group-hover:text-indigo-700">{row.component}</p>
                        <p className="text-[10px] text-ink-faint">
                          {row.anomaly_windows} windows · top: {row.top_metric?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold rounded-full border px-1.5 py-0.5 ${s.badge}`}>
                        {s.label}
                      </span>
                      <ChevronRight size={12} className="text-ink-faint group-hover:text-indigo-500" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PredictionPage() {
  const [summaryOpen, setSummaryOpen] = useState(true)

  const {
    component, setComponent,
    hours, setHours,
    forecastMinutes, setForecastMinutes,
    charts, summary, systemAnalysis,
    trafficData,
    summaryLoading, chartsLoading, systemLoading,
    trafficLoading,
    refetch,
  } = usePrediction()

  const totalAnomalyWindows = useMemo(() => {
    return Object.values(charts).reduce((n, c) => n + (c.anomaly_windows?.length || 0), 0)
  }, [charts])

  const riskLabel = useMemo(() => {
    if (totalAnomalyWindows === 0) return { label: 'Healthy', color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' }
    if (totalAnomalyWindows <= 2)  return { label: 'Warning',  color: 'text-amber-600',   dot: 'bg-amber-500',   bg: 'bg-amber-50 border-amber-200' }
    return                                { label: 'Critical',  color: 'text-red-600',     dot: 'bg-red-500 animate-pulse', bg: 'bg-red-50 border-red-200' }
  }, [totalAnomalyWindows])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 pb-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <TrendingUp size={20} className="text-indigo-500" />
              <h1 className="text-xl font-semibold tracking-tight text-ink">Prediction & Forecasting</h1>
              <LiveBadge />
            </div>
            <p className="mt-0.5 text-sm text-ink-soft">
              ML anomaly detection · 30-min rolling forecast · Gemini AI analysis
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${riskLabel.bg}`}>
              <span className={`h-2 w-2 rounded-full ${riskLabel.dot}`} />
              <span className={`text-xs font-bold ${riskLabel.color}`}>{riskLabel.label}</span>
              {totalAnomalyWindows > 0 && (
                <span className={`text-xs ${riskLabel.color} opacity-70`}>· {totalAnomalyWindows} window{totalAnomalyWindows > 1 ? 's' : ''}</span>
              )}
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink-soft shadow-card hover:bg-muted transition-colors"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── System-wide AI analysis banner ───────────────────────────────── */}
        <SystemAnalysisBanner
          systemAnalysis={systemAnalysis}
          systemLoading={systemLoading}
          onSelectComponent={setComponent}
        />

        {/* ── Selectors ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-line bg-card shadow-card p-4 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Drill-Down Telemetry Component</span>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink focus:border-indigo-500 focus:outline-none shadow-sm cursor-pointer"
              >
                {COMPONENTS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Time Horizon</span>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-muted p-1">
                {HOURS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setHours(opt.value)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      hours === opt.value
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Forecast Horizon</span>
              <div className="flex items-center gap-1 rounded-lg border border-line bg-muted p-1">
                {FORECAST_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForecastMinutes(opt.value)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      forecastMinutes === opt.value
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-ink-soft hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-ink-faint">
            Telemetry Target: <strong className="text-indigo-600 font-semibold">{component}</strong>
          </div>
        </div>

        {/* ── AI Summary (collapsable) ─────────────────────────────────────── */}
        <div className="rounded-xl border border-line bg-card shadow-card overflow-hidden">
          <button
            onClick={() => setSummaryOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
                <Sparkles size={13} className="text-indigo-500" />
              </span>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-ink">AI Forecast Summary</p>
                <p className="text-[11px] text-ink-faint">Gemini-powered health analysis for {component}</p>
              </div>
              {!summaryLoading && totalAnomalyWindows > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  <AlertTriangle size={9} />
                  {totalAnomalyWindows} anomaly windows
                </span>
              )}
            </div>
            <ChevronDown
              size={15}
              className={`text-ink-faint transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {summaryOpen && (
            <div className="border-t border-line px-5 py-4 bg-slate-50/50">
              {summaryLoading ? (
                <div className="flex items-center gap-2.5 text-ink-soft">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <span className="text-[13px]">Generating AI analysis…</span>
                </div>
              ) : summary ? (
                <p className="text-[13px] leading-relaxed text-ink-soft">
                  <InlineMarkdown text={summary} />
                </p>
              ) : (
                <p className="text-[12px] text-ink-faint italic">
                  Summary unavailable. Ensure the backend is running.
                </p>
              )}

              {/* Stats row */}
              {!chartsLoading && Object.keys(charts).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { icon: Activity,       label: 'Metrics tracked',  value: `${Object.keys(charts).length} / ${METRICS.length}` },
                    { icon: AlertTriangle,  label: 'Anomaly windows',  value: totalAnomalyWindows, alert: totalAnomalyWindows > 0 },
                    { icon: Clock,         label: 'Forecast horizon',  value: '30 min' },
                    { icon: Radio,          label: 'Detector',         value: 'IsoForest + z-score' },
                  ].map(({ icon: Icon, label, value, alert }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2">
                      <Icon size={13} className={alert ? 'text-amber-500' : 'text-ink-faint'} />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{label}</p>
                        <p className={`text-[13px] font-bold ${alert ? 'text-amber-600' : 'text-ink'}`}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Traffic Overview ────────────────────────────────────────────── */}
        <TrafficChart
          trafficData={trafficData}
          isLoading={trafficLoading}
          component={component}
        />

        {/* ── Legend ────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-5 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-7 rounded bg-indigo-500 inline-block" />
            Actual (historical)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-7 h-0" style={{ borderTop: '2px dashed #8b5cf6' }} />
            Forecast (next {forecastMinutes} min)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-7 rounded inline-block border border-red-300 bg-red-50" />
            Anomaly window
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-7 rounded inline-block" style={{ background: 'rgba(99,102,241,0.10)' }} />
            Baseline band (μ ± σ)
          </span>
        </div>

        {/* ── Chart grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {METRICS.map(metric => (
            <ForecastChart
              key={`${component}-${metric}`}
              metric={metric}
              chartData={charts[metric]}
              isLoading={chartsLoading}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
