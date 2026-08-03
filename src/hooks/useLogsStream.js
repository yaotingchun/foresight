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
  const [logs,     setLogs]     = useState(() => [...ALL_LOGS])
  const [newIds,   setNewIds]   = useState(() => new Set())
  const [isPaused, setIsPaused] = useState(false)

  const pausedRef = useRef(false)
  pausedRef.current = isPaused

  const { logEvents } = useSimulation()
  const lastLogEventsRef = useRef(null)

  // Simulated-scenario log lines feed into the same live stream.
  useEffect(() => {
    if (logEvents.length === 0 || pausedRef.current) return
    if (lastLogEventsRef.current === logEvents) return
    lastLogEventsRef.current = logEvents
    const ids = new Set(logEvents.map((e) => e.id))
    setNewIds(ids)
    setLogs((prev) => [...logEvents, ...prev].slice(0, MAX_LOGS))
    setTimeout(() => setNewIds(new Set()), 2200)
  }, [logEvents])

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
