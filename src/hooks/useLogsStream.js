import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_LOGS, generateRealtimeLog } from '../data/logsData'

const MAX_LOGS    = 800   // cap total in-memory entries
const INTERVAL_MS = 1800  // new batch every 1.8 s

/**
 * useLogsStream
 *
 * Returns a live, ever-growing log array that prepends new entries
 * on every tick, simulating a real-time enterprise log stream.
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

  useEffect(() => {
    const tick = () => {
      if (pausedRef.current) return

      // Occasionally burst (simulate incident) — 15% chance of 4-7 entries
      const isBurst = Math.random() < 0.15
      const count   = isBurst
        ? Math.floor(Math.random() * 4) + 4   // 4-7
        : Math.floor(Math.random() * 3) + 1   // 1-3

      const batch = Array.from({ length: count }, () => generateRealtimeLog())
      const ids   = new Set(batch.map((e) => e.id))

      setNewIds(ids)
      setLogs((prev) => [...batch, ...prev].slice(0, MAX_LOGS))

      // Clear the "new" highlight after animation completes
      setTimeout(() => setNewIds(new Set()), 2200)
    }

    const id = setInterval(tick, INTERVAL_MS)
    return () => clearInterval(id)
  }, []) // intentionally empty — pausedRef handles the pause gate

  const togglePause = useCallback(() => setIsPaused((v) => !v), [])

  return { logs, newIds, isPaused, togglePause }
}
