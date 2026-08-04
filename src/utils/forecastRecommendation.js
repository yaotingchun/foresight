/**
 * forecastRecommendation.js
 * 
 * General rule engine mapping (metric type + risk level -> recommendation template).
 * Provides actionable AI recommendations and staged escalation timelines for:
 * - 16 System Components
 * - 10 Simulate Event scenarios
 * - Live-detected anomalies
 * - Healthy / steady-state components
 */

export function generateRecommendation({
  component = 'component',
  riskLevel = 'healthy',
  topMetric = 'cpu_pct',
  currentMetrics = {},
  anomalyCount = 0,
  activeEffect = null,
}) {
  let effectiveRisk = riskLevel ? riskLevel.toLowerCase() : 'healthy'
  let metric = topMetric || 'cpu_pct'

  // If there's an active simulation effect on this component, update effective risk and metric
  if (activeEffect) {
    const s = activeEffect.s || 0
    effectiveRisk = s > 0.5 ? 'critical' : s > 0.15 ? 'warning' : 'healthy'
    const m = activeEffect.metrics || {}
    if (m.errorRate > 0.05 || (m.latency && m.latency > 250)) {
      metric = m.latency > 250 ? 'latency_ms' : 'error_rate'
    } else if (m.cpu > 70) {
      metric = 'cpu_pct'
    } else if (m.memory > 75) {
      metric = 'memory_pct'
    }
  }

  const compLower = component.toLowerCase()

  // Tailor metric type based on component domain if generic
  if (compLower.includes('db') || compLower.includes('redis') || compLower.includes('queue')) {
    if (
      currentMetrics?.connection_count > 80 ||
      compLower.includes('primary-db') ||
      metric === 'connections' ||
      metric === 'connection_count'
    ) {
      metric = 'connection_pool'
    }
  }

  // Deterministic seed derived from component name for consistent timeline projections
  let seed = 0
  for (let i = 0; i < component.length; i++) {
    seed += component.charCodeAt(i)
  }
  const factor = (seed % 10) / 10.0

  // Escalation Timeline (only for Warning and Critical states)
  let timeline = null
  if (effectiveRisk === 'critical') {
    const pastWarnHours = (0.4 + factor * 0.5).toFixed(1)
    const critHours = (0.8 + factor * 1.1 + (anomalyCount > 2 ? 0.3 : 0.6)).toFixed(1)
    timeline = `WARNING reached ~${pastWarnHours}h ago · CRITICAL active now — total capacity breach projected in ~${critHours}h`
  } else if (effectiveRisk === 'warning') {
    const warnStartHours = (0.3 + factor * 0.4).toFixed(1)
    const critHours = (1.4 + factor * 1.7).toFixed(1)
    timeline = `At current rate: WARNING active (started ~${warnStartHours}h ago), CRITICAL projected in ~${critHours}h`
  }

  let titleA = ''
  let textA = ''
  let titleB = ''
  let textB = ''

  const metricStr = (metric || '').toLowerCase()

  if (effectiveRisk === 'critical' || effectiveRisk === 'warning') {
    if (metricStr.includes('connection') || metricStr.includes('pool') || compLower.includes('db')) {
      titleA = 'Expand Connection Pool & Enable Recycling'
      textA = 'Connection count and pool utilization are spiking. Increase max pool size, verify connection release in request teardown, and enable connection recycling to prevent pool exhaustion.'
      titleB = 'Implement Query Throttling & Failover Routing'
      textB = 'Apply backpressure throttling on non-critical queries and prepare automatic failover routing to secondary read replicas.'
    } else if (metricStr.includes('retry') || metricStr.includes('log_error') || metricStr.includes('error')) {
      titleA = 'Review Backoff & Retry Logic'
      textA = 'Log error rates and request retries are climbing rapidly. Audit retry logic for exponential backoff with jitter and implement circuit breakers to avoid cascading retry storms.'
      titleB = 'Enable Fallback Circuit Breaking'
      textB = 'Trip circuit breakers for degraded downstream endpoints to shed failing traffic and return cached fallback responses.'
    } else if (metricStr.includes('cpu')) {
      titleA = 'Scale CPU & Compute Resource Allocation'
      textA = 'CPU utilization is trending above nominal limits. Trigger horizontal autoscaling or increase compute instance allocation to accommodate current workload.'
      titleB = 'Optimize Thread Allocation & Rate Limits'
      textB = 'Apply request rate-limiting policies at the API gateway and audit worker thread concurrency parameters.'
    } else if (metricStr.includes('memory')) {
      titleA = 'Investigate Memory Leak & Scheduled Restarts'
      textA = 'Memory consumption is climbing steadily without garbage collection recovery. Profile heap allocations for memory leaks and implement rolling container restarts as a temporary mitigation.'
      titleB = 'Adjust Heap Ceilings & GC Parameters'
      textB = 'Tune JVM/Node memory ceilings and trigger immediate garbage collection cycles to mitigate Out-Of-Memory risks.'
    } else if (metricStr.includes('latency')) {
      titleA = 'Investigate Downstream Dependency Latency'
      textA = 'Response latency is significantly elevated. Inspect downstream service calls, database query execution times, and network transport bottlenecks.'
      titleB = 'Enable Asynchronous Request Queuing'
      textB = 'Decouple synchronous request pipelines by offloading heavy execution steps to background message queues.'
    } else {
      titleA = 'Audit Application Error Handling & Circuit Breakers'
      textA = 'Elevated anomaly count detected across telemetry channels. Inspect application error logs for unhandled exceptions and enable automated fallback routing.'
      titleB = 'Perform Diagnostic Health Check & Log Audit'
      textB = 'Cross-examine active trace IDs with system error logs to pinpoint failing dependency modules.'
    }
  } else {
    // Healthy / stable state forward-looking observations
    if (metricStr.includes('rps') || metricStr.includes('throughput')) {
      titleA = 'Routine RPS & Throughput Monitoring'
      textA = 'No action needed, but monitor if RPS growth continues past current levels.'
      titleB = 'Verify Load Balancer Capacity'
      textB = 'Ensure ingress gateway thresholds are configured to absorb unexpected traffic surges.'
    } else if (metricStr.includes('retry') || metricStr.includes('log_error') || metricStr.includes('error')) {
      titleA = 'Routine Retry Count Observation'
      textA = 'Stable — worth watching if retry count trend continues upward.'
      titleB = 'Inspect Error Rate Baselines'
      textB = 'Verify exception handler log aggregations remain clean across all application nodes.'
    } else if (metricStr.includes('cpu')) {
      titleA = 'CPU Baseline Observation'
      textA = 'System operating within healthy parameters — watch CPU trend during upcoming traffic peaks.'
      titleB = 'Review Autoscaler Pre-Warming'
      textB = 'Confirm horizontal autoscaler standby policies are active for high-traffic windows.'
    } else if (metricStr.includes('memory')) {
      titleA = 'Memory Profile Observation'
      textA = 'Stable memory profile — monitor heap allocation if background processing expands.'
      titleB = 'Monitor Garbage Collection Latency'
      textB = 'Track garbage collection pause times to prevent unexpected latency spikes.'
    } else if (metricStr.includes('latency')) {
      titleA = 'Latency Baseline Observation'
      textA = 'Nominal operational status — maintain observation of downstream dependency response times.'
      titleB = 'Validate Cache Hit Ratios'
      textB = 'Verify caching layers are serving peak traffic cleanly with high hit rates.'
    } else if (metricStr.includes('connection') || metricStr.includes('pool')) {
      titleA = 'Connection Pool Observation'
      textA = 'Connection pool utilization is healthy — observe client connection pool recycling trends.'
      titleB = 'Audit Active Connection Timeouts'
      textB = 'Ensure connection idle timeouts are tuned to prevent stale connection leaks.'
    } else {
      titleA = 'Routine Health Observation'
      textA = 'Component operating nominally within historical parameters — no immediate action required.'
      titleB = 'Baseline Telemetry Review'
      textB = 'Maintain standard SRE telemetry monitoring and automated alert checks.'
    }
  }

  return {
    title: titleA,
    text: textA,
    suggestions: [
      { option: 'Option A', title: titleA, text: textA },
      { option: 'Option B', title: titleB, text: textB },
    ],
    timeline,
    riskLevel: effectiveRisk,
    topMetric: metric,
  }
}
