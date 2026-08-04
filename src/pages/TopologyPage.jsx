import { useState, useMemo } from 'react'
import ServiceMapPanel from '../components/ServiceMapPanel'
import { useSimulatedNodes } from '../hooks/useSimulatedNodes'
import { useSimulation } from '../context/SimulationContext'
import LiveBadge from '../components/servicemap/LiveBadge'
import ServiceMapToolbar from '../components/servicemap/ServiceMapToolbar'
import {
  Sparkles, TrendingUp, ShieldAlert, Cpu, Network, Info, 
  AlertTriangle, CheckCircle2, Database, ShieldCheck, X, Zap 
} from 'lucide-react'

// Mock SRE telemetry data for 24 hours (12 points, every 2 hours)
const TELEMETRY_DATA = {
  latency: {
    max: 350,
    auth: [40, 42, 45, 120, 110, 45, 43, 41, 44, 46, 42, 40],
    db: [20, 22, 28, 85, 90, 30, 25, 21, 23, 24, 22, 20],
    gateway: [110, 115, 120, 320, 280, 130, 125, 118, 122, 125, 115, 110]
  },
  errors: {
    max: 10,
    auth: [0.1, 0.1, 0.2, 5.4, 4.2, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1],
    db: [0.0, 0.0, 0.1, 1.2, 1.0, 0.1, 0.0, 0.0, 0.1, 0.0, 0.0, 0.0],
    gateway: [0.5, 0.6, 0.8, 8.5, 6.2, 0.9, 0.7, 0.5, 0.6, 0.7, 0.5, 0.4]
  },
  cpu: {
    max: 100,
    auth: [15, 18, 22, 78, 65, 20, 17, 16, 19, 18, 15, 14],
    db: [25, 28, 35, 92, 88, 38, 30, 26, 29, 31, 27, 24],
    gateway: [8, 10, 12, 15, 14, 11, 9, 8, 10, 9, 8, 7]
  }
}

const HOURS = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']

