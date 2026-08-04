import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import {
    Settings, Settings2, SlidersHorizontal, Share2,
    BellRing, Activity, Terminal, CreditCard,
    Network, Shield, Bot, Plus, Trash2,
    Upload, FileText, BrainCircuit
} from 'lucide-react'

function Toggle({ checked, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-brand' : 'bg-slate-200'
                }`}
        >
            <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-3' : 'translate-x-0'
                    }`}
            />
        </button>
    )
}

function GeneralSettings({ thresholds, setThresholds }) {
    return (
        <div className="flex flex-col gap-6 animate-slide-fade">
            <div>
                <h3 className="text-sm font-bold text-ink mb-1">Rule-Based Alert Thresholds</h3>
                <p className="text-xs text-slate-500 mb-4">Define baseline thresholds for component metrics. Breaches trigger anomaly events.</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Latency (ms)</label>
                        <input
                            type="number"
                            value={thresholds.latency}
                            onChange={e => setThresholds(p => ({ ...p, latency: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Error Rate (%)</label>
                        <input
                            type="number"
                            value={thresholds.errorRate}
                            onChange={e => setThresholds(p => ({ ...p, errorRate: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Connection Pool (%)</label>
                        <input
                            type="number"
                            value={thresholds.connectionPool ?? 95}
                            onChange={e => setThresholds(p => ({ ...p, connectionPool: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">CPU Utilization (%)</label>
                        <input
                            type="number"
                            value={thresholds.cpu ?? 85}
                            onChange={e => setThresholds(p => ({ ...p, cpu: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Memory Usage (%)</label>
                        <input
                            type="number"
                            value={thresholds.memory ?? 90}
                            onChange={e => setThresholds(p => ({ ...p, memory: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">z-Score Threshold</label>
                        <input
                            type="number"
                            step="0.1"
                            value={thresholds.zScore ?? 2.5}
                            onChange={e => setThresholds(p => ({ ...p, zScore: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Isolation Forest Anomaly Threshold</label>
                        <input
                            type="number"
                            step="0.05"
                            value={thresholds.isolationForest ?? 0.70}
                            onChange={e => setThresholds(p => ({ ...p, isolationForest: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Throughput Drop (RPS delta)</label>
                        <input
                            type="number"
                            value={thresholds.rpsDrop}
                            onChange={e => setThresholds(p => ({ ...p, rpsDrop: Number(e.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function AutomationSettings({ riskTiers, setRiskTiers, allowedActions, setAllowedActions, businessContext, setBusinessContext }) {
    return (
        <div className="flex flex-col gap-8 animate-slide-fade">
            <div>
                <h3 className="text-sm font-bold text-ink mb-1">Risk Tier Thresholds</h3>
                <p className="text-xs text-slate-500 mb-4">Set AI confidence score requirements for automated vs. manual execution.</p>

                <div className="flex flex-col gap-4">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-ink">Tier 1: Auto-Execute Threshold</label>
                            <span className="text-xs font-bold text-brand">{riskTiers.tier1}%</span>
                        </div>
                        <input
                            type="range" min="1" max="100"
                            value={riskTiers.tier1}
                            onChange={(e) => setRiskTiers(prev => ({ ...prev, tier1: Number(e.target.value) }))}
                            className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-emerald-500"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-ink">Tier 2: Manual Approval Threshold</label>
                            <span className="text-xs font-bold text-amber-600">{riskTiers.tier2}%</span>
                        </div>
                        <input
                            type="range" min="1" max="100"
                            value={riskTiers.tier2}
                            onChange={(e) => setRiskTiers(prev => ({ ...prev, tier2: Number(e.target.value) }))}
                            className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-amber-500"
                        />
                    </div>
                </div>
            </div>

            <div className="border-t border-line pt-6">
                <h3 className="text-sm font-bold text-ink mb-1">AI Automation Policies</h3>
                <p className="text-xs text-slate-500 mb-4">Allow or block AI from performing specific actions.</p>

                <div className="flex flex-col gap-2">
                    {[
                        { key: 'restart_service', label: 'Restart Services' },
                        { key: 'scale_up', label: 'Scale Up Resources' },
                        { key: 'block_ip', label: 'Block IP Ranges' },
                        { key: 'revert_deployment', label: 'Revert Deployments' },
                        { key: 'drop_database', label: 'Drop Database Tables' }
                    ].map(action => (
                        <div key={action.key} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <span className="text-xs font-medium text-ink">{action.label}</span>
                            <Toggle
                                checked={allowedActions[action.key]}
                                onChange={v => setAllowedActions(p => ({ ...p, [action.key]: v }))}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-line pt-6">
                <h3 className="text-sm font-bold text-ink mb-1">Business Context (RAG)</h3>
                <p className="text-xs text-slate-500 mb-4">Provide context to the AI for smarter plans.</p>

                <div className="flex flex-col gap-4">
                    <label className="border border-dashed border-slate-200 bg-slate-50/50 rounded-lg flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-slate-100/50 hover:border-slate-300 transition-all duration-200">
                        <input
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => {
                                if (e.target.files?.length) {
                                    const files = Array.from(e.target.files)
                                    Promise.all(files.map(file => {
                                        return new Promise((resolve) => {
                                            const reader = new FileReader()
                                            reader.onload = (ev) => {
                                                resolve({
                                                    name: file.name,
                                                    content: ev.target.result || ''
                                                })
                                            }
                                            reader.onerror = () => {
                                                resolve({
                                                    name: file.name,
                                                    content: ''
                                                })
                                            }
                                            reader.readAsText(file)
                                        })
                                    })).then(newFiles => {
                                        setBusinessContext(p => ({
                                            ...p,
                                            uploadedFiles: [...(p.uploadedFiles || []), ...newFiles]
                                        }))
                                    })
                                }
                            }}
                        />
                        <div className="flex items-center gap-2 text-slate-700">
                            <Upload size={14} />
                            <span className="text-xs font-bold">Upload Architecture Docs (PDF, TXT, JSON)</span>
                        </div>
                    </label>

                    {businessContext?.uploadedFiles?.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Indexed Documents</span>
                            {businessContext.uploadedFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded border border-line">
                                    <FileText size={12} className="text-slate-500" />
                                    <span className="text-xs text-ink">{file.name || file}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-ink">Core Business Rules</label>
                        <textarea
                            rows={12}
                            value={businessContext?.instructions || ''}
                            onChange={e => setBusinessContext(p => ({ ...p, instructions: e.target.value }))}
                            placeholder="e.g. Always prioritize checkout..."
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none min-h-[100px]"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function RoutingSettings({ escalation, setEscalation }) {
    const addRule = () => {
        setEscalation(p => ({
            ...p,
            routingRules: [...(p.routingRules || []), { id: Date.now(), serviceMatch: '', team: '', emails: '' }]
        }))
    }

    const updateRule = (id, field, value) => {
        setEscalation(p => ({
            ...p,
            routingRules: p.routingRules.map(r => r.id === id ? { ...r, [field]: value } : r)
        }))
    }

    const removeRule = (id) => {
        setEscalation(p => ({
            ...p,
            routingRules: p.routingRules.filter(r => r.id !== id)
        }))
    }

    const rules = escalation.routingRules || [];

    return (
        <div className="flex flex-col gap-6 animate-slide-fade">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-sm font-bold text-ink mb-1">Escalation Routing</h3>
                    <p className="text-xs text-slate-500">
                        Configure how alerts and incidents are routed. Map service patterns to specific response teams. Rules are evaluated top-down.
                    </p>
                </div>
                <button 
                    onClick={addRule} 
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                    <Plus size={14} />
                    Add Rule
                </button>
            </div>

            <div className="flex flex-col gap-3 mt-2">
                {rules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                        <div className="w-12 h-12 bg-white border border-slate-100 shadow-sm rounded-full flex items-center justify-center mb-4">
                            <BellRing size={20} className="text-slate-400" />
                        </div>
                        <h4 className="text-sm font-bold text-ink">No routing rules</h4>
                        <p className="text-sm text-slate-500 mt-1 mb-5 text-center max-w-sm">
                            You haven't set up any escalation paths. Alerts will use the default fallback contact.
                        </p>
                        <button 
                            onClick={addRule} 
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-ink text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <Plus size={16} />
                            Create your first rule
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                            <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Network size={14} className="text-slate-400" /> Service Pattern
                            </div>
                            <div className="col-span-3 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield size={14} className="text-slate-400" /> Team Name
                            </div>
                            <div className="col-span-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <BellRing size={14} className="text-slate-400" /> Contact Details
                            </div>
                            <div className="col-span-1"></div>
                        </div>

                        {/* Rules List */}
                        <div className="divide-y divide-slate-100">
                            {rules.map((rule, idx) => (
                                <div key={rule.id} className="grid grid-cols-12 gap-4 px-5 py-3.5 items-center group hover:bg-slate-50/50 transition-colors">
                                    
                                    {/* Pattern Input */}
                                    <div className="col-span-4 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-400 text-xs font-mono font-bold">#</span>
                                        </div>
                                        <input
                                            type="text" 
                                            value={rule.serviceMatch} 
                                            onChange={e => updateRule(rule.id, 'serviceMatch', e.target.value)}
                                            placeholder="e.g. payment-*" 
                                            className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all placeholder:text-slate-300 text-ink font-mono"
                                        />
                                    </div>

                                    {/* Team Input */}
                                    <div className="col-span-3">
                                        <input
                                            type="text" 
                                            value={rule.team} 
                                            onChange={e => updateRule(rule.id, 'team', e.target.value)}
                                            placeholder="e.g. Billing Team" 
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all placeholder:text-slate-300 text-ink font-medium"
                                        />
                                    </div>

                                    {/* Email Input */}
                                    <div className="col-span-4">
                                        <input
                                            type="text" 
                                            value={rule.emails} 
                                            onChange={e => updateRule(rule.id, 'emails', e.target.value)}
                                            placeholder="e.g. alerts@team.com" 
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:border-brand focus:ring-1 focus:ring-brand/20 outline-none transition-all placeholder:text-slate-300 text-ink"
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-1 flex justify-end">
                                        <button 
                                            onClick={() => removeRule(rule.id)} 
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Remove rule"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            
            {rules.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-brand-tint/20 border border-brand/20 rounded-xl mt-2">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                        <Bot size={16} className="text-brand" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-ink">AI-Powered Routing</h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
                            Foresight AI will automatically interpret these patterns to tag and notify the appropriate teams during an incident. The system falls back to default routing if no patterns match.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}

function DataSourcesSettings({ dataSources, setDataSources }) {
    return (
        <div className="flex flex-col gap-6 animate-slide-fade">
            <div>
                <h3 className="text-sm font-bold text-ink mb-1">Data Source Connectors</h3>
                <p className="text-xs text-slate-500 mb-4">Manage telemetry streams feeding the AI ingestion layer.</p>

                <div className="flex flex-col gap-0 border border-line rounded">
                    {[
                        { key: 'metrics', label: 'Metrics Ingestion', icon: Activity },
                        { key: 'logs', label: 'Log Aggregation', icon: Terminal },
                        { key: 'transactions', label: 'Transaction Tracing', icon: CreditCard },
                        { key: 'network', label: 'Network Flow', icon: Network },
                        { key: 'security', label: 'Security Events', icon: Shield }
                    ].map((source, idx) => (
                        <div key={source.key} className={`flex items-center justify-between p-3 ${idx !== 0 ? 'border-t border-line' : ''}`}>
                            <div className="flex items-center gap-2.5">
                                <source.icon size={14} className="text-slate-500" />
                                <span className="text-xs font-semibold text-ink">{source.label}</span>
                            </div>
                            <Toggle
                                checked={dataSources[source.key]}
                                onChange={v => setDataSources(p => ({ ...p, [source.key]: v }))}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function AdaptiveLearningSettings({ experienceLogs }) {
    return (
        <div className="flex flex-col gap-6 animate-slide-fade">
            <div>
                <h3 className="text-sm font-bold text-ink mb-1">Experience Memory</h3>
                <p className="text-xs text-slate-500 mb-4">Read-only log of AI lessons learned from human feedback.</p>

                {(!experienceLogs || experienceLogs.length === 0) ? (
                    <div className="text-center py-10 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs">
                        No feedback recorded yet. Disapprove an AI remediation step to teach it.
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {experienceLogs.map((log, idx) => (
                            <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-line bg-slate-50">
                                <div className="flex items-center gap-2">
                                    <BrainCircuit size={14} className="text-brand" />
                                    <span className="text-xs font-bold text-ink">{log.incidentContext || 'General Context'}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="text-xs text-slate-600">
                                    <span className="font-semibold text-red-500">Rejected: </span> {log.rejectedStep}
                                </div>
                                <div className="text-xs text-slate-600">
                                    <span className="font-semibold text-emerald-600">Feedback: </span> {log.userFeedback}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')
    const {
        thresholds, setThresholds,
        riskTiers, setRiskTiers,
        escalation, setEscalation,
        businessContext, setBusinessContext,
        allowedActions, setAllowedActions,
        dataSources, setDataSources,
        experienceLogs
    } = useSettings()

    const tabs = [
        { id: 'general', label: 'General', icon: Settings2 },
        { id: 'automation', label: 'AI Automation', icon: Bot },
        { id: 'routing', label: 'Escalation Routing', icon: BellRing },
        { id: 'datasources', label: 'Data Sources', icon: Share2 },
        { id: 'learning', label: 'Adaptive Learning', icon: BrainCircuit }
    ]

    return (
        <div className="h-full bg-card flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 lg:p-6 shrink-0">
                <div>
                    <div className="flex items-center gap-2.5">
                        <Settings size={20} className="text-brand" />
                        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">
                        Manage workspace configurations, AI automations, and escalation routing
                    </p>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r border-slate-200 bg-white p-4 flex flex-col gap-1 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab.id
                                    ? 'bg-black text-white'
                                    : 'text-slate-600 hover:bg-black hover:text-white'
                                }`}
                        >
                            <tab.icon size={14} className={activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-card">
                    <div className="max-w-4xl">
                        {activeTab === 'general' && (
                            <GeneralSettings thresholds={thresholds} setThresholds={setThresholds} />
                        )}
                        {activeTab === 'automation' && (
                            <AutomationSettings
                                riskTiers={riskTiers} setRiskTiers={setRiskTiers}
                                allowedActions={allowedActions} setAllowedActions={setAllowedActions}
                                businessContext={businessContext} setBusinessContext={setBusinessContext}
                            />
                        )}
                        {activeTab === 'routing' && (
                            <RoutingSettings escalation={escalation} setEscalation={setEscalation} />
                        )}
                        {activeTab === 'datasources' && (
                            <DataSourcesSettings dataSources={dataSources} setDataSources={setDataSources} />
                        )}
                        {activeTab === 'learning' && (
                            <AdaptiveLearningSettings experienceLogs={experienceLogs} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
