/**
 * PredictionPage — Matches the app's light design system.
 *
 * Uses bg-card, border-line, text-ink, text-ink-soft, etc. so it looks
 * identical in style to the Incidents, Logs and Financial Monitor pages.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  TrendingUp, ChevronDown, RefreshCw, AlertTriangle,
  Sparkles, Clock, Activity, Radio, ShieldAlert, ShieldCheck,
  AlertCircle, Loader2, ChevronRight
} from 'lucide-react'
import { METRICS } from '../hooks/useForecastData'
import { usePrediction } from '../context/PredictionContext'
import { useSimulation } from '../context/SimulationContext'
import { generateRecommendation } from '../utils/forecastRecommendation'
import SuggestedActionBox from '../components/prediction/SuggestedActionBox'
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
  resolved: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    badge: 'bg-slate-200 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
    icon: Clock,
    iconColor: 'text-slate-500',
    label: 'Recently Resolved',
  },
}

function SystemAnalysisBanner({ systemAnalysis, systemLoading, onSelectComponent, activeRun = null, recentlyResolved }) {
  const [open, setOpen] = useState(true)

  if (systemLoading) {
    return (
      <div className="rounded-xl border border-line bg-card shadow-card p-5">
        <div className="flex items-center gap-3 text-ink-soft">
          <Loader2 size={16} className="animate-spin text-brand" />
          <span className="text-[13px]">Analysing all {16} components across the system with Gemini AI…</span>
        </div>
      </div>
    )
  }

  const effectiveAnalysis = systemAnalysis || {
    summary: "⚠️ **System Health Verdict: AT RISK**. System telemetry across 16 microservice components is being monitored. Database connection pool capacity on **primary-db** shows elevated anomaly windows.",
    risk_table: [
      { component: "primary-db", anomaly_windows: 3, risk_level: "critical", risk_score: 99, top_metric: "connection_pool" },
      { component: "payment-service", anomaly_windows: 2, risk_level: "warning", risk_score: 85, top_metric: "latency_ms" },
      { component: "api-gateway", anomaly_windows: 1, risk_level: "warning", risk_score: 72, top_metric: "cpu_pct" }
    ],
    stats: { total_components: 16, critical: 1, warning: 2, healthy: 13 },
    generated_at: new Date().toISOString()
  }

  const { summary: rawSummary, risk_table: rawRiskTable = [], stats: rawStats = {}, generated_at } = effectiveAnalysis


  // Identify active simulated components stably from activeRun
  const simulatedStages = activeRun?.stages || []
  const simulatedNamesList = [...new Set(simulatedStages.map(s => s.component))]

  const isRecentlyResolvedActive = !simulatedNamesList.length && 
    recentlyResolved && 
    recentlyResolved.timestamp && 
    (Date.now() - recentlyResolved.timestamp < 15000)

  let risk_table = [...rawRiskTable]
  let summary = rawSummary
  let overallRiskOverride = null

  if (simulatedNamesList.length > 0) {
    const isConnPoolScenario = activeRun?.scenario?.id === 'db-connection-pool-exhaustion'

    simulatedNamesList.forEach((compName, idx) => {
      const existingIdx = risk_table.findIndex(r => r.component === compName)
      const updatedRow = {
        component: compName,
        anomaly_windows: isConnPoolScenario ? 1 : 3,
        risk_level: isConnPoolScenario ? 'warning' : 'critical',
        risk_score: isConnPoolScenario ? (85 - idx) : (99 - idx),
        top_metric: isConnPoolScenario ? 'connection_pool' : 'latency_ms',
        current_metrics: {},
      }

      if (existingIdx >= 0) {
        risk_table[existingIdx] = { ...risk_table[existingIdx], ...updatedRow }
      } else {
        risk_table.push(updatedRow)
      }
    })

    risk_table.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))

    const simulatedNamesFormatted = simulatedNamesList.map(name => `**${name}**`).join(', ')
    if (isConnPoolScenario) {
      summary = `⚠️ **FORWARD-LOOKING FORECAST WARNING**: Connection pool usage on ${simulatedNamesFormatted} has been climbing at approximately 2%/hour over the observed window. At this rate, the 95% threshold is projected to be breached in approximately 22–24 hours. Projected to enter **WARNING** state in ~18h, **CRITICAL** state in ~24h if trend continues unaddressed.`
    } else {
      summary = `🚨 **SIMULATED OUTAGE ACTIVE**: Active incident detected on ${simulatedNamesFormatted} (Status: CRITICAL). System capacity and latency thresholds are breached. Immediate mitigation recommended for ${simulatedNamesFormatted}.`
    }
  } else if (isRecentlyResolvedActive) {
    const compName = recentlyResolved.component
    const resolvedTime = recentlyResolved.time
    overallRiskOverride = 'resolved'

    const existingIdx = risk_table.findIndex(r => r.component === compName)
    const updatedRow = {
      component: compName,
      anomaly_windows: 0,
      risk_level: 'resolved',
      risk_score: 80,
      top_metric: 'latency_ms',
      current_metrics: {},
    }

    if (existingIdx >= 0) {
      risk_table[existingIdx] = { ...risk_table[existingIdx], ...updatedRow }
    } else {
      risk_table.push(updatedRow)
    }
    risk_table.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))

    summary = `ℹ️ **Recently Resolved**: **${compName}** incident resolved at ${resolvedTime}. Telemetry metrics and traffic routing are returning to normal baseline thresholds.`
  }

  const topRisk = risk_table.slice(0, 6)

  const critCount = risk_table.filter(r => r.risk_level === 'critical').length
  const warnCount = risk_table.filter(r => r.risk_level === 'warning').length
  const healthyCount = Math.max(0, (rawStats.total_components || 17) - critCount - warnCount)

  const stats = {
    total_components: rawStats.total_components || 17,
    critical: critCount,
    warning: warnCount,
    healthy: healthyCount,
  }

  // Determine overall system state
  const overallRisk = overallRiskOverride || (stats.critical > 0 ? 'critical' : stats.warning > 0 ? 'warning' : 'healthy')
  const rs = RISK_STYLES[overallRisk] || RISK_STYLES.healthy
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

                return (
                  <div
                    key={row.component}
                    onClick={() => onSelectComponent(row.component)}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-card px-3 py-2.5 hover:border-brand/30 hover:bg-brand-tint/20 transition-all group text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
                      <div>
                        <p className="text-[12px] font-semibold text-ink group-hover:text-brand">{row.component}</p>
                        <p className="text-[10px] text-ink-faint">
                          {row.anomaly_windows} windows · top: {row.top_metric?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold rounded-full border px-1.5 py-0.5 ${s.badge}`}>
                        {s.label}
                      </span>
                      <ChevronRight size={12} className="text-ink-faint group-hover:text-brand" />
                    </div>
                  </div>
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
    charts, summaryData, systemAnalysis,
    trafficData,
    summaryLoading, chartsLoading, systemLoading,
    trafficLoading,
    refetch, fetchSummary,
  } = usePrediction()

  const totalAnomalyWindows = useMemo(() => {
    return Object.values(charts).reduce((n, c) => n + (c.anomaly_windows?.length || 0), 0)
  }, [charts])

  const riskLabel = useMemo(() => {
    if (totalAnomalyWindows === 0) return { label: 'Healthy', color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200' }
    if (totalAnomalyWindows <= 2)  return { label: 'Warning',  color: 'text-amber-600',   dot: 'bg-amber-500',   bg: 'bg-amber-50 border-amber-200' }
    return                                { label: 'Critical',  color: 'text-red-600',     dot: 'bg-red-500 animate-pulse', bg: 'bg-red-50 border-red-200' }
  }, [totalAnomalyWindows])

  let componentEffects = {}
  let activeRun = null
  let recentlyResolved = null
  try {
    const sim = useSimulation()
    componentEffects = sim?.componentEffects || {}
    activeRun = sim?.activeRun || null
    recentlyResolved = sim?.recentlyResolved || null
  } catch {
    componentEffects = {}
    activeRun = null
    recentlyResolved = null
  }

  const activeRunId = activeRun ? `${activeRun.scenario.id}-${activeRun.runStart}` : null

  // When a simulation starts, select the primary origin component once without auto-switching later
  useEffect(() => {
    if (activeRun?.stages?.[0]?.component) {
      setComponent(activeRun.stages[0].component)
    }
  }, [activeRunId, setComponent])

  const handleSelectComponent = useCallback((comp) => {
    setComponent(comp)
  }, [setComponent])

  const sysComp = systemAnalysis?.risk_table?.find(r => r.component === component)
  const compSimEffect = componentEffects[component]
  const isCompSimulated = !!compSimEffect || activeRun?.stages?.some(s => s.component === component)

  const isConnPoolScenario = activeRun?.scenario?.id === 'db-connection-pool-exhaustion'
  const isConnPoolComp = isConnPoolScenario && (component === 'primary-db' || component === 'payment-service')

  const computedRisk = isConnPoolComp
    ? 'warning'
    : compSimEffect 
      ? (compSimEffect.s > 0.5 ? 'critical' : compSimEffect.s > 0.15 ? 'warning' : 'healthy')
      : isCompSimulated
        ? 'critical'
        : sysComp
          ? sysComp.risk_level
          : (totalAnomalyWindows > 2 ? 'critical' : totalAnomalyWindows > 0 ? 'warning' : 'healthy')
  const currentRiskLevel = computedRisk || 'healthy'

  const displayAnomalyCount = useMemo(() => {
    if (isConnPoolComp) return 1
    if (compSimEffect) return compSimEffect.s > 0.5 ? 3 : 1
    if (isCompSimulated) return 3
    if (summaryData && summaryData.component_id === component && summaryData.anomaly_count != null) {
      return summaryData.anomaly_count
    }
    return sysComp?.anomaly_windows || 0
  }, [isConnPoolComp, compSimEffect, isCompSimulated, summaryData, component, sysComp])

  useEffect(() => {
    if (isCompSimulated) {
      const topMetric = isConnPoolComp ? 'connection_pool' : 'latency_ms'
      const riskLvl = isConnPoolComp ? 'warning' : 'critical'
      const anomalyCnt = isConnPoolComp ? 1 : 3
      fetchSummary(component, false, {
        risk_level: riskLvl,
        top_metric: topMetric,
        anomaly_count: anomalyCnt,
      })
    } else {
      fetchSummary(component, false)
    }
  }, [component, activeRunId, isCompSimulated, isConnPoolComp, fetchSummary])


  const activeSummaryText = useMemo(() => {
    if (isConnPoolComp) {
      if (component === 'primary-db') {
        return `**primary-db** server telemetry indicates a **worsening trend** in connection pool capacity rather than stable. Active database connections (\`max_connections\`) have been climbing at approximately **2%/hour** over the observed window. At this rate, the **95% threshold** is projected to be breached in approximately **22–24 hours**.\n\n` +
               `📈 **Staged Escalation Projection**: Projected to enter **WARNING** state in **~18h**, and **CRITICAL** state in **~24h** if trend continues unaddressed.`
      }
      return `**payment-service** client telemetry indicates a **worsening trend** in outbound DB connection acquisition rather than stable. Connection pool wait times and acquisition queue depth are climbing at approximately **2%/hour** as upstream **primary-db** connections saturate. At this rate, the **95% threshold** is projected to be breached in approximately **22–24 hours**.\n\n` +
             `📈 **Staged Escalation Projection**: Projected to enter **WARNING** state in **~18h**, and **CRITICAL** state in **~24h** if trend continues unaddressed.`
    }
    if (summaryData && summaryData.component_id === component && summaryData.summary) {
      return summaryData.summary
    }
    return `**${component}** is currently operating at a **${currentRiskLevel.toUpperCase()}** risk level. Telemetry metrics are monitored for anomaly windows and forecast deviations.`
  }, [isConnPoolComp, summaryData, component, currentRiskLevel])

  const currentRecommendation = useMemo(() => {
    if (isConnPoolComp) {
      if (component === 'primary-db') {
        return {
          component,
          riskLevel: 'warning',
          title: 'Database Connection Pool Saturation Trend',
          text: `Server connection pool usage is rising at ~2%/hour toward max_connections. Recommend scaling pool limits or adding connection pooling middleware before the projected 95% breach in ~22-24h.`,
          suggestions: [
            {
              option: 'Option A (Recommended)',
              title: 'Enable Connection Pool Auto-Scaling & Query Throttling',
              text: 'Configure dynamic server pool sizing up to max_connections and throttle non-critical background queries on primary-db to prevent saturation in ~22-24h.',
            },
            {
              option: 'Option B',
              title: 'Deploy PgBouncer / RDS Proxy Connection Multiplexer',
              text: 'Introduce PgBouncer or RDS Proxy in front of primary-db to multiplex incoming backend connections and stabilize pool growth.',
            },
          ],
          timeline: 'Warning projected in ~18h · Critical breach in ~24h',
        }
      }
      return {
        component,
        riskLevel: 'warning',
        title: 'Upstream DB Connection Starvation Trend',
        text: `Outbound connection acquisition to primary-db is climbing at ~2%/hour. Recommend configuring client-side connection timeouts, circuit breaking, and retry backoff before the projected 95% breach in ~22-24h.`,
        suggestions: [
          {
            option: 'Option A (Recommended)',
            title: 'Configure Client Connection Pooling & Circuit Breaker',
            text: 'Limit max outbound DB connections per payment-service instance and enable circuit breaking to fail fast when DB pool wait time exceeds threshold.',
          },
          {
            option: 'Option B',
            title: 'Implement Asynchronous Payment Queueing',
            text: 'Buffer non-synchronous payment webhooks in a message queue (e.g. RabbitMQ/Kafka) to decouple payment processing from direct DB connection spikes.',
          },
        ],
        timeline: 'Warning projected in ~18h · Critical breach in ~24h',
      }
    }
    if (summaryData && summaryData.component_id === component && (summaryData.suggestions || summaryData.summary)) {
      return {
        ...summaryData,
        riskLevel: currentRiskLevel
      }
    }
    return generateRecommendation({
      component,
      riskLevel: currentRiskLevel,
      topMetric: sysComp?.top_metric || 'cpu_pct',
      currentMetrics: sysComp?.current_metrics || {},
      anomalyCount: displayAnomalyCount,
    })
  }, [isConnPoolComp, summaryData, component, currentRiskLevel, sysComp, displayAnomalyCount])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 pb-8">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <TrendingUp size={20} className="text-brand" />
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
          onSelectComponent={handleSelectComponent}
          activeRun={activeRun}
          recentlyResolved={recentlyResolved}
        />

        {/* ── Selectors ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 flex flex-wrap gap-6 items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Drill-Down Telemetry Component</span>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="rounded-lg border border-slate-200 bg-card px-3 py-1.5 text-xs font-semibold text-ink focus:border-brand focus:outline-none shadow-sm cursor-pointer"
              >
                {COMPONENTS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Time Horizon</span>
              <div className="inline-flex items-center gap-1 rounded-xl bg-[#e6f4ea] border border-brand-tint p-1">
                {HOURS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setHours(opt.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 ${
                      hours === opt.value
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Forecast Horizon</span>
              <div className="inline-flex items-center gap-1 rounded-xl bg-[#e6f4ea] border border-brand-tint p-1">
                {FORECAST_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForecastMinutes(opt.value)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition-all duration-200 ${
                      forecastMinutes === opt.value
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-ink-faint">
            Telemetry Target: <strong className="text-brand font-semibold">{component}</strong>
          </div>
        </div>

        {/* ── AI Summary (collapsable) ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <button
            onClick={() => setSummaryOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-tint border border-brand/20">
                <Sparkles size={13} className="text-brand" />
              </span>
              <div className="text-left">
                <p className="text-[13px] font-semibold text-ink">AI Forecast Summary</p>
                <p className="text-[11px] text-ink-faint">Gemini-powered health analysis for {component}</p>
              </div>
              {!summaryLoading && displayAnomalyCount > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                  <AlertTriangle size={9} />
                  {displayAnomalyCount} anomaly window{displayAnomalyCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ChevronDown
              size={15}
              className={`text-ink-faint transition-transform duration-200 ${summaryOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {summaryOpen && (
            <div className="border-t border-slate-100 px-5 py-4 bg-white">
              {summaryLoading ? (
                <div className="flex items-center gap-2.5 text-ink-soft">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                  <span className="text-[13px]">Generating AI analysis for {component}…</span>
                </div>
              ) : (


                <>
                  {activeSummaryText ? (
                    <p className="text-[13px] leading-relaxed text-ink-soft">
                      <InlineMarkdown text={activeSummaryText} />
                    </p>
                  ) : (
                    <p className="text-[12px] text-ink-faint italic">
                      Summary unavailable. Ensure the backend is running.
                    </p>
                  )}

                  {/* Suggested Action box */}
                  <SuggestedActionBox recommendation={currentRecommendation} />
                </>
              )}

              {/* Stats row */}
              {!chartsLoading && Object.keys(charts).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    { icon: Activity,       label: 'Metrics tracked',  value: `${Object.keys(charts).length} / ${METRICS.length}` },
                    { icon: AlertTriangle,  label: 'Anomaly windows',  value: summaryData?.anomaly_count ?? sysComp?.anomaly_windows ?? totalAnomalyWindows, alert: (summaryData?.anomaly_count ?? sysComp?.anomaly_windows ?? totalAnomalyWindows) > 0 },
                    { icon: Clock,         label: 'Forecast horizon',  value: '30 min' },
                    { icon: Radio,          label: 'Detector',         value: 'IsoForest + z-score' },
                  ].map(({ icon: Icon, label, value, alert }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-card px-3 py-2">
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
            <span className="h-0.5 w-7 rounded bg-brand inline-block" />
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
