import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SCENARIOS, SCENARIOS_BY_ID, FAULT_EFFECTS, SEVERITY_MULT } from '../data/simulationScenarios'
import { buildStages, stageProgress, healthFromSeverity, peakSeverity, computeEffectMetrics, randomTxAmount } from '../data/simulationEngine'
import { NODE_BY_ID } from '../data/serviceMapData'
import { api } from '../lib/api'
import { useSettings } from './SettingsContext'
import { useDataPipeline } from '../hooks/useDataPipeline'

/**
 * Drives the "Simulate Event" drawer AND the Incidents page: turns a
 * scenario (a chain of component/fault stages) into a live-ticking run whose
 * per-component severity ramps up, holds, then resolves — same ramp/hold/
 * resolve shape as the historical fault generator in
 * scripts/generate_synthetic_data.py, just compressed to tens of seconds so
 * it's watchable. Every run is recorded as an incident (persisted to
 * localStorage) with a before/peak metrics snapshot and accumulated impact
 * stats, so the Incidents page has something to show without a backend.
 *
 * Everything downstream (service map health, log stream, transaction stream)
 * reads `componentEffects` rather than owning any simulation logic itself.
 */

const SimulationContext = createContext(null)
const TICK_MS = 1000
const PAYMENT_PATH = ['payment-service', 'payment-gateway', 'order-service']
const INCIDENTS_STORAGE_KEY = 'foresight.incidents'
const MAX_INCIDENTS = 50

export function getMockConfidence(scenarioIdOrId, idx) {
  const isDelay = scenarioIdOrId === 'data-processing-delay' || 
                  (typeof scenarioIdOrId === 'string' && scenarioIdOrId.startsWith('data-processing-delay'));
  if (isDelay) {
    return idx === 0 ? 82 : Math.max(70, 82 - (idx * 6))
  }
  return Math.max(0, 95 - (idx * 12))
}

