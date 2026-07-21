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

// ─── Root-cause / remediation / prevention knowledge base, keyed by fault type.
// Feeds the Incidents detail breakdown (root cause, remediation plan, flaws,
// preventive measures) so every incident gets a specific, credible write-up
// instead of generic boilerplate.
export const FAULT_ANALYSIS = {
  db_overload: {
    rootCause: 'Query volume and connection demand exceeded the database’s available capacity, causing connections to queue and query latency to spike.',
    action: 'failover_to_replica',
    remediation: 'Failed over reads to a replica and throttled non-critical queries to relieve the primary.',
    flaws: [
      'No automatic read/write splitting to offload read traffic to replicas',
      'Connection pool sizing was not scaled to peak transaction volume',
      'Alert threshold for connection saturation was set too close to the failure point',
    ],
    preventiveMeasures: [
      'Introduce read-replica routing for non-critical queries',
      'Add connection-pool auto-scaling tied to traffic forecasts',
      'Lower alerting thresholds and add trend-based predictive alerts',
    ],
  },
  connection_pool_exhaustion: {
    rootCause: 'A burst of concurrent requests held connections open faster than they were released, exhausting the pool.',
    action: 'restart_service',
    remediation: 'Restarted the affected service to release stuck connections and temporarily raised the pool limit.',
    flaws: [
      'No connection timeout/backpressure policy at the service layer',
      'Pool size was static rather than scaling with load',
      'No circuit breaker to shed load once the pool neared exhaustion',
    ],
    preventiveMeasures: [
      'Add request-level timeouts and backpressure before the pool fills',
      'Make pool size elastic based on concurrent request volume',
      'Add a circuit breaker to fail fast instead of queuing indefinitely',
    ],
  },
  cpu_spike: {
    rootCause: 'Compute demand outpaced provisioned capacity, saturating CPU and degrading response times.',
    action: 'scale_up',
    remediation: 'Triggered horizontal auto-scaling to add replicas and spread load.',
    flaws: [
      'Auto-scaling threshold reacted too late relative to the load ramp',
      'No pre-warming of new instances, adding cold-start latency during scale-up',
    ],
    preventiveMeasures: [
      'Lower the auto-scaling trigger threshold and add predictive scaling',
      'Pre-warm standby capacity for known high-traffic windows',
    ],
  },
  memory_leak: {
    rootCause: 'A gradual memory leak in the application process caused heap usage to climb until garbage collection pauses degraded throughput.',
    action: 'restart_service',
    remediation: 'Performed a rolling restart to reclaim leaked memory and restore normal GC behavior.',
    flaws: [
      'No memory-usage trend alerting to catch the leak before it became critical',
      'No scheduled restarts / memory ceilings to bound the blast radius of a leak',
    ],
    preventiveMeasures: [
      'Add heap-growth trend alerts, not just static memory thresholds',
      'Set memory ceilings with automatic graceful restarts before OOM',
      'Add a memory-profiling pass to CI for high-risk code paths',
    ],
  },
  network_latency: {
    rootCause: 'Elevated packet loss and latency on outbound network links degraded inter-service communication.',
    action: 'rate_limit',
    remediation: 'Applied rate limiting and rerouted traffic away from the degraded network path.',
    flaws: [
      'Single network path with no automatic failover route',
      'No packet-loss-aware health checks feeding the load balancer',
    ],
    preventiveMeasures: [
      'Provision a redundant network path with automatic failover',
      'Feed packet-loss/latency signals into load-balancer health checks',
    ],
  },
  external_timeout: {
    rootCause: 'An external dependency stopped responding within its SLA, and calls to it blocked rather than failing fast.',
    action: 'escalate_to_oncall',
    remediation: 'Opened the circuit breaker on the dependency, escalated to on-call, and queued affected requests for retry.',
    flaws: [
      'No circuit breaker around the external dependency',
      'No fallback path (cache / queued retry) when the dependency is unavailable',
    ],
    preventiveMeasures: [
      'Add a circuit breaker with a fast-fail + fallback path for this dependency',
      'Queue and retry affected requests instead of blocking synchronously',
      'Negotiate/monitor a stricter SLA with the external provider',
    ],
  },
  queue_backlog: {
    rootCause: 'Message production outpaced consumer throughput, causing the queue to back up.',
    action: 'scale_up',
    remediation: 'Scaled out consumers and increased batch throughput to drain the backlog.',
    flaws: [
      'Consumer count was static and did not scale with queue depth',
      'No backlog-depth alert until the queue was already near capacity',
    ],
    preventiveMeasures: [
      'Auto-scale consumers based on queue depth, not just CPU',
      'Add early backlog-growth-rate alerting rather than absolute-depth alerting',
    ],
  },
  disk_io_saturation: {
    rootCause: 'Disk I/O throughput was saturated by write volume, spiking write latency across dependent operations.',
    action: 'scale_up',
    remediation: 'Provisioned additional IOPS and moved hot data to a faster storage tier.',
    flaws: [
      'Storage tier was undersized for peak write volume',
      'No IOPS-utilization alerting ahead of saturation',
    ],
    preventiveMeasures: [
      'Move hot paths to a faster storage tier with headroom',
      'Add IOPS/queue-depth alerting before saturation is reached',
    ],
  },
  traffic_spike: {
    rootCause: 'A sudden surge in inbound traffic exceeded provisioned edge and gateway capacity.',
    action: 'rate_limit',
    remediation: 'Enabled edge rate limiting and triggered auto-scaling across the affected tier.',
    flaws: [
      'No pre-emptive rate limiting ahead of known traffic-spike triggers',
      'Auto-scaling policy lagged behind the speed of the traffic ramp',
    ],
    preventiveMeasures: [
      'Add adaptive rate limiting at the edge for burst protection',
      'Tune auto-scaling to react faster to short, steep traffic ramps',
    ],
  },
  service_outage: {
    rootCause: 'Health checks began failing across instances, and the service was marked unavailable faster than it could recover.',
    action: 'restart_service',
    remediation: 'Restarted unhealthy instances and redirected traffic to the remaining healthy pool.',
    flaws: [
      'No graceful degradation path when a subset of instances is unhealthy',
      'Health-check sensitivity caused a fast full-service markdown instead of partial routing',
    ],
    preventiveMeasures: [
      'Add partial-outage routing so healthy instances keep serving traffic',
      'Tune health-check thresholds to avoid all-or-nothing markdowns',
    ],
  },
  transaction_error_spike: {
    rootCause: 'A statistically abnormal rise in transaction failures was detected, consistent with a downstream processing fault.',
    action: 'block_transaction',
    remediation: 'Auto-blocked the anomalous transaction pattern pending manual review.',
    flaws: [
      'No automatic correlation between transaction failures and concurrent infra incidents',
      'Manual review queue introduced delay before transactions were released or confirmed fraudulent',
    ],
    preventiveMeasures: [
      'Auto-correlate transaction failures with active infra incidents to speed up triage',
      'Add a fast-track review path for infra-correlated (vs. fraud-pattern) anomalies',
    ],
  },
}

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
