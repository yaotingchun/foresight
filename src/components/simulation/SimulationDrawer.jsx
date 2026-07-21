import { useEffect, useState } from 'react'
import { X, Zap, Square, ArrowRight, PlayCircle } from 'lucide-react'
import { useSimulation } from '../../context/SimulationContext'
import { statusOf } from '../servicemap/statusColors'

function ChainPreview({ chain }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chain.map((id, i) => (
        <span key={id} className="flex items-center gap-1.5">
          <span className="rounded-md border border-line bg-muted px-1.5 py-0.5 text-[10.5px] font-mono text-ink-soft">
            {id}
          </span>
          {i < chain.length - 1 && <ArrowRight size={11} className="text-ink-faint shrink-0" />}
        </span>
      ))}
    </div>
  )
}

function ScenarioCard({ scenario, disabled, onRun }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3.5 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-snug text-ink">{scenario.title}</h3>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-ink-soft">{scenario.summary}</p>
      <div className="mt-2.5">
        <ChainPreview chain={scenario.chain} />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRun(scenario.id)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-indigo-200
                   bg-indigo-50 px-3 py-1.5 text-[12px] font-semibold text-indigo-700 transition-colors
                   hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-indigo-50"
      >
        <PlayCircle size={13} />
        Run simulation
      </button>
    </div>
  )
}

function stageStatusLabel(stage, now) {
  if (now < stage.stageStart) return 'pending'
  if (now < stage.rampEnd) return 'ramping'
  if (now < stage.holdEnd) return 'peak'
  if (now < stage.endAt) return 'resolving'
  return 'resolved'
}

function ActiveRunPanel({ activeRun, componentEffects, onStop }) {
  const [, setTock] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTock((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()
  const totalMs = activeRun.endAt - activeRun.runStart
  const elapsedMs = Math.min(totalMs, Math.max(0, now - activeRun.runStart))
  const pct = Math.round((elapsedMs / totalMs) * 100)

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${activeRun.status === 'resolved' ? 'bg-emerald-400' : 'bg-indigo-500 animate-pulse'}`} />
          <span className="text-[12px] font-bold uppercase tracking-wide text-indigo-700">
            {activeRun.status === 'resolved' ? 'Resolved' : 'Simulating'}
          </span>
        </div>
        <button
          type="button"
          onClick={onStop}
          className="flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px]
                     font-semibold text-red-600 hover:bg-red-50 transition-colors"
        >
          <Square size={10} />
          Stop
        </button>
      </div>

      <h3 className="mt-2 text-[13px] font-semibold text-ink">{activeRun.scenario.title}</h3>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        {activeRun.stages.map((stage) => {
          const eff = componentEffects[stage.component]
          const health = eff?.health ?? 'healthy'
          const status = statusOf(health)
          const label = stageStatusLabel(stage, now)
          return (
            <div key={`${stage.component}-${stage.stageStart}`} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="font-mono font-medium text-ink-soft">{stage.component}</span>
              <span className="text-ink-faint">·</span>
              <span className="capitalize text-ink-faint">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Global right-side drawer for triggering "what-if" incident scenarios. */
export default function SimulationDrawer() {
  const { scenarios, activeRun, componentEffects, isDrawerOpen, closeDrawer, startScenario, stopScenario } = useSimulation()

  return (
    <>
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={closeDrawer}
        />
      )}
      <div
        className="fixed right-0 top-0 z-50 h-full w-[360px] bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
        style={{
          transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
            <div className="flex items-center gap-2">
              <Zap size={17} className="text-indigo-600" />
              <h2 className="text-[15px] font-bold text-ink">Simulate Event</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={closeDrawer}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            <p className="mb-3 text-[11.5px] leading-snug text-ink-faint">
              Trigger a scripted incident to see it ripple across the Service Map, Logs and
              Financial Monitor in real time.
            </p>

            {activeRun && (
              <div className="mb-4">
                <ActiveRunPanel activeRun={activeRun} componentEffects={componentEffects} onStop={stopScenario} />
              </div>
            )}

            <div className="flex flex-col gap-3">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  disabled={Boolean(activeRun) && activeRun.status !== 'resolved'}
                  onRun={startScenario}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
