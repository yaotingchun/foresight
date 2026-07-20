import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, Check, SlidersHorizontal, Pause, Play } from 'lucide-react'
import { SERVICES } from '../../data/logsData'

const TIME_RANGES = [
  { label: '15m',   ms: 15 * 60 * 1000 },
  { label: '1h',    ms: 60 * 60 * 1000 },
  { label: '1d',    ms: 24 * 60 * 60 * 1000 },
]

const STATUS_OPTIONS = [
  { value: 'error', label: 'Error',   dot: 'bg-red-400'   },
  { value: 'warn',  label: 'Warning', dot: 'bg-amber-400' },
  { value: 'info',  label: 'Info',    dot: 'bg-blue-400'  },
]

function MultiSelectDropdown({ label, options, selected, onToggle, colorDot }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered    = options.filter((o) =>
    (o.label ?? o.value).toLowerCase().includes(query.toLowerCase())
  )
  const activeCount = selected.length < options.length ? selected.length : 0

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-all
          ${open
            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
            : 'border-line bg-card text-ink-soft hover:border-ink-faint hover:text-ink'
          }`}
      >
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-52 bg-card border border-line rounded-xl shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-line">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg">
              <Search size={11} className="text-ink-faint shrink-0" />
              <input
                className="flex-1 bg-transparent text-xs text-ink outline-none placeholder-ink-faint"
                placeholder={`Search ${label.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto py-1">
            {filtered.map((opt) => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  onClick={() => onToggle(opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors
                    ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-ink hover:bg-muted'}`}
                >
                  {colorDot && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.dot ?? 'bg-ink-faint'}`} />
                  )}
                  <span className="flex-1 text-left truncate">{opt.label ?? opt.value}</span>
                  {isSelected && <Check size={11} className="text-indigo-500 shrink-0" />}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-ink-faint text-center">No matches</p>
            )}
          </div>

          <div className="flex border-t border-line divide-x divide-line">
            <button
              onClick={() => options.forEach((o) => { if (!selected.includes(o.value)) onToggle(o.value) })}
              className="flex-1 py-1 text-xs text-ink-soft hover:text-ink hover:bg-muted transition-colors"
            >
              All
            </button>
            <button
              onClick={() => selected.forEach((v) => onToggle(v))}
              className="flex-1 py-1 text-xs text-ink-soft hover:text-ink hover:bg-muted transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LogFilters({
  rangeMs, onRangeChange,
  selectedServices, onToggleService,
  selectedStatuses, onToggleStatus,
  search, onSearchChange,
  totalVisible, totalCount,
  isPaused, onTogglePause,
}) {
  const serviceOptions = SERVICES.map((s) => ({ value: s, label: s }))

  const hasActiveFilters =
    selectedServices.length < SERVICES.length ||
    selectedStatuses.length < STATUS_OPTIONS.length ||
    search.trim()

  function clearAll() {
    SERVICES.forEach((s) => { if (!selectedServices.includes(s)) onToggleService(s) })
    STATUS_OPTIONS.forEach((s) => { if (!selectedStatuses.includes(s.value)) onToggleStatus(s.value) })
    onSearchChange('')
  }

  return (
    <div className="flex items-center gap-2">

      {/* Time range pill tabs */}
      <div className="flex items-center bg-muted rounded-lg p-0.5 border border-line shrink-0">
        {TIME_RANGES.map((r) => (
          <button
            key={r.ms}
            onClick={() => onRangeChange(r.ms)}
            className={`px-3 h-7 rounded-md text-xs font-semibold transition-all
              ${rangeMs === r.ms
                ? 'bg-card text-ink shadow-card border border-line'
                : 'text-ink-soft hover:text-ink'
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Live / Pause toggle */}
      <button
        onClick={onTogglePause}
        className={`flex items-center gap-1.5 px-2 h-8 rounded-lg border shrink-0 text-xs font-medium transition-all
          ${isPaused
            ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
            : 'border-line bg-card text-ink-soft hover:border-ink-faint hover:text-ink'
          }`}
      >
        {isPaused ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <Play  size={11} />
            <span>Paused</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <Pause size={11} />
            <span>Live</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-line shrink-0" />

      {/* Filter dropdowns */}
      <span className="flex items-center gap-1 text-xs font-medium text-ink-faint shrink-0">
        <SlidersHorizontal size={12} />
        Filters
      </span>

      <MultiSelectDropdown
        label="Service"
        options={serviceOptions}
        selected={selectedServices}
        onToggle={onToggleService}
        colorDot={false}
      />

      <MultiSelectDropdown
        label="Status"
        options={STATUS_OPTIONS}
        selected={selectedStatuses}
        onToggle={onToggleStatus}
        colorDot
      />

      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 h-8 px-2 rounded-lg text-xs text-ink-soft hover:text-red-500 hover:bg-red-50 border border-line hover:border-red-200 transition-all shrink-0"
        >
          <X size={11} /> Clear
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-5 bg-line shrink-0" />

      {/* Search — fills remaining space */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 h-8 px-2.5 bg-card border border-line rounded-lg hover:border-ink-faint focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
        <Search size={13} className="text-ink-faint shrink-0" />
        <input
          className="flex-1 bg-transparent text-xs text-ink outline-none placeholder-ink-faint min-w-0"
          placeholder="Search messages, trace IDs, services…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-ink-faint hover:text-ink shrink-0">
            <X size={11} />
          </button>
        )}
      </div>

      {/* Event count */}
      <span className="text-xs text-ink-faint whitespace-nowrap shrink-0">
        <span className="font-semibold text-ink">{totalVisible.toLocaleString()}</span>
        <span className="text-ink-faint"> / {totalCount.toLocaleString()}</span>
      </span>
    </div>
  )
}
