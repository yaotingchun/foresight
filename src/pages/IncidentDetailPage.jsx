import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Clock, Search, ShieldAlert, GitBranch, Activity, Wrench,
  CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Loader2, Sparkles, X,
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

const ensureString = (val) => {
  if (typeof val === 'string') return val;
  if (val == null) return '';
  if (Array.isArray(val)) {
    return val.map(v => `- ${ensureString(v)}`).join('\n');
  }
  if (typeof val === 'object') {
    return Object.entries(val)
      .map(([k, v]) => {
        const valStr = ensureString(v);
        if (Array.isArray(v)) {
          return `**${k}**:\n${valStr}`;
        }
        return `**${k}**: ${valStr}`;
      })
      .join('\n\n');
  }
  try { return JSON.stringify(val); } catch { return String(val); }
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
    <section className="rounded-2xl border border-indigo-100/60 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2.5">
        <Icon size={16} className="text-indigo-500" />
        <h2 className="text-[12px] font-bold uppercase tracking-widest text-indigo-900/80">{title}</h2>
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
    <div className="flex flex-col gap-5 mt-2">
      <div className="flex items-center">
        {TIMELINE_STEPS.map((step, i) => {
          const reached = i <= reachedIdx
          const Icon = step.icon
          return (
            <div key={step.key} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    reached ? 'border-indigo-400 bg-indigo-50 text-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-indigo-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span className={`text-[11.5px] font-bold tracking-wide mt-1 ${reached ? 'text-indigo-950' : 'text-slate-400'}`}>{step.label}</span>
                <span className="text-[10.5px] text-slate-500 font-mono">{fmtClock(stepTimes[step.key])}</span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className={`mx-2 h-[3px] flex-1 rounded-full transition-all duration-500 ${i < reachedIdx ? 'bg-indigo-400' : 'bg-indigo-50'}`} />
              )}
            </div>
          )
        })}
      </div>

      {incident.stages.length > 1 && (
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100 p-4 shadow-sm">
          <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-slate-400">Cascade sequence</p>
          <div className="flex flex-col gap-2.5">
            {incident.stages.map((stage) => (
              <div key={`${stage.component}-${stage.stageStart}`} className="flex items-center gap-3 text-[13px]">
                <span className="w-16 shrink-0 font-mono text-slate-400 text-[12px]">
                  +{Math.round((stage.stageStart - incident.runStart) / 1000)}s
                </span>
                <div className="flex flex-1 items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                  <span className="font-bold text-indigo-950">{NODE_BY_ID[stage.component]?.label ?? stage.component}</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-slate-600">{stage.faultType.replace(/_/g, ' ')}</span>
                </div>
                <span
                  className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                    stage.severity === 'critical' ? 'bg-red-50 text-red-600 border border-red-100'
                    : stage.severity === 'high' ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
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
    <div className="overflow-x-auto rounded-xl border border-indigo-100/50 shadow-sm mt-2">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead>
          <tr className="bg-indigo-50/40 border-b border-indigo-100/50 text-[11px] uppercase tracking-widest text-indigo-900/60">
            <th className="py-3 px-4 font-bold">Component</th>
            <th className="py-3 px-4 font-bold">Latency</th>
            <th className="py-3 px-4 font-bold">Error rate</th>
            <th className="py-3 px-4 font-bold">Throughput</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {components.map((id) => {
            const before = incident.beforeMetrics[id]
            const peak = incident.peakMetrics[id]
            if (!before || !peak) return null
            return (
              <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-indigo-950">{NODE_BY_ID[id]?.label ?? id}</td>
                <td className="py-3.5 px-4">
                  <span className="text-slate-400">{before.latency}ms</span>
                  <ArrowUp size={12} className="mx-1.5 inline text-red-500" />
                  <span className="font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md text-[12px] border border-red-100">{peak.latency}ms</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-slate-400">{before.errorRate}%</span>
                  <ArrowUp size={12} className="mx-1.5 inline text-red-500" />
                  <span className="font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-md text-[12px] border border-red-100">{peak.errorRate}%</span>
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-slate-400">{before.rps} rps</span>
                  <ArrowDown size={12} className="mx-1.5 inline text-amber-500" />
                  <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-[12px] border border-amber-100">{peak.rps} rps</span>
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
    <div className="h-full overflow-y-auto animate-slide-fade">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 pb-8 px-4 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/incidents')}
          className="flex w-fit items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Incidents
        </button>

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/50 p-6 shadow-sm">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 text-indigo-500/5">
            <ShieldAlert size={160} />
          </div>
          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink">{incident.title}</h1>
                <IncidentStatusBadge status={status} />
              </div>
              <p className="mt-2 text-[14.5px] text-ink-soft max-w-3xl">{incident.summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-faint bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-indigo-100/50 shadow-sm">
              <span className="flex items-center gap-2"><Clock size={15} className="text-indigo-400" /> Started {fmtClock(incident.runStart)}</span>
              <span className="flex items-center gap-2"><Activity size={15} className="text-emerald-400" /> Duration {fmtDuration(duration)}</span>
              {incident.stoppedEarly && <span className="font-semibold text-amber-600 flex items-center gap-1.5"><AlertTriangle size={15}/> Manually stopped</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* AI Banner: Root Cause & Impact */}
          {(isAnalyzing || aiAnalysis) && (
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-md p-6 flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-400 to-indigo-600" />
              
              {isAnalyzing ? (
                 <div className="flex items-center gap-3 text-indigo-700 py-6 font-medium"><Loader2 size={22} className="animate-spin" /> AI Agent is actively analyzing the incident...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-indigo-100">
                  <div className="md:pr-8">
                    <h3 className="text-[12px] font-bold uppercase tracking-widest text-indigo-800/80 mb-3 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-500"/> Root Cause Analysis</h3>
                    <div className="text-[14px] leading-relaxed text-indigo-950/90 prose-p:mb-3">
                      <ReactMarkdown components={MarkdownComponents}>{ensureString(aiAnalysis.rootCause)}</ReactMarkdown>
                    </div>
                  </div>
                  <div className="pt-6 md:pt-0 md:pl-8">
                    <h3 className="text-[12px] font-bold uppercase tracking-widest text-indigo-800/80 mb-3 flex items-center gap-1.5"><Sparkles size={14} className="text-indigo-500"/> Impact Analysis</h3>
                    <div className="text-[14px] leading-relaxed text-indigo-950/90 prose-p:mb-3">
                      <ReactMarkdown components={MarkdownComponents}>{ensureString(aiAnalysis.impact)}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!aiAnalysis && !isAnalyzing && (
            <Section icon={ShieldAlert} title="Basic Root Cause (No AI Analysis)">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-ink">{NODE_BY_ID[rootStage.component]?.label ?? rootStage.component}</span>
                {' — '}{rootStage.faultType.replace(/_/g, ' ')} ({rootStage.severity}). {rootAnalysis?.rootCause}
              </p>
            </Section>
          )}

          {/* Impact Metrics Row */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Components affected', value: aiAnalysis ? aiAnalysis.affectedServices.length : nodes.length },
              { label: 'Error logs generated', value: incident.impact.logErrors },
              { label: 'Tx flagged / blocked', value: `${incident.impact.txFlagged} / ${incident.impact.txBlocked}` },
              { label: 'Value at risk', value: fmtMoney(incident.impact.valueAtRisk) },
            ].map((tile) => (
              <div key={tile.label} className="group rounded-xl border border-line bg-card p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint group-hover:text-indigo-500 transition-colors">{tile.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-ink tracking-tight">{tile.value}</p>
              </div>
            ))}
          </div>

          {/* State & Timeline Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section icon={Activity} title="Summary & Timeline">
              <Timeline incident={incident} status={status} />
            </Section>
            
            <Section icon={GitBranch} title="Dependency Analysis">
              <DependencyChain nodes={nodes} />
              <div className="mt-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 rounded-xl bg-gradient-to-br from-indigo-50/50 to-white p-4 border border-indigo-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><ArrowUp size={80} /></div>
                  <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-indigo-800/60 relative z-10">Upstream callers</p>
                  {deps.upstream.length ? (
                    <ul className="flex flex-col gap-2 relative z-10">
                      {deps.upstream.map((label) => (
                        <li key={label} className="text-[13px] text-indigo-950 font-semibold flex items-center gap-2.5">
                           <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.6)]" /> {label}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-indigo-400/50 italic relative z-10">None</p>}
                </div>
                <div className="flex-1 rounded-xl bg-gradient-to-br from-slate-50/80 to-white p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03]"><ArrowDown size={80} /></div>
                  <p className="mb-3 text-[10.5px] font-bold uppercase tracking-widest text-slate-400 relative z-10">Downstream deps</p>
                  {deps.downstream.length ? (
                    <ul className="flex flex-col gap-2 relative z-10">
                      {deps.downstream.map((label) => (
                        <li key={label} className="text-[13px] text-slate-600 font-medium flex items-center gap-2.5">
                           <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> {label}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-[13px] text-slate-400/60 italic relative z-10">None</p>}
                </div>
              </div>
            </Section>
          </div>

          {/* Full Width Metrics Table */}
          <Section icon={TrendingDown} title="Metrics Before & After">
            <MetricsTable incident={incident} />
          </Section>

          {/* Full Width Remediation Plan */}
          <Section icon={Wrench} title={<span className="flex items-center gap-2">Remediation Plan {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
            {isAnalyzing ? (
               <div className="flex items-center gap-2 text-sm text-ink-soft py-2"><Loader2 size={16} className="animate-spin" /> AI is drafting remediation plan...</div>
            ) : aiAnalysis ? (
               <div className="flex flex-col gap-4 mt-2">
                {aiAnalysis.remediationPlan.map((p, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row items-start justify-between gap-6 p-5 rounded-xl border border-line bg-card shadow-sm hover:shadow-md hover:border-indigo-100 transition-all">
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[13px] font-bold text-indigo-600 shadow-sm">{idx + 1}</span>
                      <div>
                        <p className="text-[15px] font-bold text-ink mb-2">{p.step}</p>
                        <div className="text-[14px] leading-relaxed text-ink-soft max-w-4xl prose-p:mb-2">
                          <ReactMarkdown components={MarkdownComponents}>{ensureString(p.description)}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    {p.type === 'requires_approval' ? (
                      <div className="flex gap-2.5 shrink-0 self-start md:self-center">
                         <button className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95">
                           <CheckCircle2 size={16} /> Approve
                         </button>
                         <button className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-bold text-ink-soft shadow-sm hover:bg-muted hover:text-ink transition-all active:scale-95">
                           <X size={16} /> Disapprove
                         </button>
                      </div>
                    ) : (
                       <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-600 shrink-0 border border-emerald-200 self-start md:self-center">Automated</span>
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

          {/* Flaws & Preventive Measures Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section icon={AlertTriangle} title={<span className="flex items-center gap-2">Flaws Detected {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
              {isAnalyzing ? (
                 <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is identifying flaws...</div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {(aiAnalysis ? aiAnalysis.flawsDetected : flaws).map((f) => (
                    <li key={f} className="flex items-start gap-3.5 text-[14px] leading-relaxed text-indigo-950/80 bg-red-50/50 p-4 rounded-xl border border-red-100/50">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <ReactMarkdown components={{ p: 'span' }}>{ensureString(f)}</ReactMarkdown>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section icon={ShieldAlert} title={<span className="flex items-center gap-2">Preventive Measures {aiAnalysis && <Sparkles size={14} className="text-indigo-500 animate-pulse" />}</span>}>
              {isAnalyzing ? (
                 <div className="flex items-center gap-2 text-sm text-ink-soft"><Loader2 size={16} className="animate-spin" /> AI is formulating preventive measures...</div>
              ) : (
                <ul className="flex flex-col gap-3">
                  {(aiAnalysis ? aiAnalysis.preventiveMeasures : preventiveMeasures).map((p) => (
                    <li key={p} className="flex items-start gap-3.5 text-[14px] leading-relaxed text-indigo-950/80 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <ReactMarkdown components={{ p: 'span' }}>{ensureString(p)}</ReactMarkdown>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Section icon={CheckCircle2} title="Effect of Remediation">
            <div className={`relative overflow-hidden flex items-start gap-4 rounded-xl border p-5 shadow-sm transition-all duration-300 ${resolved ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100/50' : 'border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/50'}`}>
              <div className="absolute -right-4 -top-4 opacity-10">
                 {resolved ? <CheckCircle2 size={100} className="text-emerald-500" /> : <Clock size={100} className="text-amber-500" />}
              </div>
              <div className={`mt-1 shrink-0 rounded-full p-2 ${resolved ? 'bg-emerald-200/50 text-emerald-600' : 'bg-amber-200/50 text-amber-600'}`}>
                 {resolved ? <CheckCircle2 size={24} /> : <Loader2 size={24} className="animate-spin" />}
              </div>
              <div className="relative z-10">
                <p className={`text-[15px] font-bold ${resolved ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {resolved ? 'Incident successfully resolved' : 'Remediation currently in progress'}
                </p>
                <p className={`text-[13.5px] leading-relaxed mt-1.5 max-w-3xl ${resolved ? 'text-emerald-800/80' : 'text-amber-800/80'}`}>
                  {resolved
                    ? `Severity returned to baseline across all ${nodes.length} affected component(s) after ${fmtDuration(duration)}${incident.stoppedEarly ? ' (stopped manually before full auto-resolution)' : ''}.`
                    : `Mitigation is currently applying — severity is expected to return to baseline within ${fmtDuration(Math.max(0, incident.endAt - Date.now()))}.`}
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
