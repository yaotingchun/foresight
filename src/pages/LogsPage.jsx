import { useState, useMemo } from 'react'
import { Activity, X } from 'lucide-react'
import { SERVICES } from '../data/logsData'
import { useLogsStream }  from '../hooks/useLogsStream'
import LogChart   from '../components/logs/LogChart'
import LogFilters from '../components/logs/LogFilters'
import LogTable   from '../components/logs/LogTable'

const STATUS_OPTIONS = ['error', 'warn', 'info']

export default function LogsPage() {
  // ── Live stream ───────────────────────────────────────────────────────────
  const { logs: streamLogs, newIds, isPaused, togglePause } = useLogsStream()

  // ── Filter state ──────────────────────────────────────────────────────────
  const [rangeMs,             setRangeMs]             = useState(60 * 60 * 1000)
  const [selectedServices,    setSelectedServices]    = useState([...SERVICES])
  const [selectedStatuses,    setSelectedStatuses]    = useState([...STATUS_OPTIONS])
  const [search,              setSearch]              = useState('')
  const [selectedBucketIndex, setSelectedBucketIndex] = useState(null)
  const [selectedBucketData, setSelectedBucketData]   = useState(null)

  function toggleService(svc) {
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc]
    )
  }

  function toggleStatus(st) {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    )
  }

  function handleSelectBucket(idx, bucketData) {
    if (idx === null || idx === selectedBucketIndex) {
      setSelectedBucketIndex(null)
      setSelectedBucketData(null)
    } else {
      setSelectedBucketIndex(idx)
      setSelectedBucketData(bucketData)
    }
  }

  // Reset bucket selection when time range filter changes
  function handleRangeChange(newRange) {
    setRangeMs(newRange)
    setSelectedBucketIndex(null)
    setSelectedBucketData(null)
  }

  // ── Reference time quantized to 10-second steps for calm, steady updates ──────
  const referenceTime = useMemo(() => {
    if (streamLogs && streamLogs.length > 0) {
      return Math.floor(streamLogs[0].timestamp / 10000) * 10000
    }
    return Math.floor(Date.now() / 10000) * 10000
  }, [streamLogs])

  // ── Filtered logs (matching search, service, status within time range) ────
  const chartLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cutoff = referenceTime - rangeMs
    return streamLogs.filter((l) => {
      if (l.timestamp < cutoff) return false
      if (!selectedServices.includes(l.service)) return false
      if (!selectedStatuses.includes(l.status))  return false
      if (q && !l.message.toLowerCase().includes(q) &&
               !l.service.toLowerCase().includes(q) &&
               !l.traceId.includes(q))            return false
      return true
    })
  }, [streamLogs, rangeMs, selectedServices, selectedStatuses, search, referenceTime])

  // ── Selected bucket time window ───────────────────────────────────────────
  const bucketWindow = useMemo(() => {
    if (selectedBucketIndex === null || !selectedBucketData) return null
    const startDate = new Date(selectedBucketData.t)
    const timeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    return {
      start: selectedBucketData.t,
      end: selectedBucketData.tEnd,
      label: timeStr
    }
  }, [selectedBucketIndex, selectedBucketData])

  // ── Table filtered logs ───────────────────────────────────────────────────
  const tableFiltered = useMemo(() => {
    if (!bucketWindow) return chartLogs
    return chartLogs.filter((l) => l.timestamp >= bucketWindow.start && l.timestamp < bucketWindow.end)
  }, [chartLogs, bucketWindow])

  return (
    <div className="flex flex-col gap-3 pb-6">

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <LogFilters
          rangeMs={rangeMs}
          onRangeChange={handleRangeChange}
          selectedServices={selectedServices}
          onToggleService={toggleService}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          search={search}
          onSearchChange={setSearch}
          totalVisible={tableFiltered.length}
          totalCount={chartLogs.length}
          isPaused={isPaused}
          onTogglePause={togglePause}
        />
      </div>

      {/* ── Log volume chart ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 pt-2.5 pb-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-ink-faint" />
            <span className="text-xs font-semibold text-ink-soft">Log Volume</span>
            <span className="text-[11px] text-ink-faint">· stacked by severity</span>
          </div>
          {bucketWindow && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-tint/30 border border-brand/20 text-[11px] font-mono text-brand">
                <span>Time bucket: {bucketWindow.label}</span>
                <button
                  onClick={() => {
                    setSelectedBucketIndex(null)
                    setSelectedBucketData(null)
                  }}
                  className="p-0.5 hover:bg-brand-tint/30 rounded text-brand transition-colors ml-0.5"
                  title="Clear time bucket filter"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
        </div>
        <LogChart
          logs={chartLogs}
          rangeMs={rangeMs}
          selectedBucketIndex={selectedBucketIndex}
          onSelectBucket={handleSelectBucket}
          referenceTime={referenceTime}
        />
      </div>

      {/* ── Log table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <LogTable logs={tableFiltered} newIds={newIds} />
      </div>
    </div>
  )
}
