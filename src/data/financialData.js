import { incidents, transactions } from './dataSource'

// ─── Infrastructure incidents (shared with IT topology) ──────────────────────
// Sourced from incidents.json (scripts/generate_synthetic_data.py). Timestamps
// are kept absolute (unlike the old fake-data hack that faked a "session start"
// and worked in relative seconds) since transactions and incidents now share
// the same real 48h timeline — a transaction's timestamp can be compared to an
// incident's start/end directly.
export const INFRA_INCIDENTS = incidents.map((inc) => {
  const startMs = Date.parse(inc.start_time)
  const endMs   = Date.parse(inc.end_time)
  return {
    id:       inc.id,
    service:  inc.component,
    label:    inc.description,
    type:     inc.fault_type,
    severity: inc.severity,
    tStart:   0,
    tEnd:     Math.round((endMs - startMs) / 1000),
    startMs,
    endMs,
  }
})

const INCIDENTS_BY_ID = Object.fromEntries(INFRA_INCIDENTS.map((inc) => [inc.id, inc]))

export function getInfraCorrelation(timestampMs) {
  return INFRA_INCIDENTS.find((inc) => timestampMs >= inc.startMs && timestampMs <= inc.endMs) ?? null
}

// ─── Account pools ────────────────────────────────────────────────────────────
const ACCOUNTS = [
  'ACC-0042', 'ACC-1187', 'ACC-2291', 'ACC-3354', 'ACC-4480',
  'ACC-5512', 'ACC-6673', 'ACC-7701', 'ACC-8834', 'ACC-9902',
  'EXT-US-883', 'EXT-EU-291', 'EXT-APAC-47', 'EXT-LATAM-16',
  'MERCH-AMZN', 'MERCH-STRIPE', 'MERCH-PAYPAL', 'MERCH-SHOPIFY',
]

const INTERNAL = ACCOUNTS.slice(0, 10)
const EXTERNAL = ACCOUNTS.slice(10)

// ─── Anomaly trigger reasons ──────────────────────────────────────────────────
export const ANOMALY_FEATURES = [
  { key: 'unusual_amount',      label: 'Unusual amount',       icon: '💰' },
  { key: 'unusual_frequency',   label: 'Unusual frequency',    icon: '🔁' },
  { key: 'unusual_destination', label: 'Unusual destination',  icon: '🌐' },
  { key: 'velocity_spike',      label: 'Velocity spike',       icon: '⚡' },
  { key: 'off_hours',           label: 'Off-hours activity',   icon: '🌙' },
]
const FEATURE_BY_KEY = Object.fromEntries(ANOMALY_FEATURES.map((f) => [f.key, f]))

// ─── Transaction categories ───────────────────────────────────────────────────
const TX_TYPES = [
  'wire_transfer', 'ach_payment', 'card_charge', 'refund',
  'inter_account', 'crypto_withdrawal', 'p2p_transfer',
]

// ─── Historical dataset (from scripts/generate_synthetic_data.py) ────────────
// Maps the pipeline's ground-truth labels (is_fraud / anomaly_type) onto the
// UI's triage vocabulary (status / dominantFeature / infraCorrelation).
function classify(t) {
  if (t.is_fraud) {
    const feature = FEATURE_BY_KEY[EXTERNAL.includes(t.dst) ? 'unusual_destination' : 'unusual_amount']
    return { status: 'blocked', anomalyScore: Math.round((0.8 + Math.random() * 0.18) * 100) / 100, feature }
  }
  if (t.anomaly_type === 'infra_retry_duplicate') {
    return { status: 'flagged', anomalyScore: Math.round((0.45 + Math.random() * 0.25) * 100) / 100, feature: FEATURE_BY_KEY.unusual_frequency }
  }
  return { status: 'normal', anomalyScore: Math.round(Math.random() * 0.3 * 100) / 100, feature: null }
}

