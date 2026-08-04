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
    return incidents.filter((inc) => deriveIncidentStatus(inc.stages, Date.now(), inc.frozenStatus, inc.hasApprovalSteps || inc.isAnalyzing) === filter)
  }, [incidents, filter])

  const activeCount = useMemo(
    () => incidents.filter((inc) => deriveIncidentStatus(inc.stages, Date.now(), inc.frozenStatus, inc.hasApprovalSteps || inc.isAnalyzing) !== 'resolved').length,
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
            className="flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5
                       text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-black hover:border-black cursor-pointer"
          >
            <Zap size={13} />
            Simulate Event
          </button>
        </div>

        <div className="inline-flex items-center gap-1 rounded-xl bg-[#e6f4ea] border border-brand-tint p-1 w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200
                ${filter === f.value ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-card py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
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
                className="mt-2 flex items-center gap-1.5 rounded-lg border border-brand-hover/30 bg-brand-tint px-3 py-1.5
                           text-xs font-semibold text-brand transition-colors hover:bg-brand-tint/80"
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
