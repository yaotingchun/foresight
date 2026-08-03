import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_LOGS } from '../data/logsData'
import { useSimulation } from '../context/SimulationContext'

const MAX_LOGS = 800   // cap total in-memory entries

const SERVICES_LIST = ['api-gateway', 'payment-service', 'auth-service', 'database-cluster', 'order-service']
const AMBIENT_MESSAGES = [
  'New connection established',
  'User authenticated via oauth2',
  'Health check OK - service operational',
  'Cache hit for user session',
  'Database query executed in 14ms',
]

function generateAmbientLog() {
  const svc = SERVICES_LIST[Math.floor(Math.random() * SERVICES_LIST.length)]
  const msg = AMBIENT_MESSAGES[Math.floor(Math.random() * AMBIENT_MESSAGES.length)]
  const isWarn = Math.random() < 0.15
  return {
    id: `amb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    status: isWarn ? 'warn' : 'info',
    service: svc,
    message: `${svc}: ${msg}`,
    affectedChain: [],
    traceId: `tr-${Math.random().toString(36).substring(2, 10)}`,
    spanId: `sp-${Math.random().toString(36).substring(2, 8)}`,
    incidentId: null,
  }
}

/**
 * useLogsStream
 *
 * Returns a live, continuous log stream combining historical logs,
 * steady background ambient ticks, and active simulation events.
 */
export function useLogsStream() {
  const { accumulatedLogs } = useSimulation()
  const [logs,     setLogs]     = useState(() => [...accumulatedLogs, ...ALL_LOGS])
  const [newIds,   setNewIds]   = useState(() => new Set())
  const [isPaused, setIsPaused] = useState(false)

  const pausedRef = useRef(false)
  pausedRef.current = isPaused

  const { logEvents } = useSimulation()
  const lastLogEventsRef = useRef(null)

  // Simulated-scenario log lines feed into the same live stream.
  // Sync state when accumulatedLogs changes
  useEffect(() => {
    if (accumulatedLogs.length === 0) {
      setLogs([...ALL_LOGS])
      return
    }

    if (pausedRef.current) return

    setLogs((prev) => {
      const existingIds = new Set(prev.map((l) => l.id))
      const newLogs = accumulatedLogs.filter((l) => !existingIds.has(l.id))
      if (newLogs.length === 0) return prev

      const ids = new Set(newLogs.map((l) => l.id))
      setNewIds(ids)
      setTimeout(() => setNewIds(new Set()), 2200)

      return [...newLogs, ...prev].slice(0, MAX_LOGS)
    })
  }, [accumulatedLogs])

  // Steady ambient background log ticker
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return
      const log = generateAmbientLog()
      setLogs((prev) => [log, ...prev].slice(0, MAX_LOGS))
    }, 8000)
    return () => clearInterval(id)
  }, [])

  const togglePause = useCallback(() => setIsPaused((v) => !v), [])

  return { logs, newIds, isPaused, togglePause }
}
