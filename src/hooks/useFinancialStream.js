import { useState, useEffect, useRef, useCallback } from 'react'
import { ALL_TRANSACTIONS, generateRealtimeTx, ANOMALY_FEATURES } from '../data/financialData'
import { useSimulation } from '../context/SimulationContext'
import { useDataPipeline } from './useDataPipeline'

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
  
  const { pushTransaction, onTxProcessed, isConnected } = useDataPipeline()

  // Listen for ML-processed transactions from the backend WebSocket
  useEffect(() => {
    const unsubscribe = onTxProcessed((mlData, originalTx) => {
      if (pausedRef.current) return
      
      const proba = mlData.fraud_probability || 0
      let status = 'normal'
      if (proba >= 0.75) status = 'blocked'
      else if (proba >= 0.45) status = 'flagged'

      // Use the ML explanation if available, otherwise fallback
      let mlExplanation = null
      let dominantFeature = null
      
      if (mlData.top_contributing_features && mlData.top_contributing_features.length > 0) {
        const topFeat = mlData.top_contributing_features[0]
        const featMap = {
          'amount': 'unusual_amount',
          'amount_z': 'unusual_amount',
          'seconds_since_last': 'velocity_spike',
          'dest_is_new': 'unusual_destination'
        }
        const key = featMap[topFeat.feature] || 'unusual_frequency'
        dominantFeature = ANOMALY_FEATURES.find(f => f.key === key) || ANOMALY_FEATURES[1]
        
        mlExplanation = `Model flagged based on ${topFeat.feature} (importance: ${Math.round(topFeat.importance*100)}%). Value was ${topFeat.value}.`
      }

      const finalTx = {
        ...originalTx,
        status: originalTx.simulated ? originalTx.status : status, // Preserve incident forced status if simulated
        anomalyScore: proba,
        dominantFeature: dominantFeature || originalTx.dominantFeature,
        mlExplanation: mlExplanation || originalTx.mlExplanation
      }

      setTxs(prev => {
        // Prevent duplicates
        if (prev.some(t => t.id === finalTx.id)) return prev
        return [finalTx, ...prev].slice(0, MAX_TXS)
      })
      setNewIds(new Set([finalTx.id]))
      setTimeout(() => setNewIds(new Set()), 2400)
    })
    return unsubscribe
  }, [onTxProcessed])

  // Simulated-scenario transactions feed into the same live stream.
  useEffect(() => {
    if (txEvents.length === 0 || pausedRef.current) return
    if (lastTxEventsRef.current === txEvents) return
    lastTxEventsRef.current = txEvents
    const batch = txEvents.map(buildSimulatedTx)
    
    // Route simulated incident transactions through ML pipeline
    batch.forEach(tx => {
      if (isConnected) {
        pushTransaction(tx)
      } else {
        // Fallback if WS not connected
        setTxs(prev => [tx, ...prev].slice(0, MAX_TXS))
        setNewIds(new Set([tx.id]))
      }
    })
  }, [txEvents, isConnected, pushTransaction])

  // Ambient traffic tick
  useEffect(() => {
    const tick = () => {
      if (pausedRef.current) return

      // Burst 15% of the time (simulate flash sale / incident spike)
      const isBurst = Math.random() < 0.15
      const count   = isBurst
        ? Math.floor(Math.random() * 5) + 4  // 4-8
        : Math.floor(Math.random() * 3) + 1  // 1-3

      const batch = Array.from({ length: count }, () => generateRealtimeTx())
      
      batch.forEach(tx => {
        if (isConnected) {
          pushTransaction(tx)
        } else {
          // Fallback if WS not connected
          setTxs(prev => [tx, ...prev].slice(0, MAX_TXS))
          setNewIds(new Set([tx.id]))
        }
      })
    }

    const id = setInterval(tick, INTERVAL_MS)
    return () => clearInterval(id)
  }, [isConnected, pushTransaction])

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
