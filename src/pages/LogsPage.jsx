import { useState, useMemo } from 'react'
import { Activity, Pause, Play } from 'lucide-react'
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
  const [rangeMs,          setRangeMs]          = useState(60 * 60 * 1000)
  const [selectedServices, setSelectedServices] = useState([...SERVICES])
  const [selectedStatuses, setSelectedStatuses] = useState([...STATUS_OPTIONS])
  const [search,           setSearch]           = useState('')

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

  // ── Time-range filter (used by chart) ─────────────────────────────────────
  const rangeFiltered = useMemo(() => {
    const cutoff = Date.now() - rangeMs
    return streamLogs.filter((l) => l.timestamp >= cutoff)
  }, [streamLogs, rangeMs])

  // ── Full filter for table ─────────────────────────────────────────────────
  const tableFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rangeFiltered.filter((l) => {
      if (!selectedServices.includes(l.service)) return false
      if (!selectedStatuses.includes(l.status))  return false
      if (q && !l.message.toLowerCase().includes(q) &&
               !l.service.toLowerCase().includes(q) &&
               !l.traceId.includes(q))            return false
      return true
    })
  }, [rangeFiltered, selectedServices, selectedStatuses, search])

  return (
    <div className="flex flex-col gap-3 pb-6">

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="bg-card border border-line rounded-xl px-3 py-2 shadow-card">
        <LogFilters
          rangeMs={rangeMs}
          onRangeChange={setRangeMs}
          selectedServices={selectedServices}
          onToggleService={toggleService}
          selectedStatuses={selectedStatuses}
          onToggleStatus={toggleStatus}
          search={search}
          onSearchChange={setSearch}
          totalVisible={tableFiltered.length}
          totalCount={rangeFiltered.length}
          isPaused={isPaused}
          onTogglePause={togglePause}
        />
      </div>

      {/* ── Log volume chart ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-line rounded-xl px-4 pt-3 pb-2 shadow-card">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={13} className="text-ink-faint" />
          <span className="text-xs font-semibold text-ink-soft">Log Volume</span>
          <span className="text-[11px] text-ink-faint">· stacked by severity</span>
        </div>
        <LogChart logs={rangeFiltered} rangeMs={rangeMs} />
      </div>

      {/* ── Log table ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-line rounded-xl shadow-card overflow-hidden">
        <LogTable logs={tableFiltered} newIds={newIds} />
      </div>
    </div>
  )
}
