/**
 * Pure timing/metric math shared between SimulationContext (drives the live
 * run) and the Incidents pages (recompute the same numbers to render frozen
 * "before/peak" snapshots for a past run). Keeping this here means both only
 * ever have one copy of the ramp/hold/resolve shape to agree on.
 */
import { FAULT_EFFECTS, FAULT_ANALYSIS, SEVERITY_MULT, DEFAULT_RAMP_MS, DEFAULT_HOLD_MS, DEFAULT_RESOLVE_MS } from './simulationScenarios'
import { NODE_BY_ID, upstreamIdsOf, downstreamIdsOf } from './serviceMapData'

export function buildStages(scenario, runStart) {
  return scenario.stages.map((stage) => {
    const rampMs = stage.rampMs ?? DEFAULT_RAMP_MS
    const holdMs = stage.holdMs ?? DEFAULT_HOLD_MS
    const resolveMs = stage.resolveMs ?? DEFAULT_RESOLVE_MS
    const stageStart = runStart + stage.offsetMs
    const rampEnd = stageStart + rampMs
    const holdEnd = rampEnd + holdMs
    const endAt = holdEnd + resolveMs
    return { ...stage, stageStart, rampEnd, holdEnd, endAt }
  })
}

export function stageProgress(stage, now) {
  if (now < stage.stageStart) return 0
  if (now < stage.rampEnd) return (now - stage.stageStart) / (stage.rampEnd - stage.stageStart)
  if (now < stage.holdEnd) return 1
  if (now < stage.endAt) return 1 - (now - stage.holdEnd) / (stage.endAt - stage.holdEnd)
  return 0
}

export function healthFromSeverity(s) {
  if (s >= 0.66) return 'critical'
  if (s >= 0.3) return 'warning'
  return 'healthy'
}

/** Peak severity a stage will ever reach (i.e. progress = 1, during hold). */
export function peakSeverity(stage) {
  return SEVERITY_MULT[stage.severity] ?? 1
}

/** Blend a component's baseline metrics toward the fault's peak effect at severity `s`. */
export function computeEffectMetrics(baseMetrics, faultType, s) {
  const profile = FAULT_EFFECTS[faultType] ?? { latencyMult: 5, errorRate: 3 }
  const base = baseMetrics ?? { latency: 20, errorRate: 0.2, rps: 100 }
  return {
    latency: Math.round((base.latency + (base.latency * profile.latencyMult - base.latency) * s) * 10) / 10,
    errorRate: Math.round((base.errorRate + profile.errorRate * s) * 100) / 100,
    rps: Math.round(base.rps * Math.max(0.3, 1 - 0.5 * s)),
  }
}

/**
 * Overall incident status. "Detected"/"Investigating" reflect the root
 * cause's own onset, but "Mitigating" spans the *entire* cascade — an
 * incident isn't "Resolved" just because the root stage settled while
 * downstream cascaded stages (which can start and run long after the root)
 * are still actively degraded.
 */
export function deriveIncidentStatus(stages, now, frozenStatus) {
  if (frozenStatus) return frozenStatus
  const root = stages[0]
  const overallEnd = Math.max(...stages.map((s) => s.endAt))
  if (now < root.rampEnd) return 'detected'
  const holdMid = root.rampEnd + (root.holdEnd - root.rampEnd) / 2
  if (now < holdMid) return 'investigating'
  if (now < overallEnd) return 'mitigating'
  return 'resolved'
}

/** Same tiered amount distribution used for the historical dataset's transactions. */
export function randomTxAmount() {
  const r = Math.random()
  if (r < 0.6) return Math.round(Math.random() * 500 * 100) / 100
  if (r < 0.88) return Math.round((500 + Math.random() * 4500) * 100) / 100
  if (r < 0.97) return Math.round((5000 + Math.random() * 45000) * 100) / 100
  return Math.round((50000 + Math.random() * 450000) * 100) / 100
}

export const STATUS_META = {
  detected:      { label: 'Detected',      color: '#F59E0B', tint: '#FEF3C7' },
  investigating: { label: 'Investigating', color: '#6366F1', tint: '#E0E7FF' },
  mitigating:    { label: 'Mitigating',     color: '#3B82F6', tint: '#DBEAFE' },
  resolved:      { label: 'Resolved',       color: '#22C55E', tint: '#DCFCE7' },
}

/** Chain nodes with each component's peak health during the run, for the dependency diagram. */
export function chainNodesFor(incident) {
  return incident.chain.map((id) => {
    const stage = incident.stages.find((s) => s.component === id)
    const health = stage ? healthFromSeverity(peakSeverity(stage)) : 'healthy'
    return { id, label: NODE_BY_ID[id]?.label ?? id, health, faultType: stage?.faultType }
  })
}

/** Upstream callers / downstream dependencies of the root-cause component (real topology graph). */
export function rootDependencies(incident) {
  const rootId = incident.stages[0].component
  return {
    rootId,
    upstream: upstreamIdsOf(rootId).map((id) => NODE_BY_ID[id]?.label ?? id),
    downstream: downstreamIdsOf(rootId).map((id) => NODE_BY_ID[id]?.label ?? id),
  }
}

/** Deduped flaws / preventive measures across every distinct fault type involved in the incident. */
export function aggregatedAnalysis(incident) {
  const faultTypes = [...new Set(incident.stages.map((s) => s.faultType))]
  const flaws = []
  const preventiveMeasures = []
  faultTypes.forEach((ft) => {
    const a = FAULT_ANALYSIS[ft]
    if (!a) return
    a.flaws.forEach((f) => { if (!flaws.includes(f)) flaws.push(f) })
    a.preventiveMeasures.forEach((p) => { if (!preventiveMeasures.includes(p)) preventiveMeasures.push(p) })
  })
  return { flaws, preventiveMeasures }
}

/** Root-cause write-up + per-stage remediation actions, keyed off FAULT_ANALYSIS. */
export function remediationPlan(incident) {
  return incident.stages.map((stage) => ({
    component: stage.component,
    label: NODE_BY_ID[stage.component]?.label ?? stage.component,
    faultType: stage.faultType,
    severity: stage.severity,
    ...FAULT_ANALYSIS[stage.faultType],
  }))
}
