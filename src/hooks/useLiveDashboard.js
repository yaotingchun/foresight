import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * The single source of live data for the Overview dashboard. It seeds a bank of
 * historical series (one per time range) and, while the "Live" range is active,
 * appends a fresh sample every tick so the traffic + performance charts scroll in
 * real time. The "current" gauges (resources, status mix, KPIs, event feed) keep
 * breathing on every tick regardless of the selected range.
 *
 * Everything is synthetic but deterministic-ish and self-consistent (error rate
 * tracks 5xx share, p99 ≥ p95 ≥ p50, etc.) so the UI reads like a real system.
 */

const TICK_MS = 2000
const LIVE_POINTS = 60

export const TIME_RANGES = [
  { id: 'live', label: 'Live', points: LIVE_POINTS, stepSec: 2, withSeconds: true },
  { id: '1h', label: '1H', points: 60, stepSec: 60, withSeconds: false },
  { id: '24h', label: '24H', points: 48, stepSec: 1800, withSeconds: false },
  { id: '7d', label: '7D', points: 56, stepSec: 10800, withSeconds: false },
]

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** Organic series: slow trend + layered sines + light noise + occasional spike. */
function wave(n, base, amp, seed = 1, spike = 0) {
  const out = []
  for (let i = 0; i < n; i += 1) {
    const trend = Math.sin(i / n * Math.PI) * amp * 0.35
    const s =
      Math.sin(i * 0.35 + seed) * amp * 0.5 +
      Math.sin(i * 0.11 + seed * 2) * amp * 0.32 +
      Math.cos(i * 0.7 + seed) * amp * 0.14
    const noise = (Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453 % 1) * amp * 0.12
    const burst = spike && i % 17 === (seed | 0) % 17 ? amp * spike : 0
    out.push(Math.max(0, Math.round(base + trend + s + noise + burst)))
  }
  return out
}

/** Build a full timestamped history for a given range. */
function buildHistory(range, now) {
  const reqBase = { live: 2450, '1h': 2380, '24h': 2210, '7d': 2050 }[range.id]
  const requests = wave(range.points, reqBase, 620, 1.4, range.id === 'live' ? 0 : 0.35)
  const prev = wave(range.points, reqBase * 0.92, 560, 3.1)
  const p50 = wave(range.points, 42, 14, 2.2)
  const p95 = p50.map((v, i) => v + 60 + Math.round(Math.abs(Math.sin(i * 0.4 + 1)) * 55))
  const p99 = p95.map((v, i) => v + 40 + Math.round(Math.abs(Math.cos(i * 0.3 + 2)) * 90))
  const t = []
  for (let i = 0; i < range.points; i += 1) {
    t.push(new Date(now.getTime() - (range.points - 1 - i) * range.stepSec * 1000))
  }
  return { t, requests, prev, p50, p95, p99 }
}

function nextSample(prevReq, seed) {
  const drift = (Math.random() - 0.48) * 180
  const wobble = Math.sin(seed * 0.4) * 120
  return Math.round(clamp(prevReq + drift + wobble, 1400, 3800))
}

const EVENT_POOL = [
  { kind: 'healthy', text: 'Auto-scaling added 2 nodes to api-gateway', source: 'orchestrator' },
  { kind: 'healthy', text: 'Deploy checkout-svc v2.14.0 completed', source: 'ci/cd' },
  { kind: 'warning', text: 'p99 latency above 220ms on payments-api', source: 'apm' },
  { kind: 'warning', text: 'Cache hit ratio dropped to 88% on redis-primary', source: 'redis' },
  { kind: 'critical', text: '5xx spike detected on inventory-service', source: 'alerting' },
  { kind: 'healthy', text: 'Health checks passing across 3 regions', source: 'probe' },
  { kind: 'warning', text: 'Disk usage 82% on db-analytics-02', source: 'infra' },
  { kind: 'healthy', text: 'TLS certificate renewed for *.foresight.io', source: 'security' },
]

let eventSeq = 0
function makeEvent(now) {
  const pick = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)]
  eventSeq += 1
  return { id: `${now.getTime()}-${eventSeq}`, at: now, ...pick }
}

const TOP_ENDPOINTS = [
  { path: 'GET  /api/v2/orders', share: 24 },
  { path: 'POST /api/v2/checkout', share: 18 },
  { path: 'GET  /api/v2/catalog', share: 16 },
  { path: 'GET  /api/v2/user/session', share: 13 },
  { path: 'POST /api/v2/payments', share: 11 },
]

