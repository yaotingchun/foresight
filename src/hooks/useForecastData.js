import { useState, useEffect, useCallback } from 'react'

const BASE = '/api'
const METRICS = ['cpu_pct', 'memory_pct', 'latency_ms', 'error_rate', 'log_error_rate_per_min']

const METRIC_META = {
  cpu_pct:                { label: 'CPU', unit: '%',    color: '#6366f1', warnAt: 75, critAt: 90 },
  memory_pct:             { label: 'Memory', unit: '%', color: '#8b5cf6', warnAt: 80, critAt: 92 },
  latency_ms:             { label: 'Latency', unit: 'ms', color: '#06b6d4', warnAt: 200, critAt: 500 },
  error_rate:             { label: 'Error Rate', unit: '%', color: '#f59e0b', warnAt: 1, critAt: 5 },
  log_error_rate_per_min: { label: 'Log Errors/min', unit: '/min', color: '#ef4444', warnAt: 5, critAt: 15 },
}

export { METRIC_META, METRICS }

export function useForecastData(component, hours = 24) {
  const [charts, setCharts]             = useState({})
  const [summary, setSummary]           = useState(null)
  const [systemAnalysis, setSystemAnalysis] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [chartsLoading, setChartsLoading]   = useState(false)
  const [systemLoading, setSystemLoading]   = useState(false)
  const [error, setError]               = useState(null)

  const fetchCharts = useCallback(async () => {
    if (!component) return
    setChartsLoading(true)
    setError(null)
    try {
      const results = await Promise.all(
        METRICS.map(metric =>
          fetch(`${BASE}/forecast/metrics?component=${encodeURIComponent(component)}&metric=${metric}&hours=${hours}`)
            .then(r => r.json())
        )
      )
      const mapped = {}
      results.forEach(r => { if (!r.error) mapped[r.metric] = r })
      setCharts(mapped)
    } catch (e) {
      setError(e.message)
    } finally {
      setChartsLoading(false)
    }
  }, [component, hours])

  const fetchSummary = useCallback(async () => {
    if (!component) return
    setSummaryLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/summary?component=${encodeURIComponent(component)}`)
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [component])

  const fetchSystemAnalysis = useCallback(async () => {
    setSystemLoading(true)
    try {
      const res  = await fetch(`${BASE}/forecast/system-analysis?hours=${hours}`)
      const data = await res.json()
      setSystemAnalysis(data)
    } catch {
      setSystemAnalysis(null)
    } finally {
      setSystemLoading(false)
    }
  }, [hours])

  useEffect(() => {
    setCharts({})
    setSummary(null)
    fetchCharts()
    fetchSummary()
  }, [fetchCharts, fetchSummary])

  // System analysis only re-fetches when hours changes, not on every component switch
  useEffect(() => {
    setSystemAnalysis(null)
    fetchSystemAnalysis()
  }, [fetchSystemAnalysis])

  return {
    charts, summary, systemAnalysis,
    summaryLoading, chartsLoading, systemLoading,
    error,
    refetch: () => { fetchCharts(); fetchSummary(); fetchSystemAnalysis() }
  }
}