function loadStoredIncidents() {
  try {
    const raw = localStorage.getItem(INCIDENTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function snapshotMetrics(components) {
  const snap = {}
  components.forEach((id) => {
    snap[id] = NODE_BY_ID[id]?.metrics
      ? { ...NODE_BY_ID[id].metrics, spark: undefined }
      : { latency: 20, errorRate: 0.2, rps: 100 }
  })
  return snap
}

function buildIncidentRecord(scenario, stages, runStart) {
  const involved = [...new Set(stages.map((s) => s.component))]
  const before = snapshotMetrics(involved)
  const peak = {}
  stages.forEach((stage) => {
    peak[stage.component] = computeEffectMetrics(before[stage.component], stage.faultType, peakSeverity(stage))
  })
  return {
    id: `${scenario.id}-${runStart}`,
    scenarioId: scenario.id,
    title: scenario.title,
    summary: scenario.summary,
    chain: scenario.chain,
    stages,
    runStart,
    endAt: Math.max(...stages.map((s) => s.endAt)),
    frozenStatus: null,
    stoppedEarly: false,
    beforeMetrics: before,
    peakMetrics: peak,
    impact: { txTotal: 0, txFlagged: 0, txBlocked: 0, valueAtRisk: 0, logTotal: 0, logErrors: 0 },
    aiAnalysis: null,
    isAnalyzing: true,
    analysisError: null,
  }
}

export function SimulationProvider({ children }) {
  const [activeRun, setActiveRun] = useState(null)
  const [isDrawerOpen, setDrawerOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [logEvents, setLogEvents] = useState([])
  const [accumulatedLogs, setAccumulatedLogs] = useState([])
  const [txEvents, setTxEvents] = useState([])
  const [incidents, setIncidents] = useState(loadStoredIncidents)
  const { businessContext, experienceLogs, riskTiers, setExperienceLogs } = useSettings()
  const { pushMetrics, isConnected } = useDataPipeline()
  const rtSeq = useRef(0)
  const activeIncidentIdRef = useRef(null)

  const activeIncident = useMemo(() => {
    return incidents.find((inc) => inc.id === activeIncidentIdRef.current)
  }, [incidents])

  const hasApprovalSteps = useMemo(() => {
    if (!activeIncident) return false
    if (activeIncident.isAnalyzing) return true
    if (activeIncident.hasApprovalSteps !== undefined) return activeIncident.hasApprovalSteps
    if (!activeIncident.aiAnalysis?.remediationPlan) return false
    return activeIncident.aiAnalysis.remediationPlan.some((p, idx) => {
      const mockConfidence = getMockConfidence(activeIncident.scenarioId || activeIncident.id, idx)
      let liveType = 'requires_approval'
      if (mockConfidence >= riskTiers.tier1) liveType = 'automated'
      else if (mockConfidence < riskTiers.tier2) liveType = 'escalated'
      return liveType === 'requires_approval'
    })
  }, [activeIncident, riskTiers])

  useEffect(() => {
    try {
      localStorage.setItem(INCIDENTS_STORAGE_KEY, JSON.stringify(incidents.slice(0, MAX_INCIDENTS)))
    } catch {
      // storage full/unavailable — incident history just won't persist this run
    }
  }, [incidents])

  useEffect(() => {
    if (!activeRun) return undefined
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [activeRun])

  const componentEffects = useMemo(() => {
    if (!activeRun) return {}
    const realNow = Date.now()
    const effects = {}
    activeRun.stages.forEach((stage) => {
      const now = hasApprovalSteps ? Math.min(realNow, stage.holdEnd) : realNow
      const p = stageProgress(stage, now)
      if (p <= 0) return
      const s = p * (SEVERITY_MULT[stage.severity] ?? 1)
      if (effects[stage.component] && effects[stage.component].s >= s) return
      const profile = FAULT_EFFECTS[stage.faultType] ?? { flavor: 'anomaly detected' }
      effects[stage.component] = {
        s,
        stage,
        profile,
        health: healthFromSeverity(s),
        metrics: computeEffectMetrics(NODE_BY_ID[stage.component]?.metrics, stage.faultType, s),
      }
    })
    return effects
    // `tick` isn't read directly but forces this to recompute every TICK_MS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun, tick, hasApprovalSteps])

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
    if (emitted.length > 0) {
      setAccumulatedLogs((prev) => [...emitted, ...prev].slice(0, 800))
    }
    if (emitted.length > 0 && activeIncidentIdRef.current) {
      const errCount = emitted.filter((e) => e.status === 'error').length
      setIncidents((prev) => prev.map((inc) => (
        inc.id === activeIncidentIdRef.current
          ? { ...inc, impact: { ...inc.impact, logTotal: inc.impact.logTotal + emitted.length, logErrors: inc.impact.logErrors + errCount } }
          : inc
      )))
    }
  }, [componentEffects, activeRun])

  // Push metrics to backend ML pipeline
  useEffect(() => {
    if (!isConnected) return
    const now = new Date().toISOString()
    
    // For each component that has an effect, push its metrics
    Object.entries(componentEffects).forEach(([componentId, eff]) => {
      pushMetrics({
        component_id: componentId,
        timestamp: now,
        cpu_pct: eff.metrics.cpu || 0,
        memory_pct: eff.metrics.memory || 0,
        latency_ms: eff.metrics.latency || 0,
        error_rate: eff.metrics.errorRate || 0,
        log_error_rate_per_min: (eff.metrics.errorRate || 0) * 60 
      })
    })
  }, [componentEffects, isConnected, pushMetrics])

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
          amount: randomTxAmount(),
          scenario: activeRun.scenario,
          runStart: activeRun.runStart,
        })
      }
    })
    setTxEvents(emitted)
    if (emitted.length > 0 && activeIncidentIdRef.current) {
      setIncidents((prev) => prev.map((inc) => {
        if (inc.id !== activeIncidentIdRef.current) return inc
        let flagged = 0, blocked = 0, addedValue = 0
        emitted.forEach((e) => {
          if (e.s > 0.6) blocked += 1
          else flagged += 1
          addedValue += e.amount
        })
        return {
          ...inc,
          impact: {
            ...inc.impact,
            txTotal: inc.impact.txTotal + emitted.length,
            txFlagged: inc.impact.txFlagged + flagged,
            txBlocked: inc.impact.txBlocked + blocked,
            valueAtRisk: Math.round((inc.impact.valueAtRisk + addedValue) * 100) / 100,
          },
        }
      }))
    }
  }, [componentEffects, activeRun])

  // Auto-resolve, then auto-dismiss, once every stage has finished.
  useEffect(() => {
    if (!activeRun) return
    const now = Date.now()
    if (hasApprovalSteps) return
    if (now > activeRun.endAt && activeRun.status !== 'resolved') {
      const incidentId = activeIncidentIdRef.current
      if (incidentId) {
        setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? { ...inc, frozenStatus: 'resolved' } : inc)))
      }
      setActiveRun((r) => (r ? { ...r, status: 'resolved' } : r))
    }
    if (now > activeRun.endAt + 8000) {
      setActiveRun(null)
      activeIncidentIdRef.current = null
    }
  }, [tick, activeRun, hasApprovalSteps])

  const startScenario = useCallback((scenarioId) => {
    const scenario = SCENARIOS_BY_ID[scenarioId]
    if (!scenario) return
    const runStart = Date.now()
    const stages = buildStages(scenario, runStart)
    const record = buildIncidentRecord(scenario, stages, runStart)
    record.hasApprovalSteps = true // Default to true while analyzing
    activeIncidentIdRef.current = record.id
    setIncidents((prev) => [record, ...prev].slice(0, MAX_INCIDENTS))
    setTick(0)
    setAccumulatedLogs([])
    setActiveRun({ scenario, runStart, stages, endAt: record.endAt, status: 'running' })

    // Fire off AI analysis in the background immediately
    api.analyzeIncident({ ...record, businessContext, experienceLogs }).then(data => {
      const hasApproval = data.remediationPlan?.some((p, idx) => {
        const mockConfidence = getMockConfidence(record.scenarioId || record.id, idx)
        let liveType = 'requires_approval'
        if (mockConfidence >= riskTiers.tier1) liveType = 'automated'
        else if (mockConfidence < riskTiers.tier2) liveType = 'escalated'
        return liveType === 'requires_approval'
      })

      // Check if the first step is automated (EXCLUDE db-connection-pool-exhaustion so it retains full 85s hold)
      const firstStep = data.remediationPlan?.[0]
      let isFirstAutomated = false
      if (firstStep && scenario.id !== 'db-connection-pool-exhaustion') {
        const mockConfidence = getMockConfidence(scenario.id, 0)
        let liveType = 'requires_approval'
        if (mockConfidence >= riskTiers.tier1) liveType = 'automated'
        else if (mockConfidence < riskTiers.tier2) liveType = 'escalated'
        
        if (liveType === 'automated') {
          isFirstAutomated = true
        }
      }


      if (isFirstAutomated) {
        const now = Date.now()
        const RESOLVE_MS = 8000
        
        const updatedPlan = data.remediationPlan.map((step, idx) => {
          if (idx === 0) return { ...step, approved: true }
          return step
        })

        // 1. Update incidents list with approved first step and shifted resolution stages
        setIncidents((prev) =>
          prev.map((inc) => {
            if (inc.id !== record.id) return inc
            const updatedStages = inc.stages.map((stage) => ({
              ...stage,
              holdEnd: now,
              endAt: now + RESOLVE_MS,
            }))
            return {
              ...inc,
              aiAnalysis: { ...data, remediationPlan: updatedPlan },
              isAnalyzing: false,
              hasApprovalSteps: false,
              stages: updatedStages,
              endAt: now + RESOLVE_MS,
            }
          })
        )

        // 2. Update activeRun stages and endAt
        setActiveRun((r) => {
          if (!r || `${r.scenario.id}-${r.runStart}` !== record.id) return r
          const updatedStages = r.stages.map((stage) => ({
            ...stage,
            holdEnd: now,
            endAt: now + RESOLVE_MS,
          }))
          return {
            ...r,
            stages: updatedStages,
            endAt: now + RESOLVE_MS,
          }
        })

      } else {
        const isConnPool = scenario.id === 'db-connection-pool-exhaustion'
        setIncidents(prev => prev.map(p => p.id === record.id ? { ...p, aiAnalysis: data, isAnalyzing: false, hasApprovalSteps: isConnPool ? true : hasApproval } : p))
      }

    }).catch(err => {
      setIncidents(prev => prev.map(p => p.id === record.id ? { ...p, analysisError: err.message, isAnalyzing: false, hasApprovalSteps: false } : p))
    })
  }, [businessContext, experienceLogs, riskTiers])

  const [recentlyResolved, setRecentlyResolved] = useState(null)

  const stopScenario = useCallback(() => {
    const incidentId = activeIncidentIdRef.current
    if (activeRun?.stages?.length > 0) {
      const comp = activeRun.stages[0].component
      setRecentlyResolved({
        component: comp,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      })
    }
    if (incidentId) {
      setIncidents((prev) => prev.map((inc) => (
        inc.id === incidentId ? { ...inc, frozenStatus: 'resolved', stoppedEarly: true } : inc
      )))
    }
    activeIncidentIdRef.current = null
    setActiveRun(null)
  }, [activeRun])

  const approveRemediationStep = useCallback((incidentId, stepIndex) => {
    // 1. Mark this step as approved
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc
        if (!inc.aiAnalysis?.remediationPlan) return inc

        const plan = inc.aiAnalysis.remediationPlan.map((step, idx) => {
          if (idx !== stepIndex) return step
          return { ...step, approved: true }
        })

        return {
          ...inc,
          aiAnalysis: { ...inc.aiAnalysis, remediationPlan: plan },
          hasApprovalSteps: false,
        }
      })
    )

    // 2. Trigger the 8-second mitigation buffer
    const isActiveRun = activeRun && incidentId === `${activeRun.scenario.id}-${activeRun.runStart}`
    if (isActiveRun) {
      const now = Date.now()
      const RESOLVE_MS = 8000
      const updatedStages = activeRun.stages.map((stage) => ({
        ...stage,
        holdEnd: now,
        endAt: now + RESOLVE_MS,
      }))

      setActiveRun((r) => {
        if (!r) return null
        return {
          ...r,
          stages: updatedStages,
          endAt: now + RESOLVE_MS,
        }
      })

      setIncidents((prev) =>
        prev.map((inc) =>
          inc.id === incidentId
            ? {
                ...inc,
                stages: updatedStages,
                endAt: now + RESOLVE_MS,
                hasApprovalSteps: false,
              }
            : inc
        )
      )
    }
  }, [activeRun])

  const rejectRemediationStep = useCallback((incidentId, stepIndex, feedbackText) => {
    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc
        if (!inc.aiAnalysis?.remediationPlan) return inc

        const plan = inc.aiAnalysis.remediationPlan.map((step, idx) => {
          if (idx !== stepIndex) return step
          return { ...step, rejected: true, feedback: feedbackText }
        })

        // Check if there are still any pending approval steps in the remaining steps
        const remainingPlan = plan.slice(stepIndex + 1)
        const hasApproval = remainingPlan.some((p, idx) => {
          const actualIdx = stepIndex + 1 + idx
          const mockConfidence = getMockConfidence(inc.scenarioId || inc.id, actualIdx)
          let liveType = 'requires_approval'
          if (mockConfidence >= riskTiers.tier1) liveType = 'automated'
          else if (mockConfidence < riskTiers.tier2) liveType = 'escalated'
          return liveType === 'requires_approval' && !p.approved && !p.rejected
        })

        return {
          ...inc,
          aiAnalysis: { ...inc.aiAnalysis, remediationPlan: plan },
          hasApprovalSteps: hasApproval,
        }
      })
    )

    // Add to experience logs
    const activeIncident = incidents.find((inc) => inc.id === incidentId)
    if (activeIncident) {
      const stepTitle = activeIncident.aiAnalysis?.remediationPlan?.[stepIndex]?.step || 'Step'
      setExperienceLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          incidentContext: activeIncident.title,
          rejectedStep: stepTitle,
          userFeedback: feedbackText,
        },
      ])
    }
  }, [incidents, riskTiers, setExperienceLogs])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen((v) => !v), [])

  const value = useMemo(() => ({
    scenarios: SCENARIOS,
    activeRun,
    componentEffects,
    logEvents,
    accumulatedLogs,
    txEvents,
    incidents,
    recentlyResolved,
    isDrawerOpen,
    startScenario,
    stopScenario,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    approveRemediationStep,
    rejectRemediationStep,
  }), [activeRun, componentEffects, logEvents, accumulatedLogs, txEvents, incidents, recentlyResolved, isDrawerOpen, startScenario, stopScenario, openDrawer, closeDrawer, toggleDrawer, approveRemediationStep, rejectRemediationStep])

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider')
  return ctx
}
