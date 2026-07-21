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
import { topology, serviceHealth } from './dataSource'

/**
 * Fixed coordinate space for the graph. Node positions are hand-placed (a
 * curated layout reads far cleaner than a live force sim) and everything is
 * rendered inside a pan/zoom transform, so this never needs to be responsive.
 */
export const CANVAS = { width: 1480, height: 840 }

/**
 * Presentation-only metadata that has no business being in the generated
 * dataset (icon, canvas position, node radius). Keyed by the component id
 * from topology.json.
 */
const LAYOUT = {
  'users':                { icon: Users,        x: 120,  y: 420, r: 38 },
  'load-balancer':         { icon: Shuffle,      x: 310,  y: 420, r: 32 },
  'web-portal':            { icon: AppWindow,    x: 510,  y: 220, r: 34 },
  'api-gateway':           { icon: Boxes,        x: 510,  y: 580, r: 34 },
  'auth-service':          { icon: ShieldCheck,  x: 740,  y: 150, r: 30 },
  'user-service':          { icon: UserCog,      x: 740,  y: 320, r: 30 },
  'order-service':         { icon: ClipboardList,x: 740,  y: 490, r: 32 },
  'payment-service':       { icon: CreditCard,   x: 740,  y: 660, r: 30 },
  'search-service':        { icon: Search,       x: 970,  y: 230, r: 28 },
  'inventory-service':     { icon: Package,      x: 970,  y: 410, r: 28 },
  'notification-service':  { icon: BellRing,     x: 970,  y: 590, r: 28 },
  'redis-cache':           { icon: Layers,       x: 1200, y: 180, r: 30 },
  'primary-db':            { icon: Database,     x: 1200, y: 360, r: 34 },
  'message-queue':         { icon: Radio,        x: 1200, y: 540, r: 30 },
  'data-warehouse':        { icon: Warehouse,    x: 1390, y: 300, r: 30 },
  'payment-gateway':       { icon: Wallet,       x: 970,  y: 760, r: 28 },
  'email-provider':        { icon: Mail,         x: 1390, y: 620, r: 26 },
}

const FALLBACK_METRICS = { rps: 0, latency: 0, errorRate: 0, uptime: 100, spark: [] }

/**
 * Services (graph nodes). Structure (id/label/kind/dependencies) comes from
 * topology.json; health + metrics come from service_health.json (both
 * produced by the synthetic data pipeline — see scripts/). `icon`/`x`/`y`/`r`
 * are the only things still hand-curated here, since layout is a UI concern.
 */
export const NODES = topology.components.map((c) => ({
  id: c.id,
  label: c.label,
  kind: c.kind,
  criticality: c.criticality,
  health: serviceHealth[c.id]?.health ?? 'healthy',
  metrics: serviceHealth[c.id]?.metrics ?? FALLBACK_METRICS,
  ...LAYOUT[c.id],
}))

/** Directed dependency edges. `throughput` sets the traffic-particle speed. */
export const EDGES = topology.dependencies.map((d) => ({
  source: d.source,
  target: d.target,
  throughput: serviceHealth[d.source]?.metrics.rps ?? 0,
}))

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
