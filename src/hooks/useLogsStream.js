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
  const { accumulatedLogs } = useSimulation()
  const [logs,     setLogs]     = useState(() => [...accumulatedLogs, ...ALL_LOGS])
  const [newIds,   setNewIds]   = useState(() => new Set())
  const [isPaused, setIsPaused] = useState(false)

  const pausedRef = useRef(false)
  pausedRef.current = isPaused

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

  const togglePause = useCallback(() => setIsPaused((v) => !v), [])

  return { logs, newIds, isPaused, togglePause }
}
