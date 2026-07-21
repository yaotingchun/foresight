import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  SCENARIOS, SCENARIOS_BY_ID, FAULT_EFFECTS, SEVERITY_MULT,
  DEFAULT_RAMP_MS, DEFAULT_HOLD_MS, DEFAULT_RESOLVE_MS,
} from '../data/simulationScenarios'
import { NODE_BY_ID } from '../data/serviceMapData'

/**
 * Drives the "Simulate Event" drawer: turns a scenario (a chain of
 * component/fault stages) into a live-ticking run whose per-component
 * severity ramps up, holds, then resolves — same ramp/hold/resolve shape as
 * the historical fault generator in scripts/generate_synthetic_data.py, just
 * compressed to tens of seconds so it's watchable.
 *
 * Everything downstream (service map health, log stream, transaction stream)
 * reads `componentEffects` rather than owning any simulation logic itself.
 */

const SimulationContext = createContext(null)
const TICK_MS = 1000
const PAYMENT_PATH = ['payment-service', 'payment-gateway', 'order-service']

function buildRun(scenario) {
  const runStart = Date.now()
  const stages = scenario.stages.map((stage) => {
    const rampMs = stage.rampMs ?? DEFAULT_RAMP_MS
    const holdMs = stage.holdMs ?? DEFAULT_HOLD_MS
    const resolveMs = stage.resolveMs ?? DEFAULT_RESOLVE_MS
    const stageStart = runStart + stage.offsetMs
    const rampEnd = stageStart + rampMs
    const holdEnd = rampEnd + holdMs
    const endAt = holdEnd + resolveMs
    return { ...stage, stageStart, rampEnd, holdEnd, endAt }
  })
  return { scenario, runStart, stages, endAt: Math.max(...stages.map((s) => s.endAt)), status: 'running' }
}

function stageProgress(stage, now) {
  if (now < stage.stageStart) return 0
  if (now < stage.rampEnd) return (now - stage.stageStart) / (stage.rampEnd - stage.stageStart)
  if (now < stage.holdEnd) return 1
  if (now < stage.endAt) return 1 - (now - stage.holdEnd) / (stage.endAt - stage.holdEnd)
  return 0
}

function healthFromSeverity(s) {
  if (s >= 0.66) return 'critical'
  if (s >= 0.3) return 'warning'
  return 'healthy'
}

export function SimulationProvider({ children }) {
  const [activeRun, setActiveRun] = useState(null)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [logEvents, setLogEvents] = useState([])
  const [txEvents, setTxEvents] = useState([])
  const rtSeq = useRef(0)

  useEffect(() => {
    if (!activeRun) return undefined
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [activeRun])

  const componentEffects = useMemo(() => {
    if (!activeRun) return {}
    const now = Date.now()
    const effects = {}
    activeRun.stages.forEach((stage) => {
      const p = stageProgress(stage, now)
      if (p <= 0) return
      const s = p * (SEVERITY_MULT[stage.severity] ?? 1)
      if (effects[stage.component] && effects[stage.component].s >= s) return
      const profile = FAULT_EFFECTS[stage.faultType] ?? { latencyMult: 5, errorRate: 3, flavor: 'anomaly detected' }
      const base = NODE_BY_ID[stage.component]?.metrics ?? { latency: 20, errorRate: 0.2, rps: 100 }
      effects[stage.component] = {
        s,
        stage,
        profile,
        health: healthFromSeverity(s),
        metrics: {
          latency: Math.round((base.latency + (base.latency * profile.latencyMult - base.latency) * s) * 10) / 10,
          errorRate: Math.round((base.errorRate + profile.errorRate * s) * 100) / 100,
          rps: Math.round(base.rps * Math.max(0.3, 1 - 0.5 * s)),
        },
      }
    })
    return effects
    // `tick` isn't read directly but forces this to recompute every TICK_MS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun, tick])

  // Emit synthetic log lines proportional to how severe each active stage currently is.
  useEffect(() => {
    if (!activeRun) {
      setLogEvents([])
      return
    }
    const now = Date.now()
    const emitted = []
    Object.entries(componentEffects).forEach(([componentId, eff]) => {
      if (Math.random() < 0.2 + eff.s * 0.55) {
        rtSeq.current += 1
        emitted.push({
          id: `sim-log-${now}-${rtSeq.current}`,
          timestamp: now,
          status: eff.s > 0.6 ? 'error' : eff.s > 0.25 ? 'warn' : 'info',
          service: componentId,
          message: `${componentId}: ${eff.profile.flavor}`,
          affectedChain: [],
          traceId: Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'),
          spanId: Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
          simulated: true,
          scenarioId: activeRun.scenario.id,
        })
      }
    })
    setLogEvents(emitted)
  }, [componentEffects, activeRun])

  // Emit synthetic flagged/blocked transactions for payment-path components.
  useEffect(() => {
    if (!activeRun?.scenario.txImpact) {
      setTxEvents([])
      return
    }
    const emitted = []
    Object.entries(componentEffects).forEach(([componentId, eff]) => {
      if (!PAYMENT_PATH.includes(componentId)) return
      if (Math.random() < 0.1 + eff.s * 0.4) {
        rtSeq.current += 1
        emitted.push({
          key: `sim-tx-${Date.now()}-${rtSeq.current}`,
          componentId,
          s: eff.s,
          scenario: activeRun.scenario,
          runStart: activeRun.runStart,
        })
      }
    })
    setTxEvents(emitted)
  }, [componentEffects, activeRun])

  // Auto-resolve, then auto-dismiss, once every stage has finished.
  useEffect(() => {
    if (!activeRun) return
    const now = Date.now()
    if (now > activeRun.endAt + 8000) {
      setActiveRun(null)
    } else if (now > activeRun.endAt && activeRun.status !== 'resolved') {
      setActiveRun((r) => (r ? { ...r, status: 'resolved' } : r))
    }
  }, [tick, activeRun])

  const startScenario = useCallback((scenarioId) => {
    const scenario = SCENARIOS_BY_ID[scenarioId]
    if (!scenario) return
    setTick(0)
    setActiveRun(buildRun(scenario))
  }, [])

  const stopScenario = useCallback(() => setActiveRun(null), [])
  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])

  const value = useMemo(() => ({
    scenarios: SCENARIOS,
    activeRun,
    componentEffects,
    logEvents,
    txEvents,
    isDrawerOpen,
    startScenario,
    stopScenario,
    openDrawer,
    closeDrawer,
    toggleDrawer,
  }), [activeRun, componentEffects, logEvents, txEvents, isDrawerOpen, startScenario, stopScenario, openDrawer, closeDrawer, toggleDrawer])

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider')
  return ctx
}
