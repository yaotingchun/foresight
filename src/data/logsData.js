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

// ─── Live-tick message templates (for the real-time stream simulator only) ───
const ERROR_MSGS = [
  (svc) => `Connection timeout to ${svc} after 30s`,
  (svc) => `Failed to acquire DB connection from pool in ${svc}`,
  (svc) => `HTTP 503 Service Unavailable — ${svc} not responding`,
  (svc) => `Circuit breaker OPEN for ${svc} — blocking requests`,
  (svc) => `Unhandled exception in ${svc}: NullReferenceError at handler.process()`,
  (svc) => `Memory limit exceeded (OOMKilled) in ${svc} pod`,
  (svc) => `SSL certificate validation failed for ${svc}`,
  (svc) => `gRPC stream error: UNAVAILABLE — ${svc} peer closed connection`,
  (svc) => `Retry limit reached (5/5) calling ${svc}`,
  (svc) => `Deadlock detected in ${svc} DB transaction`,
]

const WARN_MSGS = [
  (svc) => `High latency detected on ${svc}: P99 = 1842ms`,
  (svc) => `${svc} response time degraded — 3× above baseline`,
  (svc) => `${svc} queue depth approaching limit: 4800/5000`,
  (svc) => `Cache miss rate elevated in ${svc}: 72%`,
  (svc) => `${svc} pod restarted — liveness probe failed`,
  (svc) => `Rate limiter triggered for ${svc}: 429 returned`,
  (svc) => `${svc} CPU utilization at 88% — scaling in progress`,
  (svc) => `Slow query in ${svc}: SELECT * took 3.2s`,
  (svc) => `${svc} health check returned non-200: 206`,
  (svc) => `Retry #2 for ${svc} — upstream timeout`,
]

const INFO_MSGS = [
  (svc) => `${svc} instance scaled up: 2 → 4 replicas`,
  (svc) => `${svc} deployment rollout complete — v2.3.1`,
  (svc) => `${svc} cache warmed: 12,400 keys loaded`,
  (svc) => `${svc} health check passed — all probes green`,
  (svc) => `New connection established to ${svc}`,
  (svc) => `${svc} processed 1,200 events in batch`,
  (svc) => `${svc} config reload successful`,
  (svc) => `${svc} graceful shutdown initiated`,
  (svc) => `TLS session resumed for ${svc}`,
  (svc) => `${svc} metrics flushed to collector`,
]

const MSG_MAP = { error: ERROR_MSGS, warn: WARN_MSGS, info: INFO_MSGS }

// ─── Real-time single-entry generator (uses true random for live stream) ──────
let _rtSeq = 0
export function generateRealtimeLog() {
  _rtSeq += 1
  const r1 = Math.random()
  const r2 = Math.random()
  const r3 = Math.random()

  let status = 'info'
  if (r1 < 0.30) status = 'error'
  else if (r1 < 0.55) status = 'warn'

  const svc  = SERVICES[Math.floor(r2 * SERVICES.length)]
  const msgs = MSG_MAP[status]
  const msg  = msgs[Math.floor(r3 * msgs.length)](svc)

  return {
    id:           `rt-${Date.now()}-${_rtSeq}`,
    timestamp:    Date.now(),
    status,
    service:      svc,
    message:      msg,
    affectedChain: status !== 'info' ? buildAffectedChain(svc, status) : [],
    traceId:      Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0'),
    spanId:       Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'),
  }
}
