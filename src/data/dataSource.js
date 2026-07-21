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
export const incidents = await loadJson('incidents.json')
export const appLogs = await loadJson('app_logs.json')
export const transactions = await loadJson('transactions.json')
export const serviceHealth = await loadJson('service_health.json')