export const ALL_TRANSACTIONS = transactions
  .map((t) => {
    const { status, anomalyScore, feature } = classify(t)
    return {
      id: t.id,
      timestamp: Date.parse(t.timestamp),
      amount: t.amount,
      currency: t.currency,
      type: t.type,
      src: t.src,
      dst: t.dst,
      status,
      anomalyScore,
      dominantFeature: feature,
      infraCorrelation: t.incident_id ? INCIDENTS_BY_ID[t.incident_id] ?? null : null,
      actionHistory: [],
    }
  })
  .sort((a, b) => b.timestamp - a.timestamp)

// ─── Summary metrics helpers ──────────────────────────────────────────────────
export function computeMetrics(txs) {
  const flagged = txs.filter((t) => t.status === 'flagged')
  const blocked = txs.filter((t) => t.status === 'blocked')
  const anomalous = [...flagged, ...blocked]

  const fraudAnomalies = anomalous.filter((t) => !t.infraCorrelation)
  const infraAnomalies = anomalous.filter((t) =>  t.infraCorrelation)

  const valueAtRisk = anomalous.reduce((s, t) => s + t.amount, 0)

  return {
    total:        txs.length,
    flaggedCount: flagged.length,
    blockedCount: blocked.length,
    fraudCount:   fraudAnomalies.length,
    infraCount:   infraAnomalies.length,
    valueAtRisk,
    // Baseline for volume comparison (simulate ~20% lower)
    baselineTotal: Math.round(txs.length * 0.82),
  }
}

// ─── Real-time entry generator (live-tick simulation only) ────────────────────
let _rtSeq = 0
export function generateRealtimeTx() {
  _rtSeq++
  const r1 = Math.random()
  const r2 = Math.random()
  const r3 = Math.random()
  const r4 = Math.random()
  const r5 = Math.random()
  const r6 = Math.random()

  let amount
  if (r1 < 0.6)       amount = Math.round(r2 * 500 * 100) / 100
  else if (r1 < 0.88) amount = Math.round((500 + r2 * 4500) * 100) / 100
  else if (r1 < 0.97) amount = Math.round((5000 + r2 * 45000) * 100) / 100
  else                amount = Math.round((50000 + r2 * 450000) * 100) / 100

  const txType  = TX_TYPES[Math.floor(r3 * TX_TYPES.length)]
  const src     = INTERNAL[Math.floor(r4 * INTERNAL.length)]
  const dstPool = r5 < 0.6 ? INTERNAL : EXTERNAL
  const dst     = dstPool[Math.floor(r6 * dstPool.length)] === src
    ? dstPool[(Math.floor(r6 * dstPool.length) + 1) % dstPool.length]
    : dstPool[Math.floor(r6 * dstPool.length)]

  const timestamp = Date.now()

  let score = 0
  if (amount > 50000)  score += 0.30
  else if (amount > 10000) score += 0.15
  else if (amount > 5000)  score += 0.08
  if (EXTERNAL.includes(dst)) score += 0.20
  if (txType === 'crypto_withdrawal') score += 0.25
  if (txType === 'wire_transfer' && amount > 10000) score += 0.15
  score += (Math.random() - 0.5) * 0.15
  score = Math.max(0, Math.min(1, score))

  const infraCorr = getInfraCorrelation(timestamp)
  let status
  if      (score >= 0.75) status = 'blocked'
  else if (score >= 0.45) status = 'flagged'
  else                    status = 'normal'

  return {
    id:               `rt-tx-${Date.now()}-${_rtSeq}`,
    timestamp,
    amount,
    currency:         'USD',
    type:             txType,
    src,
    dst,
    status,
    anomalyScore:     Math.round(score * 100) / 100,
    dominantFeature:  score >= 0.45
      ? ANOMALY_FEATURES[Math.floor(Math.random() * ANOMALY_FEATURES.length)]
      : null,
    infraCorrelation: infraCorr,
    actionHistory:    [],
  }
}
