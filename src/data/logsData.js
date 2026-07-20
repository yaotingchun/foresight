// ─── Services ────────────────────────────────────────────────────────────────
export const SERVICES = [
  'api-gateway',
  'auth-service',
  'order-service',
  'payment-service',
  'inventory-service',
  'notification-service',
  'user-service',
  'search-service',
  'redis-cache',
  'primary-db',
  'message-queue',
  'web-portal',
]

// ─── Dependency graph (used to build "affected chain" display) ────────────────
export const SERVICE_DEPENDENCIES = {
  'api-gateway':           ['auth-service', 'order-service', 'payment-service', 'search-service', 'user-service'],
  'auth-service':          ['redis-cache', 'primary-db'],
  'order-service':         ['inventory-service', 'payment-service', 'message-queue'],
  'payment-service':       ['primary-db'],
  'inventory-service':     ['primary-db', 'message-queue'],
  'notification-service':  ['message-queue'],
  'user-service':          ['primary-db', 'redis-cache', 'notification-service'],
  'search-service':        ['redis-cache', 'primary-db'],
  'redis-cache':           [],
  'primary-db':            [],
  'message-queue':         ['notification-service'],
  'web-portal':            ['api-gateway'],
}

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

// ─── Helper: deterministic pseudo-random seeded by index ─────────────────────
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453
  return x - Math.floor(x)
}

// ─── Generate realistic log messages ─────────────────────────────────────────
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

// ─── Generate N log entries covering a rolling time window ───────────────────
function generateLogs(count = 400) {
  const now = Date.now()
  const logs = []

  // Weight: 35% error, 25% warn, 40% info
  const statusWeights = [
    { status: 'error', weight: 0.35 },
    { status: 'warn',  weight: 0.25 },
    { status: 'info',  weight: 0.40 },
  ]

  for (let i = 0; i < count; i++) {
    const r1 = seededRand(i * 3)
    const r2 = seededRand(i * 3 + 1)
    const r3 = seededRand(i * 3 + 2)

    // Pick status
    let status = 'info'
    const rStatus = r1
    if (rStatus < 0.35) status = 'error'
    else if (rStatus < 0.60) status = 'warn'

    // Pick service
    const svc = SERVICES[Math.floor(r2 * SERVICES.length)]

    // Pick message
    const msgs = MSG_MAP[status]
    const msg = msgs[Math.floor(r3 * msgs.length)](svc)

    // Timestamp: spread across last 24 hours, newest first
    const age = Math.floor(seededRand(i * 7 + 5) * 24 * 60 * 60 * 1000)
    const timestamp = now - age

    logs.push({
      id: `log-${i}`,
      timestamp,
      status,
      service: svc,
      message: msg,
      // Affected chain: only meaningful for error/warn
      affectedChain: status !== 'info'
        ? buildAffectedChain(svc, status)
        : [],
      traceId: `${Math.floor(seededRand(i * 11) * 0xffffffff).toString(16).padStart(8, '0')}`,
      spanId:  `${Math.floor(seededRand(i * 13) * 0xffffff).toString(16).padStart(6, '0')}`,
    })
  }

  // Sort newest first
  return logs.sort((a, b) => b.timestamp - a.timestamp)
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

// ─── Chart bucket helpers ─────────────────────────────────────────────────────
export function bucketLogs(logs, rangeMs, buckets = 30) {
  const now   = Date.now()
  const start = now - rangeMs
  const step  = rangeMs / buckets
  const result = []

  for (let i = 0; i < buckets; i++) {
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

// ─── Export a pre-generated dataset ──────────────────────────────────────────
export const ALL_LOGS = generateLogs(400)

// ─── Real-time single-entry generator (uses true random for live stream) ──────
let _rtSeq = 0
export function generateRealtimeLog() {
  _rtSeq++
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
