/** Health palette shared across nodes, edges, legend and detail panel. */
export const STATUS = {
  healthy: { color: '#22C55E', tint: '#DCFCE7', soft: 'rgba(34,197,94,0.35)', label: 'Healthy' },
  warning: { color: '#F59E0B', tint: '#FEF3C7', soft: 'rgba(245,158,11,0.38)', label: 'Warning' },
  critical: { color: '#EF4444', tint: '#FEE2E2', soft: 'rgba(239,68,68,0.40)', label: 'Critical' },
  unknown: { color: '#94A3B8', tint: '#F1F5F9', soft: 'rgba(148,163,184,0.35)', label: 'Unknown' },
}

export const EDGE_NEUTRAL = '#CBD5E1'

export function statusOf(health) {
  return STATUS[health] ?? STATUS.unknown
}

export const LEGEND_ITEMS = [
  { health: 'healthy', label: 'Healthy' },
  { health: 'warning', label: 'Warning' },
  { health: 'critical', label: 'Critical' },
  { health: 'unknown', label: 'Unknown' },
]
