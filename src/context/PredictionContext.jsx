/**
 * PredictionContext
 *
 * Persists the Prediction page state (selected component, time window,
 * fetched chart data and AI summaries) so navigating to another tab
 * and back doesn't trigger a full re-fetch.
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const BASE = '/api'
const METRICS = ['cpu_pct', 'memory_pct', 'latency_ms', 'error_rate']

const PredictionContext = createContext(null)

export function PredictionProvider({ children }) {
  // ── Selector state (persisted) ──────────────────────────────────────────
  const [component, setComponent] = useState('api-gateway')
  const [hours, setHours]         = useState(24)
  const [forecastMinutes, setForecastMinutes] = useState(30)

  // ── Fetched data (persisted across tab switches) ────────────────────────
  const [charts, setCharts]               = useState({})
  const [summary, setSummary]             = useState(null)
  const [systemAnalysis, setSystemAnalysis] = useState(null)
  const [trafficData, setTrafficData]     = useState(null)
  const [bottleneckData, setBottleneckData] = useState(null)

  // ── Loading flags ────────────────────────────────────────────────────────
  const [chartsLoading, setChartsLoading]     = useState(false)
  const [summaryLoading, setSummaryLoading]   = useState(false)
  const [systemLoading, setSystemLoading]     = useState(false)
  const [trafficLoading, setTrafficLoading]   = useState(false)
  const [bottleneckLoading, setBottleneckLoading] = useState(false)
  const [error, setError]                     = useState(null)

  // Track what we've already fetched to avoid duplicate requests
  const chartsKey     = useRef(null) // `${component}-${hours}-${forecastMinutes}`
  const summaryKey    = useRef(null) // component
  const systemKey     = useRef(null) // hours
  const trafficKey    = useRef(null) // `${component}-${hours}`
  const bottleneckKey = useRef(null) // hours

  const fetchCharts = useCallback(async (comp, h, fm, force = false) => {
    const key = `${comp}-${h}-${fm}`
    if (!force && chartsKey.current === key) return
    chartsKey.current = key
    setChartsLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        METRICS.map(metric =>
          fetch(`${BASE}/forecast/metrics?component=${encodeURIComponent(comp)}&metric=${metric}&hours=${h}&forecast_minutes=${fm}`)
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

  const fetchTraffic = useCallback(async (comp, h, force = false) => {
    const key = `${comp}-${h}`
    if (!force && trafficKey.current === key) return
    trafficKey.current = key
    setTrafficLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/traffic?component=${encodeURIComponent(comp)}&hours=${h}`)
      const data = await res.json()
      setTrafficData(data.error ? null : data)
    } catch {
      setTrafficData(null)
      trafficKey.current = null
    } finally {
      setTrafficLoading(false)
    }
  }, [])

  const fetchBottleneck = useCallback(async (h, force = false) => {
    if (!force && bottleneckKey.current === h) return
    bottleneckKey.current = h
    setBottleneckLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/bottleneck?hours=${h}`)
      const data = await res.json()
      setBottleneckData(data)
    } catch {
      setBottleneckData(null)
      bottleneckKey.current = null
    } finally {
      setBottleneckLoading(false)
    }
  }, [])

  // When component changes → refetch charts + summary + traffic
  useEffect(() => {
    setCharts({})
    setSummary(null)
    setTrafficData(null)
    chartsKey.current = null
    summaryKey.current = null
    trafficKey.current = null
    fetchCharts(component, hours, forecastMinutes)
    fetchSummary(component)
    fetchTraffic(component, hours)
  }, [component, fetchCharts, fetchSummary, fetchTraffic, hours, forecastMinutes])

  // When hours changes → refetch everything
  useEffect(() => {
    setCharts({})
    setSummary(null)
    setSystemAnalysis(null)
    setTrafficData(null)
    setBottleneckData(null)
    chartsKey.current = null
    summaryKey.current = null
    systemKey.current = null
    trafficKey.current = null
    bottleneckKey.current = null
    fetchCharts(component, hours, forecastMinutes)
    fetchSummary(component)
    fetchSystemAnalysis(hours)
    fetchTraffic(component, hours)
    fetchBottleneck(hours)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours])

  // When forecastMinutes changes → refetch charts
  useEffect(() => {
    setCharts({})
    chartsKey.current = null
    fetchCharts(component, hours, forecastMinutes)
  }, [forecastMinutes, fetchCharts, component, hours])

  // Initial load (only once)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetchSystemAnalysis(hours)
    fetchBottleneck(hours)
  }, [fetchSystemAnalysis, fetchBottleneck, hours])

  const refetch = useCallback(() => {
    chartsKey.current     = null
    summaryKey.current    = null
    systemKey.current     = null
    trafficKey.current    = null
    bottleneckKey.current = null
    fetchCharts(component, hours, forecastMinutes, true)
    fetchSummary(component, true)
    fetchSystemAnalysis(hours, true)
    fetchTraffic(component, hours, true)
    fetchBottleneck(hours, true)
  }, [component, hours, forecastMinutes, fetchCharts, fetchSummary, fetchSystemAnalysis, fetchTraffic, fetchBottleneck])

  const value = {
    component, setComponent,
    hours, setHours,
    forecastMinutes, setForecastMinutes,
    charts, summary, systemAnalysis, trafficData, bottleneckData,
    chartsLoading, summaryLoading, systemLoading, trafficLoading, bottleneckLoading,
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
