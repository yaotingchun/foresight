/**
 * PredictionContext
 *
 * Persists the Prediction page state (selected component, time window,
 * fetched chart data and AI summaries) so navigating to another tab
 * and back doesn't trigger a full re-fetch.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const BASE = '/api'
const METRICS = ['cpu_pct', 'memory_pct', 'latency_ms', 'error_rate', 'log_error_rate_per_min']

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
  // ── Selector state (persisted) ──────────────────────────────────────────
  const [component, setComponent] = useState('api-gateway')
  const [hours, setHours]         = useState(24)

  // ── Fetched data (persisted across tab switches) ────────────────────────
  const [charts, setCharts]               = useState({})
  const [summary, setSummary]             = useState(null)
  const [systemAnalysis, setSystemAnalysis] = useState(null)

  // ── Loading flags ────────────────────────────────────────────────────────
  const [chartsLoading, setChartsLoading]   = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [systemLoading, setSystemLoading]   = useState(false)
  const [error, setError]                   = useState(null)

  // Track what we've already fetched to avoid duplicate requests
  const chartsKey   = useRef(null) // `${component}-${hours}`
  const summaryKey  = useRef(null) // component
  const systemKey   = useRef(null) // hours

  const fetchCharts = useCallback(async (comp, h, force = false) => {
    const key = `${comp}-${h}`
    if (!force && chartsKey.current === key) return
    chartsKey.current = key
    setChartsLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        METRICS.map(metric =>
          fetch(`${BASE}/forecast/metrics?component=${encodeURIComponent(comp)}&metric=${metric}&hours=${h}`)
            .then(r => r.json())
        )
      )
      const mapped = {}
      results.forEach(r => { if (!r.error) mapped[r.metric] = r })
      setCharts(mapped)
    } catch (e) {
      setError(e.message)
      chartsKey.current = null  // allow retry
    } finally {
      setChartsLoading(false)
    }
  }, [])

  const fetchSummary = useCallback(async (comp, force = false) => {
    if (!force && summaryKey.current === comp) return
    summaryKey.current = comp
    setSummaryLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/summary?component=${encodeURIComponent(comp)}`)
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setSummary(null)
      summaryKey.current = null
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  const fetchSystemAnalysis = useCallback(async (h, force = false) => {
    if (!force && systemKey.current === h) return
    systemKey.current = h
    setSystemLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/system-analysis?hours=${h}`)
      const data = await res.json()
      setSystemAnalysis(data)
    } catch {
      setSystemAnalysis(null)
      systemKey.current = null
    } finally {
      setSystemLoading(false)
    }
  }, [])

  // When component changes → refetch charts + summary (but not system analysis)
  useEffect(() => {
    setCharts({})
    setSummary(null)
    chartsKey.current = null
    summaryKey.current = null
    fetchCharts(component, hours)
    fetchSummary(component)
  }, [component, fetchCharts, fetchSummary, hours])

  // When hours changes → refetch everything
  useEffect(() => {
    setCharts({})
    setSummary(null)
    setSystemAnalysis(null)
    chartsKey.current = null
    summaryKey.current = null
    systemKey.current = null
    fetchCharts(component, hours)
    fetchSummary(component)
    fetchSystemAnalysis(hours)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  // Initial load (only once — hours/component already have default values)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetchSystemAnalysis(hours)
  }, [fetchSystemAnalysis, hours])

  const refetch = useCallback(() => {
    chartsKey.current   = null
    summaryKey.current  = null
    systemKey.current   = null
    fetchCharts(component, hours, true)
    fetchSummary(component, true)
    fetchSystemAnalysis(hours, true)
  }, [component, hours, fetchCharts, fetchSummary, fetchSystemAnalysis])

  const value = {
    // selectors
    component, setComponent,
    hours, setHours,
    // data
    charts, summary, systemAnalysis,
    // loading
    chartsLoading, summaryLoading, systemLoading,
    error,
    refetch,
  }

  return (
    <PredictionContext.Provider value={value}>
      {children}
    </PredictionContext.Provider>
  )
}

export function usePrediction() {
  const ctx = useContext(PredictionContext)
  if (!ctx) throw new Error('usePrediction must be used inside <PredictionProvider>')
  return ctx
}
