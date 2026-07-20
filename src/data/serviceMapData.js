import {
  Users,
  Shuffle,
  AppWindow,
  Boxes,
  ShieldCheck,
  UserCog,
  ClipboardList,
  CreditCard,
  Search,
  Package,
  BellRing,
  Database,
  Layers,
  Radio,
  Warehouse,
  Wallet,
  Mail,
} from 'lucide-react'

/**
 * Fixed coordinate space for the graph. Node positions are hand-placed (a
 * curated layout reads far cleaner than a live force sim) and everything is
 * rendered inside a pan/zoom transform, so this never needs to be responsive.
 */
export const CANVAS = { width: 1480, height: 840 }

/** Deterministic-ish sparkline generator so the data file stays declarative. */
function spark(base, jitter, n = 16) {
  const out = []
  let v = base
  for (let i = 0; i < n; i += 1) {
    v += (Math.sin(i * 1.7 + base) + Math.cos(i * 0.9)) * jitter * 0.5
    out.push(Math.max(0, Math.round((v + (i % 3) * jitter * 0.3) * 10) / 10))
  }
  return out
}

/**
 * Services (graph nodes). `kind` drives the small badge label; `health` drives
 * ring + status colors; `metrics` powers the detail panel.
 */
export const NODES = [
  {
    id: 'users',
    label: 'Users',
    kind: 'Entrypoint',
    icon: Users,
    health: 'healthy',
    x: 120,
    y: 420,
    r: 38,
    metrics: { rps: 2400, latency: 12, errorRate: 0.1, uptime: 99.99, spark: spark(2400, 120) },
  },
  {
    id: 'load-balancer',
    label: 'Load Balancer',
    kind: 'Network',
    icon: Shuffle,
    health: 'healthy',
    x: 310,
    y: 420,
    r: 32,
    metrics: { rps: 2380, latency: 3, errorRate: 0.0, uptime: 99.99, spark: spark(2380, 90) },
  },
  {
    id: 'web-portal',
    label: 'Web Portal',
    kind: 'Frontend',
    icon: AppWindow,
    health: 'healthy',
    x: 510,
    y: 220,
    r: 34,
    metrics: { rps: 1520, latency: 42, errorRate: 0.3, uptime: 99.97, spark: spark(1520, 110) },
  },
  {
    id: 'api-gateway',
    label: 'API Gateway',
    kind: 'Gateway',
    icon: Boxes,
    health: 'healthy',
    x: 510,
    y: 580,
    r: 34,
    metrics: { rps: 1980, latency: 18, errorRate: 0.4, uptime: 99.98, spark: spark(1980, 130) },
  },
  {
    id: 'auth-service',
    label: 'Auth Service',
    kind: 'Service',
    icon: ShieldCheck,
    health: 'healthy',
    x: 740,
    y: 150,
    r: 30,
    metrics: { rps: 820, latency: 24, errorRate: 0.2, uptime: 99.99, spark: spark(820, 70) },
  },
  {
    id: 'user-service',
    label: 'User Service',
    kind: 'Service',
    icon: UserCog,
    health: 'healthy',
    x: 740,
    y: 320,
    r: 30,
    metrics: { rps: 710, latency: 31, errorRate: 0.5, uptime: 99.96, spark: spark(710, 80) },
  },
  {
    id: 'order-service',
    label: 'Order Service',
    kind: 'Service',
    icon: ClipboardList,
    health: 'warning',
    x: 740,
    y: 490,
    r: 32,
    metrics: { rps: 640, latency: 148, errorRate: 2.1, uptime: 99.7, spark: spark(640, 140) },
  },
  {
    id: 'payment-service',
    label: 'Payment Service',
    kind: 'Service',
    icon: CreditCard,
    health: 'healthy',
    x: 740,
    y: 660,
    r: 30,
    metrics: { rps: 300, latency: 56, errorRate: 0.6, uptime: 99.95, spark: spark(300, 40) },
  },
  {
    id: 'search-service',
    label: 'Search Service',
    kind: 'Service',
    icon: Search,
    health: 'healthy',
    x: 970,
    y: 230,
    r: 28,
    metrics: { rps: 450, latency: 38, errorRate: 0.3, uptime: 99.94, spark: spark(450, 60) },
  },
  {
    id: 'inventory-service',
    label: 'Inventory Service',
    kind: 'Service',
    icon: Package,
    health: 'warning',
    x: 970,
    y: 410,
    r: 28,
    metrics: { rps: 420, latency: 112, errorRate: 1.4, uptime: 99.8, spark: spark(420, 90) },
  },
  {
    id: 'notification-service',
    label: 'Notification Service',
    kind: 'Service',
    icon: BellRing,
    health: 'healthy',
    x: 970,
    y: 590,
    r: 28,
    metrics: { rps: 210, latency: 22, errorRate: 0.2, uptime: 99.97, spark: spark(210, 30) },
  },
  {
    id: 'redis-cache',
    label: 'Redis Cache',
    kind: 'Cache',
    icon: Layers,
    health: 'healthy',
    x: 1200,
    y: 180,
    r: 30,
    metrics: { rps: 3100, latency: 1.2, errorRate: 0.0, uptime: 100, spark: spark(3100, 160) },
  },
  {
    id: 'primary-db',
    label: 'Primary DB',
    kind: 'Datastore',
    icon: Database,
    health: 'healthy',
    x: 1200,
    y: 360,
    r: 34,
    metrics: { rps: 1740, latency: 8, errorRate: 0.1, uptime: 99.99, spark: spark(1740, 120) },
  },
  {
    id: 'message-queue',
    label: 'Message Queue',
    kind: 'Streaming',
    icon: Radio,
    health: 'warning',
    x: 1200,
    y: 540,
    r: 30,
    metrics: { rps: 960, latency: 15, errorRate: 0.9, uptime: 99.9, spark: spark(960, 100) },
  },
  {
    id: 'data-warehouse',
    label: 'Data Warehouse',
    kind: 'Datastore',
    icon: Warehouse,
    health: 'healthy',
    x: 1390,
    y: 300,
    r: 30,
    metrics: { rps: 180, latency: 240, errorRate: 0.2, uptime: 99.95, spark: spark(180, 24) },
  },
  {
    id: 'payment-gateway',
    label: 'Payment Gateway',
    kind: 'External',
    icon: Wallet,
    health: 'critical',
    x: 970,
    y: 760,
    r: 28,
    metrics: { rps: 180, latency: 890, errorRate: 8.7, uptime: 98.2, spark: spark(180, 60) },
  },
  {
    id: 'email-provider',
    label: 'Email Provider',
    kind: 'External',
    icon: Mail,
    health: 'healthy',
    x: 1390,
    y: 620,
    r: 26,
    metrics: { rps: 140, latency: 320, errorRate: 0.4, uptime: 99.9, spark: spark(140, 20) },
  },
]

