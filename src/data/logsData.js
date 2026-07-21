import { topology, appLogs } from './dataSource'

// ─── Services (every component that can emit a log line) ──────────────────────
export const SERVICES = topology.components.map((c) => c.id)

// ─── Dependency graph (used to build "affected chain" display) ────────────────
export const SERVICE_DEPENDENCIES = (() => {
  const map = Object.fromEntries(SERVICES.map((id) => [id, []]))
  topology.dependencies.forEach((d) => {
    map[d.source]?.push(d.target)
  })
  return map
})()

// ─── Status levels ────────────────────────────────────────────────────────────
export const STATUSES = ['error', 'warn', 'info']

// ─── Upstream callers (reverse of dependencies) ──────────────────────────────
export function upstreamCallers(serviceId) {
  return Object.entries(SERVICE_DEPENDENCIES)
    .filter(([, deps]) => deps.includes(serviceId))
    .map(([svc]) => svc)
}

export function downstreamDeps(serviceId) {
  return SERVICE_DEPENDENCIES[serviceId] ?? []
}

function buildAffectedChain(serviceId, status) {
  const callers = upstreamCallers(serviceId)
  const deps    = downstreamDeps(serviceId)

  const chain = []

  if (callers.length > 0) {
    chain.push({
      direction: 'upstream',
      label: 'Called by',
      services: callers.slice(0, 3),
      severity: status === 'error' ? 'error' : 'warn',
    })
  }

  if (deps.length > 0) {
    chain.push({
      direction: 'downstream',
      label: 'Depends on',
      services: deps.slice(0, 3),
      severity: 'info',
    })
  }

  return chain
}

// ─── Historical dataset (from scripts/generate_synthetic_data.py) ────────────
export const ALL_LOGS = appLogs
  .map((l) => ({
    id: l.id,
    timestamp: Date.parse(l.timestamp),
    status: l.severity,
    service: l.component_id,
    message: l.message,
    affectedChain: l.severity !== 'info' ? buildAffectedChain(l.component_id, l.severity) : [],
    traceId: l.trace_id,
    spanId: l.span_id,
    incidentId: l.incident_id,
  }))
  .sort((a, b) => b.timestamp - a.timestamp)

// ─── Chart bucket helpers ─────────────────────────────────────────────────────
export function bucketLogs(logs, rangeMs, buckets = 30) {
  const now   = Date.now()
  const start = now - rangeMs
  const step  = rangeMs / buckets
  const result = []

  for (let i = 0; i < buckets; i += 1) {
    const bStart = start + i * step
    const bEnd   = bStart + step
    const slice  = logs.filter((l) => l.timestamp >= bStart && l.timestamp < bEnd)
    result.push({
      t:     bStart,
      error: slice.filter((l) => l.status === 'error').length,
      warn:  slice.filter((l) => l.status === 'warn').length,
      info:  slice.filter((l) => l.status === 'info').length,
    })
  }

  return result
}