export function useLiveDashboard() {
  const [range, setRange] = useState('live')
  const startRef = useRef(new Date())

  // Seed one history per range so switching ranges is instant and stable.
  const [histories, setHistories] = useState(() => {
    const now = new Date()
    const map = {}
    for (const r of TIME_RANGES) map[r.id] = buildHistory(r, now)
    return map
  })

  const [current, setCurrent] = useState(() => ({
    resources: { cpu: 46, memory: 63, disk: 71, network: 38 },
    statusMix: { '2xx': 94.1, '3xx': 2.4, '4xx': 2.7, '5xx': 0.8 },
    activeIncidents: 2,
    nodesHealthy: 142,
    nodesTotal: 148,
  }))

  const [events, setEvents] = useState(() => {
    const now = new Date()
    return Array.from({ length: 5 }, (_, i) => makeEvent(new Date(now.getTime() - i * 47000))).reverse()
  })

  const tickRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      tickRef.current += 1
      const seed = tickRef.current

      // 1. Live traffic + latency series scroll forward.
      setHistories((prev) => {
        const live = prev.live
        const lastReq = live.requests[live.requests.length - 1]
        const req = nextSample(lastReq, seed)
        const p50 = clamp(38 + Math.sin(seed * 0.5) * 10 + Math.random() * 8, 20, 90)
        const p95 = p50 + 55 + Math.abs(Math.sin(seed * 0.3)) * 45
        const p99 = p95 + 35 + Math.abs(Math.cos(seed * 0.4)) * 95
        const nextLive = {
          t: [...live.t.slice(1), now],
          requests: [...live.requests.slice(1), req],
          prev: [...live.prev.slice(1), Math.round(req * (0.88 + Math.random() * 0.08))],
          p50: [...live.p50.slice(1), Math.round(p50)],
          p95: [...live.p95.slice(1), Math.round(p95)],
          p99: [...live.p99.slice(1), Math.round(p99)],
        }
        return { ...prev, live: nextLive }
      })

      // 2. Current gauges breathe.
      setCurrent((prev) => {
        const step = (v, lo, hi, d = 4) => clamp(v + (Math.random() - 0.5) * d, lo, hi)
        const cpu = step(prev.resources.cpu, 22, 92, 6)
        const s5 = clamp(prev.statusMix['5xx'] + (Math.random() - 0.5) * 0.4, 0.1, 4.5)
        const s4 = clamp(prev.statusMix['4xx'] + (Math.random() - 0.5) * 0.5, 1.2, 6)
        const s3 = clamp(prev.statusMix['3xx'] + (Math.random() - 0.5) * 0.3, 1.5, 4)
        return {
          resources: {
            cpu: Math.round(cpu),
            memory: Math.round(step(prev.resources.memory, 40, 90, 3)),
            disk: Math.round(step(prev.resources.disk, 60, 88, 1.2)),
            network: Math.round(step(prev.resources.network, 18, 82, 8)),
          },
          statusMix: {
            '5xx': Math.round(s5 * 10) / 10,
            '4xx': Math.round(s4 * 10) / 10,
            '3xx': Math.round(s3 * 10) / 10,
            '2xx': Math.round((100 - s5 - s4 - s3) * 10) / 10,
          },
          activeIncidents: prev.activeIncidents,
          nodesHealthy: clamp(prev.nodesHealthy + (Math.random() < 0.1 ? (Math.random() < 0.5 ? -1 : 1) : 0), 138, 148),
          nodesTotal: prev.nodesTotal,
        }
      })

      // 3. Occasionally push a new event.
      if (Math.random() < 0.33) {
        setEvents((prev) => [makeEvent(now), ...prev].slice(0, 14))
      }
    }, TICK_MS)
    return () => clearInterval(id)
  }, [])

  const setRangeSafe = useCallback((id) => setRange(id), [])

  const rangeMeta = useMemo(() => TIME_RANGES.find((r) => r.id === range), [range])
  const series = histories[range]

  // Derived KPI figures from the currently visible series + current gauges.
  const kpis = useMemo(() => {
    const req = series.requests
    const now = req[req.length - 1]
    const before = req[Math.max(0, req.length - 6)]
    const throughputDelta = before ? ((now - before) / before) * 100 : 0

    const p95now = series.p95[series.p95.length - 1]
    const p95before = series.p95[Math.max(0, series.p95.length - 6)]
    const latencyDelta = p95before ? ((p95now - p95before) / p95before) * 100 : 0

    const errorRate = current.statusMix['5xx']
    const avail = 100 - errorRate * 0.15

    return {
      throughput: { value: now, delta: throughputDelta, spark: req.slice(-18) },
      latency: { value: p95now, delta: latencyDelta, spark: series.p95.slice(-18) },
      errorRate: { value: errorRate, delta: (errorRate - 0.8) / 0.8 * 100, spark: series.p99.slice(-18) },
      availability: { value: avail, spark: req.slice(-18) },
      incidents: { value: current.activeIncidents },
    }
  }, [series, current])

  return {
    range,
    rangeMeta,
    setRange: setRangeSafe,
    series,
    current,
    events,
    kpis,
    topEndpoints: TOP_ENDPOINTS,
    startedAt: startRef.current,
    tick: tickRef.current,
  }
}