export default function TopologyPage() {
  const nodes = useSimulatedNodes()
  const { activeRun } = useSimulation()
  const [showDeepDive, setShowDeepDive] = useState(false)
  const [activeTab, setActiveTab] = useState('latency') // 'latency' | 'errors' | 'cpu'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [appliedUpgrades, setAppliedUpgrades] = useState({
    authReplicas: false,
    dbReplicas: false,
    paymentCircuitBreaker: false
  })

  // Dynamic scenario-aware AI summary text
  const aiSummaryText = useMemo(() => {
    if (!activeRun) {
      return 'System topology is stable. 17 services are healthy. 2 high-risk Single Points of Failure (SPOFs) exist in the auth and database tiers due to single-instance setups.'
    }
    const scenarioId = activeRun.scenario.id
    if (scenarioId.includes('db')) {
      return 'Database connections are saturated. Query pools on primary-db are exhausted, causing downstream connection pool locks in payment-service.'
    } else if (scenarioId.includes('payment') || scenarioId.includes('leak') || scenarioId.includes('outage')) {
      return 'Critical degradation in payment-service. High request queuing and memory leak OOM risk is blocking outbound transaction confirmations.'
    } else if (scenarioId.includes('traffic')) {
      return 'Edge traffic surge has saturated the load-balancer. High request amplification is currently flooding the api-gateway and payment-service.'
    } else if (scenarioId.includes('network') || scenarioId.includes('banking')) {
      return 'Outbound packet loss detected between payment-service and external payment-gateway. Outbound transaction timeouts are critical.'
    }
    return `AI detected active anomaly on service "${activeRun.scenario.title}". Elevated response times and error rates are cascading upstream.`
  }, [activeRun])

  // Dynamic telemetry injector based on live activeRun simulation
  const telemetryData = useMemo(() => {
    const base = JSON.parse(JSON.stringify(TELEMETRY_DATA))
    if (!activeRun) return base

    const scenarioId = activeRun.scenario.id

    if (scenarioId.includes('db')) {
      if (appliedUpgrades.dbReplicas) {
        // Damped database curves
        base.latency.db = [20, 22, 28, 30, 25, 30, 25, 21, 45, 62, 50, 20]
        base.errors.db = [0.0, 0.0, 0.1, 0.1, 0.1, 0.1, 0.0, 0.0, 0.1, 0.2, 0.1, 0.0]
        base.cpu.db = [25, 28, 35, 32, 28, 38, 30, 26, 35, 45, 38, 24]
      } else {
        base.latency.db = [20, 22, 28, 30, 25, 30, 25, 21, 195, 280, 180, 20]
        base.errors.db = [0.0, 0.0, 0.1, 0.1, 0.1, 0.1, 0.0, 0.0, 4.5, 8.2, 5.0, 0.0]
        base.cpu.db = [25, 28, 35, 32, 28, 38, 30, 26, 88, 98, 92, 24]
      }
    } else if (scenarioId.includes('payment') || scenarioId.includes('network') || scenarioId.includes('leak') || scenarioId.includes('outage')) {
      if (appliedUpgrades.paymentCircuitBreaker) {
        base.latency.gateway = [110, 115, 120, 130, 125, 130, 125, 118, 120, 130, 125, 110]
        base.errors.gateway = [0.5, 0.6, 0.8, 0.9, 0.7, 0.9, 0.7, 0.5, 0.6, 0.7, 0.6, 0.4]
        base.cpu.gateway = [8, 10, 12, 15, 14, 11, 9, 8, 12, 15, 13, 7]
      } else {
        base.latency.gateway = [110, 115, 120, 130, 125, 130, 125, 118, 290, 345, 310, 110]
        base.errors.gateway = [0.5, 0.6, 0.8, 0.9, 0.7, 0.9, 0.7, 0.5, 8.2, 9.8, 7.5, 0.4]
        base.cpu.gateway = [8, 10, 12, 15, 14, 11, 9, 8, 48, 85, 76, 7]
      }
    } else if (scenarioId.includes('traffic')) {
      if (appliedUpgrades.authReplicas) {
        base.latency.auth = [40, 42, 45, 48, 42, 45, 43, 41, 45, 52, 46, 40]
        base.errors.auth = [0.1, 0.1, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.1, 0.1]
        base.cpu.auth = [15, 18, 22, 25, 20, 20, 17, 16, 22, 28, 24, 14]
      } else {
        base.latency.auth = [40, 42, 45, 48, 42, 45, 43, 41, 180, 290, 210, 40]
        base.errors.auth = [0.1, 0.1, 0.2, 0.2, 0.1, 0.1, 0.1, 0.1, 6.2, 8.8, 4.5, 0.1]
        base.cpu.auth = [15, 18, 22, 25, 20, 20, 17, 16, 78, 92, 85, 14]
      }

      if (appliedUpgrades.dbReplicas) {
        base.latency.db = [20, 22, 28, 30, 25, 30, 25, 21, 26, 32, 29, 20]
        base.cpu.db = [25, 28, 35, 32, 28, 38, 30, 26, 30, 38, 32, 24]
      } else {
        base.latency.db = [20, 22, 28, 30, 25, 30, 25, 21, 145, 230, 150, 20]
        base.cpu.db = [25, 28, 35, 32, 28, 38, 30, 26, 78, 89, 81, 24]
      }
    }
    return base
  }, [activeRun, appliedUpgrades])

  // Calculate live health metrics based on runtime simulation
  const healthMetrics = useMemo(() => {
    const total = nodes.length
    if (total === 0) return { healthScore: 100, degradedNodes: [] }

    const degraded = nodes.filter(n => n.health !== 'healthy')
    const healthScore = Math.max(0, 100 - (degraded.length * 25))

    return {
      healthScore,
      degradedNodes: degraded
    }
  }, [nodes])

  const { healthScore, degradedNodes } = healthMetrics

  return (
    <div className="h-full flex flex-col gap-4 min-h-0">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <Network size={20} className="text-indigo-600" />
            <h1 className="text-xl font-semibold tracking-tight text-ink">Topology</h1>
            <LiveBadge />
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            Real-time service dependencies · Traffic flow visualization · AI SRE insights
          </p>
        </div>

        {/* Header Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(prev => !prev)}
            className={`flex h-9 items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer text-[12.5px] font-bold ${
              sidebarOpen
                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                : 'border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100/80'
            }`}
          >
            <Sparkles size={13} className={`transition-transform duration-300 ${sidebarOpen ? 'scale-110' : 'animate-pulse'}`} />
            SRE Insights
          </button>
          <ServiceMapToolbar query={query} onQueryChange={setQuery} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row gap-4">
        {/* Interactive Service Map Panel */}
        <ServiceMapPanel 
          query={query}
          sidebarOpen={sidebarOpen}
          appliedUpgrades={appliedUpgrades}
        />

      {/* AI SRE Insights Panel (Right Sidebar) */}
      {sidebarOpen && (
        <div className="w-full xl:w-96 shrink-0 flex flex-col h-full bg-card border border-line rounded-card p-5 shadow-card overflow-y-auto animate-slide-in">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-600 animate-pulse shrink-0" />
              <div>
                <h2 className="text-[15px] font-bold text-ink">AI SRE Insights</h2>
                <p className="text-[11px] text-ink-soft">Real-time architecture bottleneck audits</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-all cursor-pointer shrink-0 ml-auto"
              title="Hide Insights"
            >
              <X size={16} />
            </button>
          </div>

        {/* Health Score Gauge */}
        <div className="flex flex-col items-center gap-2 py-4 bg-muted/30 border border-line/50 rounded-xl mb-4">
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-line"
              />
              <circle
                cx="48"
                cy="48"
                r="40"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * healthScore) / 100}
                className={`transition-all duration-700 ${
                  healthScore >= 90 ? 'text-emerald-500' : healthScore >= 70 ? 'text-amber-500' : 'text-red-500'
                }`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[19px] font-extrabold text-ink leading-none">{healthScore}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-ink-soft mt-0.5">Uptime</span>
            </div>
          </div>
          <div className="text-center px-4 mt-1">
            <p className="text-xs font-bold text-ink">
              {healthScore === 100 ? 'System Health Optimal' : 'Degraded System Performance'}
            </p>
            <p className="text-[11px] text-ink-soft leading-relaxed mt-0.5">
              {healthScore === 100
                ? 'All 17 nodes operating within SRE baseline SLA limits.'
                : `${degradedNodes.length} node(s) showing runtime anomalies. SRE action required.`}
            </p>
          </div>
        </div>

        {/* AI summary */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 mb-4 flex gap-3">
          <Zap size={16} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">AI SRE Summary</h3>
            <p className="text-[12px] text-indigo-950/80 leading-relaxed mt-1 font-medium">
              {aiSummaryText}
            </p>
          </div>
        </div>

        {/* Runtime Bottlenecks */}
        <div className="flex flex-col gap-2.5 mb-4">
          <h3 className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp size={13} className="text-amber-600" />
            Runtime Bottlenecks
          </h3>
          {degradedNodes.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card p-3">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span className="text-[12px] text-ink-soft font-semibold">No active runtime bottlenecks.</span>
            </div>
          ) : (
            degradedNodes.map(node => (
              <div key={node.id} className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[12.5px] font-bold text-slate-800">{node.label}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                    {node.health}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-600 mt-0.5">
                  <div>RPS: <span className="font-bold text-slate-800">{node.metrics?.rps ?? 0}</span></div>
                  <div>Latency: <span className="font-bold text-slate-800">{(node.metrics?.latency ?? 0).toFixed(1)}ms</span></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Static SPOFs */}
        <div className="flex flex-col gap-2.5 mt-2 border-t border-line pt-4">
          <h3 className="text-[11.5px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert size={13} className="text-red-500" />
            Single Points of Failure
          </h3>

          {/* SPOF 1: Auth Service */}
          <div className={`flex items-start gap-3 rounded-xl border p-3.5 hover:border-indigo-100 transition-colors ${appliedUpgrades.authReplicas ? 'bg-emerald-50/20 border-emerald-200' : 'bg-card border-line'}`}>
            <ShieldCheck size={16} className={appliedUpgrades.authReplicas ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-indigo-600 shrink-0 mt-0.5'} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-ink">auth-service</span>
                <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.2 rounded ${appliedUpgrades.authReplicas ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                  {appliedUpgrades.authReplicas ? 'REDUNDANT' : 'CRITICAL'}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-soft mt-1 leading-normal">
                {appliedUpgrades.authReplicas 
                  ? 'Verify credentials with 3 distributed read-replicas. High availability active.' 
                  : 'Verifies all incoming API gateway & Web portal traffic. A crash halts 100% of user sessions.'}
              </p>
            </div>
          </div>

          {/* SPOF 2: Primary DB */}
          <div className={`flex items-start gap-3 rounded-xl border p-3.5 hover:border-indigo-100 transition-colors ${appliedUpgrades.dbReplicas ? 'bg-emerald-50/20 border-emerald-200' : 'bg-card border-line'}`}>
            <Database size={16} className={appliedUpgrades.dbReplicas ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-teal-600 shrink-0 mt-0.5'} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-ink">primary-db</span>
                <span className={`text-[9px] font-bold uppercase border px-1.5 py-0.2 rounded ${appliedUpgrades.dbReplicas ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                  {appliedUpgrades.dbReplicas ? 'REDUNDANT' : 'CRITICAL'}
                </span>
              </div>
              <p className="text-[11.5px] text-ink-soft mt-1 leading-normal">
                {appliedUpgrades.dbReplicas 
                  ? 'Primary database backed by a redundant read-replica pool. IO load split.' 
                  : 'Single data store for inventory, payments, and orders. No read-replicas or split databases.'}
              </p>
            </div>
          </div>
        </div>

        {/* Deep Dive Action Button */}
        <button
          onClick={() => setShowDeepDive(true)}
          className="w-full mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 px-4 py-3 text-[13px] font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Sparkles size={14} className="text-white/90" />
          See Details & Trends
        </button>
      </div>
      )}

      {/* SRE Telemetry Trends & Deep Dive Modal */}
      {showDeepDive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setShowDeepDive(false)}
          />
          {/* Modal Container */}
          <div className="relative w-full max-w-4xl max-h-[90vh] transform overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl transition-all border border-slate-100 flex flex-col gap-6 animate-scale-up z-10 font-sans">
            
            {/* Close Button */}
            <button 
              onClick={() => setShowDeepDive(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-violet-600" />
                <h3 className="text-[18px] font-extrabold text-slate-800">SRE Architecture Audit & Historical Trends</h3>
              </div>
              <p className="text-[12.5px] text-slate-500 mt-1">
                Deep dive analysis of infrastructure single points of failure (SPOFs) and metric telemetry.
              </p>
            </div>

            {/* SRE KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Services</span>
                <span className="text-[18px] font-extrabold text-slate-800 mt-1">17 / 17</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Bottlenecks</span>
                <span className={`text-[18px] font-extrabold mt-1 ${degradedNodes.length > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {degradedNodes.length}
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Architectural SPOFs</span>
                <span className="text-[18px] font-extrabold text-red-600 mt-1">2 Critical</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Max Latency 24h</span>
                <span className="text-[18px] font-extrabold text-slate-800 mt-1">320 ms</span>
              </div>
            </div>

            {/* Interactive Telemetry Chart */}
            <div className="border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-violet-600" />
                  <span className="text-[13px] font-bold text-slate-800">24-Hour Telemetry History</span>
                </div>
                
                {/* Metric Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button 
                    onClick={() => setActiveTab('latency')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'latency' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Latency (ms)
                  </button>
                  <button 
                    onClick={() => setActiveTab('errors')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'errors' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Error Rate (%)
                  </button>
                  <button 
                    onClick={() => setActiveTab('cpu')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${activeTab === 'cpu' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    CPU Load (%)
                  </button>
                </div>
              </div>

              {/* SVG Chart Render */}
              {(() => {
                const metricType = telemetryData[activeTab]
                const maxVal = metricType.max
                
                // Helper to map index & value into SVG viewBox (500x150) coordinates
                const getCoords = (data) => {
                  return data.map((val, idx) => {
                    const x = idx * (500 / 11)
                    const y = 150 - (val / maxVal) * 120 - 15 // Leave some margin
                    return { x, y }
                  })
                }

                const authCoords = getCoords(metricType.auth)
                const dbCoords = getCoords(metricType.db)
                const gatewayCoords = getCoords(metricType.gateway)

                const makePathStr = (coords) => coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
                const makeAreaStr = (coords) => `${makePathStr(coords)} L 500 150 L 0 150 Z`

                return (
                  <div className="flex flex-col gap-2">
                    <svg viewBox="0 0 500 150" className="w-full h-44 overflow-visible">
                      {/* Gradients definitions */}
                      <defs>
                        <linearGradient id="authGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15"/>
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                        </linearGradient>
                        <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15"/>
                          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0"/>
                        </linearGradient>
                        <linearGradient id="gatewayGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d97706" stopOpacity="0.15"/>
                          <stop offset="100%" stopColor="#d97706" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[0, 1, 2, 3].map(i => {
                        const y = 15 + i * 40
                        return (
                          <line key={i} x1="0" y1={y} x2="500" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        )
                      })}

                      {/* Area fills under paths */}
                      <path d={makeAreaStr(authCoords)} fill="url(#authGrad)" style={{ transition: 'd 500ms ease-in-out' }} />
                      <path d={makeAreaStr(dbCoords)} fill="url(#dbGrad)" style={{ transition: 'd 500ms ease-in-out' }} />
                      <path d={makeAreaStr(gatewayCoords)} fill="url(#gatewayGrad)" style={{ transition: 'd 500ms ease-in-out' }} />

                      {/* Telemetry Lines */}
                      <path d={makePathStr(authCoords)} fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'd 500ms ease-in-out, stroke 300ms ease' }} />
                      <path d={makePathStr(dbCoords)} fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'd 500ms ease-in-out, stroke 300ms ease' }} />
                      <path d={makePathStr(gatewayCoords)} fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" style={{ transition: 'd 500ms ease-in-out, stroke 300ms ease' }} />

                      {/* Interaction Points (Circles) */}
                      {authCoords.map((c, idx) => (
                        <circle key={`auth-${idx}`} cx={c.x} cy={c.y} r="3" fill="#4f46e5" stroke="#ffffff" strokeWidth="1" style={{ transition: 'cy 500ms ease-in-out, fill 300ms ease' }} />
                      ))}
                      {dbCoords.map((c, idx) => (
                        <circle key={`db-${idx}`} cx={c.x} cy={c.y} r="3" fill="#0d9488" stroke="#ffffff" strokeWidth="1" style={{ transition: 'cy 500ms ease-in-out, fill 300ms ease' }} />
                      ))}
                      {gatewayCoords.map((c, idx) => (
                        <circle key={`gateway-${idx}`} cx={c.x} cy={c.y} r="3" fill="#d97706" stroke="#ffffff" strokeWidth="1" style={{ transition: 'cy 500ms ease-in-out, fill 300ms ease' }} />
                      ))}
                    </svg>

                    {/* Chart Legend */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-600" /> auth-service</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal-600" /> primary-db</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" /> payment-gateway</span>
                      </div>
                      <div className="flex gap-2 font-mono uppercase text-slate-400">
                        <span>Max Peak: {maxVal} {activeTab === 'latency' ? 'ms' : activeTab === 'errors' ? '%' : '%'}</span>
                      </div>
                    </div>

                    {/* X-Axis labels */}
                    <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400 px-1 mt-1">
                      {HOURS.map((h, i) => (
                        <span key={i}>{h}</span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* AI Architecture Audit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                  <h4 className="text-[13px] font-bold text-slate-800">Auth Service SPOF Analysis</h4>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600 font-medium">
                  <strong>Risk Assessment:</strong> All traffic flows (both Web Portal and API Gateway) synchronously route authentication inquiries through `auth-service`. A hardware depletion or thread lockout immediately halts all customer logins and downstream checkout processing.
                </p>
                <p className="text-[12px] leading-relaxed text-slate-500 mt-1 font-semibold">
                  SRE Recommendation: Enable verification key caching at the API Gateway level. Store JWT validation certificates locally on the proxy node with a short Time-To-Live (5m) to cache access verification safely and alleviate the single auth path dependency.
                </p>
              </div>

              <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/20 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-teal-600 shrink-0" />
                  <h4 className="text-[13px] font-bold text-slate-800">Database Single Point Failure</h4>
                </div>
                <p className="text-[12px] leading-relaxed text-slate-600 font-medium">
                  <strong>Risk Assessment:</strong> `primary-db` handles persistent requests for multiple domains (inventory data, transaction logs, user records). Under high load, database locking creates severe IO queueing, causing transaction latency to cascade back up to the frontend load balancer.
                </p>
                <p className="text-[12px] leading-relaxed text-slate-500 mt-1 font-semibold">
                  SRE Recommendation: Spin up read-replicas specifically for inventory queries to take load off the primary database. Migrate order historical storage and reporting transactions onto a dedicated write-through read-pool.
                </p>
              </div>
            </div>

            {/* Actionable SRE Checklist */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Architectural Optimization Checklist</h4>
              <div className="flex flex-col gap-2 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                
                {/* Checkbox item 1 */}
                <div className={`flex items-center justify-between p-3.5 transition-all duration-300 ${appliedUpgrades.authReplicas ? 'bg-emerald-50/35 text-slate-800' : 'bg-white text-slate-800'}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="opt-auth"
                      checked={appliedUpgrades.authReplicas}
                      onChange={(e) => setAppliedUpgrades(prev => ({ ...prev, authReplicas: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="opt-auth" className="cursor-pointer select-none">
                      <p className={`text-[12.5px] font-bold transition-all ${appliedUpgrades.authReplicas ? 'text-emerald-800 line-through decoration-emerald-500/50' : 'text-slate-800'}`}>Deploy Auth Service Read Replicas (x3)</p>
                      <p className="text-[11px] text-slate-500">Deploy additional auth-service instances behind a load-balancer.</p>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">Impact: High</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Effort: 3 days</span>
                  </div>
                </div>

                {/* Checkbox item 2 */}
                <div className={`flex items-center justify-between p-3.5 transition-all duration-300 ${appliedUpgrades.dbReplicas ? 'bg-emerald-50/35 text-slate-800' : 'bg-white text-slate-800'}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="opt-db"
                      checked={appliedUpgrades.dbReplicas}
                      onChange={(e) => setAppliedUpgrades(prev => ({ ...prev, dbReplicas: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="opt-db" className="cursor-pointer select-none">
                      <p className={`text-[12.5px] font-bold transition-all ${appliedUpgrades.dbReplicas ? 'text-emerald-800 line-through decoration-emerald-500/50' : 'text-slate-800'}`}>Implement DB Read Replica Pool</p>
                      <p className="text-[11px] text-slate-500">Route inventory read inquiries onto dedicated read-replica instances.</p>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">Impact: Critical</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Effort: 2 weeks</span>
                  </div>
                </div>

                {/* Checkbox item 3 */}
                <div className={`flex items-center justify-between p-3.5 transition-all duration-300 ${appliedUpgrades.paymentCircuitBreaker ? 'bg-emerald-50/35 text-slate-800' : 'bg-white text-slate-800'}`}>
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="opt-circuit"
                      checked={appliedUpgrades.paymentCircuitBreaker}
                      onChange={(e) => setAppliedUpgrades(prev => ({ ...prev, paymentCircuitBreaker: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                    <label htmlFor="opt-circuit" className="cursor-pointer select-none">
                      <p className={`text-[12.5px] font-bold transition-all ${appliedUpgrades.paymentCircuitBreaker ? 'text-emerald-800 line-through decoration-emerald-500/50' : 'text-slate-800'}`}>Configure Circuit Breaker for Payment Gateway</p>
                      <p className="text-[11px] text-slate-500">Block downstream connections to payment-gateway if failure rate exceeds 20%.</p>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">Impact: Medium</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Effort: 1 day</span>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
