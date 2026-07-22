import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Clock, Search, ShieldAlert, GitBranch, Activity, Wrench,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Loader2, Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useSimulation } from '../context/SimulationContext'
import {
  deriveIncidentStatus, chainNodesFor, rootDependencies,
  aggregatedAnalysis, remediationPlan,
} from '../data/simulationEngine'
import IncidentStatusBadge from '../components/incidents/IncidentStatusBadge'
import DependencyChain from '../components/incidents/DependencyChain'
import { NODE_BY_ID } from '../data/serviceMapData'
import { api } from '../lib/api'

const MarkdownComponents = {
  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1.5 mb-2 last:mb-0" {...props} />,
  li: ({node, ...props}) => <li className="text-ink-soft marker:text-indigo-400" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-ink" {...props} />,
};

function fmtClock(ms) {
  return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function fmtDuration(ms) {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
function fmtMoney(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-line bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={15} className="text-indigo-600" />
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">{title}</h2>
      </div>
      {children}
    </section>
  )
}

const TIMELINE_STEPS = [
  { key: 'detected', label: 'Detected', icon: AlertTriangle },
  { key: 'investigating', label: 'Investigating', icon: Search },
  { key: 'mitigating', label: 'Mitigating', icon: Wrench },
  { key: 'resolved', label: 'Resolved', icon: CheckCircle2 },
]

function Timeline({ incident, status }) {
  const root = incident.stages[0]
  const holdMid = root.rampEnd + (root.holdEnd - root.rampEnd) / 2
  const overallEnd = Math.max(...incident.stages.map((s) => s.endAt))
  const stepTimes = {
    detected: root.stageStart,
    investigating: root.rampEnd,
    mitigating: holdMid,
    resolved: overallEnd,
  }
  const order = ['detected', 'investigating', 'mitigating', 'resolved']
  const reachedIdx = order.indexOf(status)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const reached = i <= reachedIdx
          const Icon = step.icon
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    reached ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-line bg-muted text-ink-faint'
                  }`}
                >
                  <Icon size={14} />
                </span>
                <span className={`text-[11px] font-semibold ${reached ? 'text-ink' : 'text-ink-faint'}`}>{step.label}</span>
                <span className="text-[10px] text-ink-faint">{fmtClock(stepTimes[step.key])}</span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`mx-1 h-0.5 flex-1 rounded-full ${i < reachedIdx ? 'bg-indigo-400' : 'bg-line'}`} />
              )}
            </div>
          )
        })}
      </div>

      {incident.stages.length > 1 && (
        <div className="rounded-lg bg-muted/60 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Cascade sequence</p>
          <div className="flex flex-col gap-1.5">
            {incident.stages.map((stage) => (
              <div key={`${stage.component}-${stage.stageStart}`} className="flex items-center gap-2 text-[12px]">
                <span className="w-16 shrink-0 font-mono text-ink-faint">
                  +{Math.round((stage.stageStart - incident.runStart) / 1000)}s
                </span>
                <span className="font-mono font-medium text-ink">{NODE_BY_ID[stage.component]?.label ?? stage.component}</span>
                <span className="text-ink-faint">·</span>
                <span className="text-ink-soft">{stage.faultType.replace(/_/g, ' ')}</span>
                <span
                  className={`ml-auto rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    stage.severity === 'critical' ? 'bg-red-100 text-red-600'
                    : stage.severity === 'high' ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  {stage.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricsTable({ incident }) {
  const components = [...new Set(incident.stages.map((s) => s.component))]
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
            <th className="pb-2 font-semibold">Component</th>
            <th className="pb-2 font-semibold">Latency</th>
            <th className="pb-2 font-semibold">Error rate</th>
            <th className="pb-2 font-semibold">Throughput</th>
          </tr>
        </thead>
        <tbody>
          {components.map((id) => {
            const before = incident.beforeMetrics[id]
            const peak = incident.peakMetrics[id]
            if (!before || !peak) return null
            return (
              <tr key={id} className="border-b border-line last:border-0">
                <td className="py-2 font-mono font-medium text-ink">{NODE_BY_ID[id]?.label ?? id}</td>
                <td className="py-2">
                  <span className="text-ink-faint">{before.latency}ms</span>
                  <ArrowUp size={11} className="mx-1 inline text-red-500" />
                  <span className="font-semibold text-red-600">{peak.latency}ms</span>
                </td>
                <td className="py-2">
                  <span className="text-ink-faint">{before.errorRate}%</span>
                  <ArrowUp size={11} className="mx-1 inline text-red-500" />
                  <span className="font-semibold text-red-600">{peak.errorRate}%</span>
                </td>
                <td className="py-2">
                  <span className="text-ink-faint">{before.rps} rps</span>
                  <ArrowDown size={11} className="mx-1 inline text-amber-500" />
                  <span className="font-semibold text-amber-600">{peak.rps} rps</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function IncidentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { incidents } = useSimulation()
  const [, setTock] = useState(0)

  const incident = useMemo(() => incidents.find((inc) => inc.id === id), [incidents, id])
  const isLive = incident && !incident.frozenStatus
  const isAnalyzing = incident?.isAnalyzing
  const aiAnalysis = incident?.aiAnalysis

  useEffect(() => {
    if (!isLive) return undefined
    const t = setInterval(() => setTock((v) => v + 1), 1000)
    return () => clearInterval(t)
  }, [isLive])

  if (!incident) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-sm text-ink-faint">Incident not found — it may have been cleared.</p>
        <button
          type="button"
          onClick={() => navigate('/incidents')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          Back to Incidents
        </button>
      </div>
    )
  }

  if (isAnalyzing) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[14px] font-bold text-ink">AI Agent is analyzing the incident...</p>
          <p className="text-[12px] text-ink-soft">Reviewing topology, metrics, and drafting a remediation plan.</p>
        </div>
      </div>
    )
  }

  const status = deriveIncidentStatus(incident.stages, Date.now(), incident.frozenStatus)
  const nodes = chainNodesFor(incident)
  const deps = rootDependencies(incident)
  const { flaws, preventiveMeasures } = aggregatedAnalysis(incident)
  const plan = remediationPlan(incident)
  const rootStage = incident.stages[0]
  const rootAnalysis = plan[0]
  const duration = (incident.frozenStatus ? incident.endAt : Date.now()) - incident.runStart
  const resolved = status === 'resolved'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[900px] flex-col gap-4 pb-8">
        <button
          type="button"
          onClick={() => navigate('/incidents')}
          className="flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={13} />
          Back to Incidents
        </button>

        {/* Header */}
        <div className="rounded-xl border border-line bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-ink">{incident.title}</h1>
                <IncidentStatusBadge status={status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{incident.summary}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-ink-faint">
            <span className="flex items-center gap-1.5"><Clock size={12} /> Started {fmtClock(incident.runStart)}</span>
            <span>Duration {fmtDuration(duration)}</span>
            {incident.stoppedEarly && <span className="font-semibold text-amber-600">Manually stopped</span>}
          </div>
        </div>

        <Section icon={Activity} title="Summary & Timeline">
          <Timeline incident={incident} status={status} />
        </Section>

        <Section icon={ShieldAlert} title={<span className="flex items-center gap-2">Root Cause Analysis {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
          {isAnalyzing ? (
             <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is analyzing root cause...</div>
          ) : aiAnalysis ? (
             <div className="text-[13px] leading-relaxed text-ink-soft p-3 rounded-lg bg-indigo-50/50 border border-indigo-100/50 shadow-sm">
               <ReactMarkdown components={MarkdownComponents}>{aiAnalysis.rootCause}</ReactMarkdown>
             </div>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">{NODE_BY_ID[rootStage.component]?.label ?? rootStage.component}</span>
              {' — '}{rootStage.faultType.replace(/_/g, ' ')} ({rootStage.severity}). {rootAnalysis?.rootCause}
            </p>
          )}
        </Section>

        <Section icon={GitBranch} title="Dependency Analysis">
          <DependencyChain nodes={nodes} />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Upstream callers ({deps.upstream.length})
              </p>
              {deps.upstream.length ? (
                <ul className="flex flex-col gap-1">
                  {deps.upstream.map((label) => (
                    <li key={label} className="text-[12.5px] text-ink-soft">{label}</li>
                  ))}
                </ul>
              ) : <p className="text-[12px] text-ink-faint">No upstream callers</p>}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                Downstream dependencies ({deps.downstream.length})
              </p>
              {deps.downstream.length ? (
                <ul className="flex flex-col gap-1">
                  {deps.downstream.map((label) => (
                    <li key={label} className="text-[12.5px] text-ink-soft">{label}</li>
                  ))}
                </ul>
              ) : <p className="text-[12px] text-ink-faint">No downstream dependencies</p>}
            </div>
          </div>
        </Section>

        <Section icon={TrendingUp} title={<span className="flex items-center gap-2">Impact Analysis {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
          {isAnalyzing ? (
             <div className="flex items-center gap-2 text-sm text-ink-soft mb-3"><Loader2 size={16} className="animate-spin" /> AI is calculating impact...</div>
          ) : aiAnalysis ? (
             <div className="text-[13px] leading-relaxed text-ink-soft mb-3 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100/50 shadow-sm">
               <ReactMarkdown components={MarkdownComponents}>{aiAnalysis.impact}</ReactMarkdown>
             </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Components affected', value: aiAnalysis ? aiAnalysis.affectedServices.length : nodes.length },
              { label: 'Error logs generated', value: incident.impact.logErrors },
              { label: 'Tx flagged / blocked', value: `${incident.impact.txFlagged} / ${incident.impact.txBlocked}` },
              { label: 'Value at risk', value: fmtMoney(incident.impact.valueAtRisk) },
            ].map((tile) => (
              <div key={tile.label} className="rounded-lg bg-muted/60 p-3">
                <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">{tile.label}</p>
                <p className="mt-1 text-lg font-bold text-ink">{tile.value}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon={TrendingDown} title="Metrics Before & After">
          <MetricsTable incident={incident} />
        </Section>

        <Section icon={Wrench} title={<span className="flex items-center gap-2">Remediation Plan {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
          {isAnalyzing ? (
             <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is drafting remediation plan...</div>
          ) : aiAnalysis ? (
             <div className="flex flex-col gap-2.5">
              {aiAnalysis.remediationPlan.map((p, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 rounded-lg bg-gradient-to-r from-indigo-50/80 to-transparent p-3 border-l-2 border-indigo-500 shadow-sm transition-all hover:translate-x-0.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    <div>
                      <p className="text-[12.5px] font-semibold text-ink mb-0.5">{p.step}</p>
                      <div className="text-[12px] text-ink-soft">
                        <ReactMarkdown components={MarkdownComponents}>{p.description}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  {p.type === 'requires_approval' ? (
                     <button className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all active:scale-95 shrink-0">Approve</button>
                  ) : (
                     <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shrink-0 border border-emerald-200">Automated</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {plan.map((p) => (
                <div key={p.component} className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-3">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-[12.5px] font-semibold text-ink">{p.label}</p>
                    <p className="text-[12px] text-ink-soft">{p.remediation}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section icon={CheckCircle2} title="Effect of Remediation">
          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 p-3">
            <CheckCircle2 size={15} className={`mt-0.5 shrink-0 ${resolved ? 'text-emerald-600' : 'text-ink-faint'}`} />
            <div>
              <p className="text-[12.5px] font-semibold text-ink">
                {resolved ? 'Incident resolved' : 'Remediation in progress'}
              </p>
              <p className="text-[12px] text-ink-soft">
                {resolved
                  ? `Severity returned to baseline across all ${nodes.length} affected component(s) after ${fmtDuration(duration)}${incident.stoppedEarly ? ' (stopped manually before full auto-resolution)' : ''}.`
                  : `Mitigation is currently applying — severity is expected to return to baseline within ${fmtDuration(Math.max(0, incident.endAt - Date.now()))}.`}
              </p>
            </div>
          </div>
        </Section>

        <Section icon={AlertTriangle} title={<span className="flex items-center gap-2">Flaws Detected {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
          {isAnalyzing ? (
             <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is identifying flaws...</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(aiAnalysis ? aiAnalysis.flawsDetected : flaws).map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  <ReactMarkdown components={{ p: 'span' }}>{f}</ReactMarkdown>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={ShieldAlert} title={<span className="flex items-center gap-2">Preventive Measures {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
          {isAnalyzing ? (
             <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is formulating preventive measures...</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(aiAnalysis ? aiAnalysis.preventiveMeasures : preventiveMeasures).map((p) => (
                <li key={p} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  <ReactMarkdown components={{ p: 'span' }}>{p}</ReactMarkdown>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
