// ─── Infrastructure Incidents (shared with IT topology) ──────────────────────
// These are the "known infra events" that we correlate transactions against.
// Each has a time window (relative to a shared baseline) in seconds from
// epoch-0, so t=120 means "120 seconds after the session started".
export const INFRA_INCIDENTS = [
  {
    id:      'inc-db-1',
    service: 'payments_db',
    label:   'payments_db overload',
    tStart:  120,
    tEnd:    150,
    type:    'db-overload',
    severity:'critical',
  },
  {
    id:      'inc-mq-1',
    service: 'message-queue',
    label:   'message-queue backlog spike',
    tStart:  310,
    tEnd:    360,
    type:    'queue-backlog',
    severity:'high',
  },
  {
    id:      'inc-gw-1',
    service: 'api-gateway',
    label:   'api-gateway timeout storm',
    tStart:  480,
    tEnd:    520,
    type:    'timeout-storm',
    severity:'critical',
  },
  {
    id:      'inc-cache-1',
    service: 'redis-cache',
    label:   'redis-cache eviction cascade',
    tStart:  640,
    tEnd:    680,
    type:    'cache-eviction',
    severity:'medium',
  },
]

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

// ─── Transaction categories ───────────────────────────────────────────────────
const TX_TYPES = [
  'wire_transfer', 'ach_payment', 'card_charge', 'refund',
  'inter_account', 'crypto_withdrawal', 'p2p_transfer',
]

// ─── Seeded PRNG ──────────────────────────────────────────────────────────────
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453
  return x - Math.floor(x)
}

// ─── Infra correlation checker ────────────────────────────────────────────────
// sessionStart is a fixed reference point (ms). Incidents store times in
// "session seconds" so we convert.
const SESSION_START_MS = Date.now() - 900_000 // 15 min ago as baseline

export function getInfraCorrelation(timestampMs) {
  const tSec = (timestampMs - SESSION_START_MS) / 1000
  return INFRA_INCIDENTS.find(
    (inc) => tSec >= inc.tStart && tSec <= inc.tEnd
  ) ?? null
}

// ─── Core generator ──────────────────────────────────────────────────────────
function generateTransactions(count = 300) {
  const now = Date.now()
  const txs = []

  for (let i = 0; i < count; i++) {
    const r1 = seededRand(i * 7)
    const r2 = seededRand(i * 7 + 1)
    const r3 = seededRand(i * 7 + 2)
    const r4 = seededRand(i * 7 + 3)
    const r5 = seededRand(i * 7 + 4)
    const r6 = seededRand(i * 7 + 5)

    // Timestamp spread across last 24 hours (with higher weight on recent)
    const rawR = r1
    const ageMs = rawR < 0.5
      ? Math.floor(rawR * 2 * 15 * 60 * 1000) // 50% in last 15 min
      : Math.floor(rawR * 24 * 60 * 60 * 1000) // 50% across 24 hours
    const timestamp = now - ageMs

    // Amount: mostly small, occasional large
    let amount
    if (r2 < 0.6)       amount = Math.round(r3 * 500 * 100) / 100          // $0–$500
    else if (r2 < 0.88) amount = Math.round((500 + r3 * 4500) * 100) / 100 // $500–$5k
    else if (r2 < 0.97) amount = Math.round((5000 + r3 * 45000) * 100) / 100 // $5k–$50k
    else                amount = Math.round((50000 + r3 * 450000) * 100) / 100 // $50k–$500k

    const txType   = TX_TYPES[Math.floor(r4 * TX_TYPES.length)]
    const srcIdx   = Math.floor(r5 * INTERNAL.length)
    const dstPool  = r6 < 0.6 ? INTERNAL : EXTERNAL
    const dstIdx   = Math.floor(seededRand(i * 7 + 6) * dstPool.length)
    const src      = INTERNAL[srcIdx]
    const dst      = dstPool[dstIdx] === src
      ? dstPool[(dstIdx + 1) % dstPool.length]
      : dstPool[dstIdx]

    // Anomaly scoring
    const anomalyScore = computeAnomalyScore(amount, txType, dst, timestamp, i)
    const infraCorr    = getInfraCorrelation(timestamp)

    // Status
    let status
    if      (anomalyScore >= 0.75) status = 'blocked'
    else if (anomalyScore >= 0.45) status = 'flagged'
    else                           status = 'normal'

    txs.push({
      id:          `tx-${i}`,
      timestamp,
      amount,
      currency:    'USD',
      type:        txType,
      src,
      dst,
      status,
      anomalyScore: Math.round(anomalyScore * 100) / 100,
      dominantFeature: anomalyScore >= 0.45
        ? ANOMALY_FEATURES[Math.floor(seededRand(i * 13) * ANOMALY_FEATURES.length)]
        : null,
      infraCorrelation: infraCorr,
      // For the action log
      actionHistory: [],
    })
  }

  return txs.sort((a, b) => b.timestamp - a.timestamp)
}

function computeAnomalyScore(amount, txType, dst, timestamp, seed) {
  let score = 0
  const r = seededRand(seed * 17)

  // Large amount signals
  if (amount > 50000)  score += 0.30
  else if (amount > 10000) score += 0.15
  else if (amount > 5000)  score += 0.08

  // External destination
  if (EXTERNAL.includes(dst)) score += 0.20

  // High-risk types
  if (txType === 'crypto_withdrawal') score += 0.25
  if (txType === 'wire_transfer' && amount > 10000) score += 0.15
  if (txType === 'p2p_transfer' && amount > 2000)   score += 0.10

  // Off-hours (crude: check hour of day)
  const h = new Date(timestamp).getHours()
  if (h < 6 || h > 22) score += 0.15

  // Random jitter for realism
  score += (r - 0.5) * 0.15

  return Math.max(0, Math.min(1, score))
}

// ─── Pre-generated dataset ────────────────────────────────────────────────────
export const ALL_TRANSACTIONS = generateTransactions(300)

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

// ─── Real-time entry generator ────────────────────────────────────────────────
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

  const timestamp    = Date.now()
  const anomalyScore = computeAnomalyScore(amount, txType, dst, timestamp, _rtSeq)
  const infraCorr    = getInfraCorrelation(timestamp)

  let status
  if      (anomalyScore >= 0.75) status = 'blocked'
  else if (anomalyScore >= 0.45) status = 'flagged'
  else                           status = 'normal'

  return {
    id:               `rt-tx-${Date.now()}-${_rtSeq}`,
    timestamp,
    amount,
    currency:         'USD',
    type:             txType,
    src,
    dst,
    status,
    anomalyScore:     Math.round(anomalyScore * 100) / 100,
    dominantFeature:  anomalyScore >= 0.45
      ? ANOMALY_FEATURES[Math.floor(Math.random() * ANOMALY_FEATURES.length)]
      : null,
    infraCorrelation: infraCorr,
    actionHistory:    [],
  }
}
