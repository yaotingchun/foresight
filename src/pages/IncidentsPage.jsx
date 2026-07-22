import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertOctagon, Zap } from 'lucide-react'
import { useSimulation } from '../context/SimulationContext'
import { deriveIncidentStatus } from '../data/simulationEngine'
import IncidentCard from '../components/incidents/IncidentCard'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'detected', label: 'Detected' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'mitigating', label: 'Mitigating' },
  { value: 'resolved', label: 'Resolved' },
]

export default function IncidentsPage() {
  const { incidents, openDrawer } = useSimulation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return incidents
    return incidents.filter((inc) => deriveIncidentStatus(inc.stages, Date.now(), inc.frozenStatus) === filter)
  }, [incidents, filter])

  const activeCount = useMemo(
    () => incidents.filter((inc) => deriveIncidentStatus(inc.stages, Date.now(), inc.frozenStatus) !== 'resolved').length,
    [incidents]
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-6 px-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <AlertOctagon size={20} className="text-status-red" />
              <h1 className="text-xl font-semibold tracking-tight text-ink">Incidents</h1>
              {activeCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {activeCount} active
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink-soft">
              Every simulated event, with root cause, dependency and impact analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={openDrawer}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5
                       text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
          >
            <Zap size={13} />
            Simulate Event
          </button>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-card p-1 shadow-card w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors
                ${filter === f.value ? 'bg-indigo-500 text-white' : 'text-ink-soft hover:bg-muted'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-card/50 py-16 text-center">
            <AlertOctagon size={32} className="text-ink-faint opacity-40" />
            <p className="text-sm font-medium text-ink-soft">
              {incidents.length === 0 ? 'No incidents yet' : 'No incidents match this filter'}
            </p>
            <p className="max-w-xs text-xs text-ink-faint">
              Run a scenario from the Simulate Event drawer to see it show up here with a full breakdown.
            </p>
            {incidents.length === 0 && (
              <button
                type="button"
                onClick={openDrawer}
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5
                           text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <Zap size={13} />
                Simulate an event
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onClick={() => navigate(`/incidents/${incident.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
