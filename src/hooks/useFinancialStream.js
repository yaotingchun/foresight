import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_TRANSACTIONS, generateRealtimeTx, ANOMALY_FEATURES } from '../data/financialData'
import { useSimulation } from '../context/SimulationContext'

const MAX_TXS     = 600
const INTERVAL_MS = 2200  // slightly slower than logs — finance is calmer

/** Turns a simulation tx-event into a full transaction row, flagged/blocked
 *  and correlated to the running scenario instead of a real historical incident. */
function buildSimulatedTx(evt) {
  const base = generateRealtimeTx()
  const status = evt.s > 0.6 ? 'blocked' : 'flagged'
  return {
    ...base,
    id: evt.key,
    amount: evt.amount,
    status,
    anomalyScore: Math.round(Math.min(0.98, 0.4 + evt.s * 0.55) * 100) / 100,
    dominantFeature: ANOMALY_FEATURES.find((f) => f.key === 'unusual_frequency'),
    infraCorrelation: {
      id: evt.scenario.id,
      service: evt.componentId,
      label: evt.scenario.title,
      severity: evt.s > 0.6 ? 'critical' : 'high',
      tStart: 0,
      tEnd: Math.round((Date.now() - evt.runStart) / 1000),
    },
    simulated: true,
    scenarioId: evt.scenario.id,
  }
}

/**
 * useFinancialStream
 *
 * Returns a live, ever-growing transaction array that prepends new entries
 * on every tick, simulating a real-time payment stream.
 *
 * Actions (approve/block/escalate) are applied locally so the action history
 * is immediately reflected in the UI.
 */
export function useFinancialStream() {
  const [txs,      setTxs]      = useState(() => [...ALL_TRANSACTIONS])
  const [newIds,   setNewIds]   = useState(() => new Set())
  const [isPaused, setIsPaused] = useState(false)

  const pausedRef = useRef(false)
  pausedRef.current = isPaused

  const { txEvents } = useSimulation()
  const lastTxEventsRef = useRef(null)

  // Simulated-scenario transactions feed into the same live stream.
  // (Guarded against React StrictMode's double-invoke, which would otherwise
  // reprocess the same tick's events twice and insert duplicate rows.)
  useEffect(() => {
    if (txEvents.length === 0 || pausedRef.current) return
    if (lastTxEventsRef.current === txEvents) return
    lastTxEventsRef.current = txEvents
    const batch = txEvents.map(buildSimulatedTx)
    const ids = new Set(batch.map((t) => t.id))
    setNewIds(ids)
    setTxs((prev) => [...batch, ...prev].slice(0, MAX_TXS))
    setTimeout(() => setNewIds(new Set()), 2400)
  }, [txEvents])

  useEffect(() => {
    const tick = () => {
      if (pausedRef.current) return

      // Burst 15% of the time (simulate flash sale / incident spike)
      const isBurst = Math.random() < 0.15
      const count   = isBurst
        ? Math.floor(Math.random() * 5) + 4  // 4-8
        : Math.floor(Math.random() * 3) + 1  // 1-3

      const batch = Array.from({ length: count }, () => generateRealtimeTx())
      const ids   = new Set(batch.map((t) => t.id))

      setNewIds(ids)
      setTxs((prev) => [...batch, ...prev].slice(0, MAX_TXS))

      setTimeout(() => setNewIds(new Set()), 2400)
    }

    const id = setInterval(tick, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const togglePause = useCallback(() => setIsPaused((v) => !v), [])

  /** Apply an action (approve | block | escalate) to a transaction by id */
  const applyAction = useCallback((txId, action, analyst = 'analyst@foresight') => {
    setTxs((prev) =>
      prev.map((tx) => {
        if (tx.id !== txId) return tx
        const entry = {
          action,
          timestamp: Date.now(),
          analyst,
        }
        const newStatus =
          action === 'approve'  ? 'normal'  :
          action === 'block'    ? 'blocked' :
          action === 'escalate' ? 'flagged' : tx.status

        return {
          ...tx,
          status:        newStatus,
          actionHistory: [...(tx.actionHistory ?? []), entry],
        }
      })
    )
  }, [])

  return { txs, newIds, isPaused, togglePause, applyAction }
}