/** Directed dependency edges. `throughput` sets the traffic-particle speed. */
export const EDGES = [
  { source: 'users', target: 'load-balancer', throughput: 2400 },
  { source: 'load-balancer', target: 'web-portal', throughput: 1500 },
  { source: 'load-balancer', target: 'api-gateway', throughput: 900 },
  { source: 'web-portal', target: 'api-gateway', throughput: 1200 },
  { source: 'api-gateway', target: 'auth-service', throughput: 800 },
  { source: 'api-gateway', target: 'user-service', throughput: 700 },
  { source: 'api-gateway', target: 'order-service', throughput: 640, health: 'warning' },
  { source: 'api-gateway', target: 'payment-service', throughput: 300 },
  { source: 'api-gateway', target: 'search-service', throughput: 450 },
  { source: 'auth-service', target: 'redis-cache', throughput: 900 },
  { source: 'auth-service', target: 'primary-db', throughput: 500 },
  { source: 'user-service', target: 'primary-db', throughput: 620 },
  { source: 'user-service', target: 'redis-cache', throughput: 780 },
  { source: 'user-service', target: 'notification-service', throughput: 90 },
  { source: 'order-service', target: 'inventory-service', throughput: 420, health: 'warning' },
  { source: 'order-service', target: 'payment-service', throughput: 260 },
  { source: 'order-service', target: 'message-queue', throughput: 380, health: 'warning' },
  { source: 'payment-service', target: 'payment-gateway', throughput: 180, health: 'critical' },
  { source: 'payment-service', target: 'primary-db', throughput: 210 },
  { source: 'search-service', target: 'redis-cache', throughput: 500 },
  { source: 'search-service', target: 'primary-db', throughput: 300 },
  { source: 'inventory-service', target: 'primary-db', throughput: 340 },
  { source: 'inventory-service', target: 'message-queue', throughput: 220 },
  { source: 'message-queue', target: 'notification-service', throughput: 200 },
  { source: 'message-queue', target: 'data-warehouse', throughput: 160 },
  { source: 'notification-service', target: 'email-provider', throughput: 140 },
]

/** ---- Derived lookups (computed once) ---- */

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]))

/** For each node id: the set of directly connected node ids. */
export const NEIGHBORS = (() => {
  const map = {}
  NODES.forEach((n) => {
    map[n.id] = new Set()
  })
  EDGES.forEach((e) => {
    map[e.source]?.add(e.target)
    map[e.target]?.add(e.source)
  })
  return map
})()

/** Edge health falls back to the target node's health when not set explicitly. */
export function edgeHealth(edge) {
  return edge.health ?? NODE_BY_ID[edge.target]?.health ?? 'healthy'
}

export function upstreamOf(id) {
  return EDGES.filter((e) => e.target === id).map((e) => NODE_BY_ID[e.source])
}

export function downstreamOf(id) {
  return EDGES.filter((e) => e.source === id).map((e) => NODE_BY_ID[e.target])
}
