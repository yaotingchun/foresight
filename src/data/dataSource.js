/**
 * Single fetch point for the generated dataset in public/data (produced by
 * scripts/generate_synthetic_data.py + scripts/sync_public_data.py). Every
 * data module imports from here instead of hitting fetch() directly, so the
 * files are only ever loaded once no matter how many modules need them.
 *
 * Top-level await: importing this module blocks until all fetches resolve,
 * and — per ESM semantics — so does anything that imports serviceMapData.js /
 * logsData.js / financialData.js, which is what lets those files keep
 * exporting plain, already-populated arrays instead of turning every
 * consumer into an async component.
 *
 * Timestamp shifting: the dataset is a fixed 48h window ending whenever the
 * pipeline last ran. Without adjustment, every "last 15 min / 1h" filter in
 * the UI goes empty the moment real time drifts past that window (e.g. the
 * next day). So on load we shift every historical timestamp forward by a
 * constant offset that puts the dataset's most recent event at "now" — the
 * whole 48h window slides with real time, and re-opening the app tomorrow
 * looks the same as opening it today.
 */

const BASE = '/data'
const cache = {}

function loadJson(name) {
  if (!cache[name]) {
    cache[name] = fetch(`${BASE}/${name}`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${name}: ${res.status}`)
      return res.json()
    })
  }
  return cache[name]
}

export const topology = await loadJson('topology.json')
export const serviceHealth = await loadJson('service_health.json')

const rawIncidents = await loadJson('incidents.json')
const rawAppLogs = await loadJson('app_logs.json')
const rawTransactions = await loadJson('transactions.json')

const INCIDENT_TIMESTAMP_FIELDS = [
  'pre_incident_window_start', 'start_time', 'ramp_end_time',
  'hold_end_time', 'end_time', 'post_incident_window_end',
]

function latestTimestampMs() {
  let max = 0
  rawAppLogs.forEach((l) => { max = Math.max(max, Date.parse(l.timestamp)) })
  rawTransactions.forEach((t) => { max = Math.max(max, Date.parse(t.timestamp)) })
  rawIncidents.forEach((i) => { max = Math.max(max, Date.parse(i.end_time)) })
  return max
}

const shiftMs = Date.now() - latestTimestampMs()

function shiftIso(iso) {
  return new Date(Date.parse(iso) + shiftMs).toISOString()
}

rawAppLogs.forEach((l) => { l.timestamp = shiftIso(l.timestamp) })
rawTransactions.forEach((t) => { t.timestamp = shiftIso(t.timestamp) })
rawIncidents.forEach((inc) => {
  INCIDENT_TIMESTAMP_FIELDS.forEach((field) => {
    if (inc[field]) inc[field] = shiftIso(inc[field])
  })
})

export const incidents = rawIncidents
export const appLogs = rawAppLogs
export const transactions = rawTransactions
