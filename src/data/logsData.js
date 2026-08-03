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

// ─── Historical dataset generator ──────────────────────────────────────────────
function generateRich1HLogs(rawLogs) {
  const baseMapped = rawLogs.map((l) => ({
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

  const now = Date.now()
  const oneHourMs = 60 * 60 * 1000
  const cutoff = now - oneHourMs

  const services = ['api-gateway', 'payment-service', 'auth-service', 'database-cluster', 'order-service']

  const messages = {
    info: [
      'New connection established to api-gateway',
      'User authenticated successfully via oauth2',
      'Payment transaction processed successfully',
      'Database query executed in 12ms',
      'Order status updated to SHIPPED',
    ],
    warn: [
      'Connection pool usage at 88% capacity',
      'API latency spike detected: 320ms',
      'Memory utilization approaching threshold (82%)',
      'Slow query detected in database-cluster (450ms)',
    ],
    error: [
      'Database connection timeout after 5000ms',
      'HTTP 502 Bad Gateway response from payment-service',
      'Transaction failure rate abnormal - anomaly detected',
      'CPU utilization critical, autoscaler triggered',
    ],
  }

  const generated = []
  const NUM_SLOTS = 20

  for (let slot = 0; slot < NUM_SLOTS; slot++) {
    const slotStart = cutoff + (slot * (oneHourMs / NUM_SLOTS))
    const slotDuration = oneHourMs / NUM_SLOTS

    // 2-4 info logs per slot
    const numInfo = Math.floor(Math.random() * 3) + 2
    for (let i = 0; i < numInfo; i++) {
      const ts = slotStart + Math.random() * (slotDuration * 0.9)
      const svc = services[i % services.length]
      generated.push({
        id: `h1-info-${slot}-${i}`,
        timestamp: Math.round(ts),
        status: 'info',
        service: svc,
        message: `${svc}: ${messages.info[i % messages.info.length]}`,
        affectedChain: [],
        traceId: `tr-${Math.random().toString(36).substring(2, 10)}`,
        spanId: `sp-${Math.random().toString(36).substring(2, 8)}`,
        incidentId: null,
      })
    }

    // 1-2 warning logs per slot
    const numWarn = Math.floor(Math.random() * 2) + 1
    for (let w = 0; w < numWarn; w++) {
      const ts = slotStart + Math.random() * (slotDuration * 0.9)
      const svc = services[(w + 1) % services.length]
      generated.push({
        id: `h1-warn-${slot}-${w}`,
        timestamp: Math.round(ts),
        status: 'warn',
        service: svc,
        message: `${svc}: ${messages.warn[w % messages.warn.length]}`,
        affectedChain: buildAffectedChain(svc, 'warn'),
        traceId: `tr-${Math.random().toString(36).substring(2, 10)}`,
        spanId: `sp-${Math.random().toString(36).substring(2, 8)}`,
        incidentId: null,
      })
    }

    // Error logs for 12 out of 20 slots (creating stacked Error + Warn + Info bars)
    if (slot % 2 === 0 || slot === 3 || slot === 7 || slot === 13 || slot === 17) {
      const numErr = Math.floor(Math.random() * 2) + 1
      for (let e = 0; e < numErr; e++) {
        const ts = slotStart + Math.random() * (slotDuration * 0.9)
        const svc = services[(e + 2) % services.length]
        generated.push({
          id: `h1-err-${slot}-${e}`,
          timestamp: Math.round(ts),
          status: 'error',
          service: svc,
          message: `${svc}: ${messages.error[e % messages.error.length]}`,
          affectedChain: buildAffectedChain(svc, 'error'),
          traceId: `tr-${Math.random().toString(36).substring(2, 10)}`,
          spanId: `sp-${Math.random().toString(36).substring(2, 8)}`,
          incidentId: null,
        })
      }
    }
  }

  const existingOlder = baseMapped.filter((l) => l.timestamp < cutoff)
  return [...generated, ...existingOlder].sort((a, b) => b.timestamp - a.timestamp)
}

export const ALL_LOGS = generateRich1HLogs(appLogs)

// ─── Chart bucket helpers ─────────────────────────────────────────────────────
export const LOG_BUCKET_COUNT = 20

export function bucketLogs(logs, rangeMs, buckets = LOG_BUCKET_COUNT, referenceTime = null) {
  const now   = referenceTime || Math.floor(Date.now() / 1000) * 1000
  const start = now - rangeMs
  const step  = rangeMs / buckets
  const result = []

  for (let i = 0; i < buckets; i += 1) {
    const bStart = Math.round(start + i * step)
    const bEnd   = Math.round(bStart + step)
    const slice  = logs.filter((l) => l.timestamp >= bStart && (i === buckets - 1 ? l.timestamp <= bEnd : l.timestamp < bEnd))
    result.push({
      t:     bStart,
      tEnd:  bEnd,
      error: slice.filter((l) => l.status === 'error').length,
      warn:  slice.filter((l) => l.status === 'warn').length,
      info:  slice.filter((l) => l.status === 'info').length,
    })
  }

  return result
}

