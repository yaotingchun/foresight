/**
 * Catalog of "what-if" incident scenarios for the Simulate Event drawer.
 * Each scenario is a chain of stages — a stage lands a fault on one
 * component after `offsetMs` (relative to the run start), so cascades read
 * as one failure triggering the next rather than everything happening at once.
 */

// ─── Fault effect profiles ─────────────────────────────────────────────────
// latencyMult: how many times baseline latency the component hits at full
// severity. errorRate: additional error-rate percentage points at full
// severity. Both are blended in as the stage ramps (see SimulationContext).
export const FAULT_EFFECTS = {
  db_overload:             { latencyMult: 45, errorRate: 12, flavor: 'connection pool saturated, query queue backing up' },
  connection_pool_exhaustion: { latencyMult: 18, errorRate: 10, flavor: 'all connections in use — new requests queued' },
  cpu_spike:               { latencyMult: 6,  errorRate: 4,  flavor: 'CPU utilization critical, autoscaler triggered' },
  memory_leak:             { latencyMult: 4,  errorRate: 3,  flavor: 'heap usage climbing — GC pauses increasing' },
  network_latency:         { latencyMult: 25, errorRate: 6,  flavor: 'packet loss detected on outbound links' },
  external_timeout:        { latencyMult: 60, errorRate: 18, flavor: 'upstream dependency not responding, requests timing out' },
  queue_backlog:           { latencyMult: 20, errorRate: 7,  flavor: 'queue depth exceeding processing capacity' },
  disk_io_saturation:      { latencyMult: 30, errorRate: 6,  flavor: 'disk I/O saturated, write latency spiking' },
  traffic_spike:           { latencyMult: 10, errorRate: 5,  flavor: 'inbound request volume 3x above baseline' },
  service_outage:          { latencyMult: 55, errorRate: 30, flavor: 'health checks failing, service marked unavailable' },
  transaction_error_spike: { latencyMult: 8,  errorRate: 20, flavor: 'transaction failure rate abnormal — anomaly detected' },
}

export const SEVERITY_MULT = { medium: 0.55, high: 0.8, critical: 1.0 }

// ─── Default stage timing (compressed for a watchable demo) ────────────────
export const DEFAULT_RAMP_MS = 6000
export const DEFAULT_HOLD_MS = 10000
export const DEFAULT_RESOLVE_MS = 6000

export const SCENARIOS = [
  {
    id: 'db-overload-payment-failure',
    title: 'Database Overload → Payment Processing Failure',
    summary: 'Database resources become overloaded, payment API slows down, transactions fail.',
    chain: ['primary-db', 'payment-service'],
    txImpact: true,
    stages: [
      { component: 'primary-db', faultType: 'db_overload', severity: 'critical', offsetMs: 0 },
      { component: 'payment-service', faultType: 'connection_pool_exhaustion', severity: 'high', offsetMs: 9000 },
    ],
  },
  {
    id: 'payment-api-outage',
    title: 'Payment API Outage',
    summary: 'API response time and error rate increase until payment services become unavailable.',
    chain: ['payment-service'],
    txImpact: true,
    stages: [
      { component: 'payment-service', faultType: 'service_outage', severity: 'critical', offsetMs: 0 },
    ],
  },
  {
    id: 'traffic-spike-overload',
    title: 'Traffic Spike → Financial Service Overload',
    summary: 'A sudden surge in users overloads the edge, then the gateway, then payments.',
    chain: ['load-balancer', 'api-gateway', 'payment-service'],
    txImpact: true,
    stages: [
      { component: 'load-balancer', faultType: 'traffic_spike', severity: 'medium', offsetMs: 0 },
      { component: 'api-gateway', faultType: 'traffic_spike', severity: 'high', offsetMs: 6000 },
      { component: 'payment-service', faultType: 'cpu_spike', severity: 'critical', offsetMs: 12000 },
    ],
  },
  {
    id: 'db-connection-pool-exhaustion',
    title: 'Database Connection Pool Exhaustion',
    summary: 'Too many simultaneous transactions exhaust database connections; payment requests fail.',
    chain: ['primary-db', 'payment-service'],
    txImpact: true,
    stages: [
      { component: 'primary-db', faultType: 'connection_pool_exhaustion', severity: 'high', offsetMs: 0 },
      { component: 'payment-service', faultType: 'connection_pool_exhaustion', severity: 'critical', offsetMs: 8000 },
    ],
  },
  {
    id: 'app-memory-leak',
    title: 'Application Memory Leak',
    summary: 'Memory usage climbs steadily until the payment application degrades and crashes.',
    chain: ['payment-service'],
    txImpact: true,
    stages: [
      { component: 'payment-service', faultType: 'memory_leak', severity: 'critical', offsetMs: 0, rampMs: 14000 },
    ],
  },
  {
    id: 'network-failure-banking-disruption',
    title: 'Network Failure → Banking Service Disruption',
    summary: 'Rising latency and packet loss make financial services unreachable.',
    chain: ['load-balancer', 'payment-gateway'],
    txImpact: true,
    stages: [
      { component: 'load-balancer', faultType: 'network_latency', severity: 'high', offsetMs: 0 },
      { component: 'payment-gateway', faultType: 'external_timeout', severity: 'critical', offsetMs: 8000 },
    ],
  },
  {
    id: 'payment-gateway-dependency-failure',
    title: 'Payment Gateway Dependency Failure',
    summary: 'The external payment gateway goes down, taking checkout and payments with it.',
    chain: ['payment-gateway', 'payment-service'],
    txImpact: true,
    stages: [
      { component: 'payment-gateway', faultType: 'external_timeout', severity: 'critical', offsetMs: 0 },
      { component: 'payment-service', faultType: 'connection_pool_exhaustion', severity: 'high', offsetMs: 6000 },
    ],
  },
  {
    id: 'transaction-error-spike',
    title: 'Financial Transaction Error Spike',
    summary: 'An unusual jump in failed transactions triggers an early system-failure prediction.',
    chain: ['payment-service'],
    txImpact: true,
    stages: [
      { component: 'payment-service', faultType: 'transaction_error_spike', severity: 'high', offsetMs: 0 },
    ],
  },
  {
    id: 'data-processing-delay',
    title: 'Financial Data Processing Delay',
    summary: 'The batch pipeline backs up, delaying transaction settlement and reporting.',
    chain: ['message-queue', 'data-warehouse'],
    txImpact: false,
    stages: [
      { component: 'message-queue', faultType: 'queue_backlog', severity: 'high', offsetMs: 0 },
      { component: 'data-warehouse', faultType: 'disk_io_saturation', severity: 'medium', offsetMs: 8000 },
    ],
  },
  {
    id: 'cascading-financial-service-failure',
    title: 'Cascading Financial Service Failure',
    summary: 'Database → payments → orders → gateway fail in sequence, taking checkout offline.',
    chain: ['primary-db', 'payment-service', 'order-service', 'api-gateway'],
    txImpact: true,
    stages: [
      { component: 'primary-db', faultType: 'db_overload', severity: 'critical', offsetMs: 0 },
      { component: 'payment-service', faultType: 'connection_pool_exhaustion', severity: 'critical', offsetMs: 8000 },
      { component: 'order-service', faultType: 'connection_pool_exhaustion', severity: 'high', offsetMs: 16000 },
      { component: 'api-gateway', faultType: 'network_latency', severity: 'critical', offsetMs: 24000 },
    ],
  },
]

export const SCENARIOS_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]))
