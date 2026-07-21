import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_LOGS } from '../data/logsData'
import { useSimulation } from '../context/SimulationContext'

const MAX_LOGS = 800   // cap total in-memory entries

/**
 * useLogsStream
 *
 * Returns the historical log baseline plus whatever a running simulation is
 * currently emitting — no background noise when nothing is happening.
 *
 * @returns {{
 *   logs:     object[],   // full log array, newest first
 *   newIds:   Set<string> // IDs injected in the last tick (for animation)
 *   isPaused: boolean,
 *   togglePause: () => void,
 * }}
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
  // (Guarded against React StrictMode's double-invoke, which would otherwise
  // reprocess the same tick's events twice and insert duplicate rows.)
  useEffect(() => {
    if (logEvents.length === 0 || pausedRef.current) return
    if (lastLogEventsRef.current === logEvents) return
    lastLogEventsRef.current = logEvents
    const ids = new Set(logEvents.map((e) => e.id))
    setNewIds(ids)
    setLogs((prev) => [...logEvents, ...prev].slice(0, MAX_LOGS))
    setTimeout(() => setNewIds(new Set()), 2200)
  }, [logEvents])

  const togglePause = useCallback(() => setIsPaused((v) => !v), [])

  return { logs, newIds, isPaused, togglePause }
}
