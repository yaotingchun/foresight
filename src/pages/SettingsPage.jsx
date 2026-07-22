import { useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import {
  Settings2, SlidersHorizontal, Share2, 
  BellRing, Activity, Terminal, CreditCard, 
  Network, Shield, Bot, Plus, Trash2,
  Upload, FileText
} from 'lucide-react'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-indigo-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-3' : 'translate-x-0'
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
              onChange={e => setThresholds(p => ({...p, latency: Number(e.target.value)}))}
              className="w-full rounded border border-line px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-ink">Error Rate (%)</label>
            <input 
              type="number" 
              value={thresholds.errorRate}
              onChange={e => setThresholds(p => ({...p, errorRate: Number(e.target.value)}))}
              className="w-full rounded border border-line px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-xs font-semibold text-ink">Throughput Drop (RPS delta)</label>
            <input 
              type="number" 
              value={thresholds.rpsDrop}
              onChange={e => setThresholds(p => ({...p, rpsDrop: Number(e.target.value)}))}
              className="w-full rounded border border-line px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
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
              <span className="text-xs font-bold text-indigo-600">{riskTiers.tier1}%</span>
            </div>
            <input 
              type="range" min="1" max="100" 
              value={riskTiers.tier1} 
              onChange={(e) => setRiskTiers(prev => ({ ...prev, tier1: Number(e.target.value) }))}
              className="w-full h-1 bg-slate-200 rounded appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ink">Tier 2: Manual Approval Threshold</label>
              <span className="text-xs font-bold text-amber-600">{riskTiers.tier2}%</span>
            </div>
            <input 
              type="range" min="1" max={riskTiers.tier1} 
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
                onChange={v => setAllowedActions(p => ({...p, [action.key]: v}))} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line pt-6">
        <h3 className="text-sm font-bold text-ink mb-1">Business Context (RAG)</h3>
        <p className="text-xs text-slate-500 mb-4">Provide context to the AI for smarter plans.</p>
        
        <div className="flex flex-col gap-4">
          <label className="border border-dashed border-indigo-200 bg-indigo-50/30 rounded flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-indigo-50/50 transition-colors">
            <input 
              type="file" 
              className="hidden" 
              multiple
              onChange={(e) => {
                if (e.target.files?.length) {
                  const newFiles = Array.from(e.target.files).map(f => f.name)
                  setBusinessContext(p => ({
                    ...p,
                    uploadedFiles: [...(p.uploadedFiles || []), ...newFiles]
                  }))
                }
              }}
            />
            <div className="flex items-center gap-2 text-indigo-600">
              <Upload size={14} />
              <span className="text-xs font-bold">Upload Architecture Docs (PDF, TXT, JSON)</span>
            </div>
          </label>

          {businessContext?.uploadedFiles?.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Indexed Documents</span>
              {businessContext.uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded border border-line">
                  <FileText size={12} className="text-indigo-500" />
                  <span className="text-xs text-ink">{file}</span>
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
              className="w-full rounded border border-line px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none min-h-[100px]"
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

  return (
    <div className="flex flex-col gap-6 animate-slide-fade">
      <div>
        <h3 className="text-sm font-bold text-ink mb-1">Escalation Routing</h3>
        <p className="text-xs text-slate-500 mb-4">Map affected services to specific response teams. Rules are evaluated top-down.</p>
        
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 rounded border border-line">
            <div className="col-span-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Service Pattern</div>
            <div className="col-span-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Team Name</div>
            <div className="col-span-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Details</div>
            <div className="col-span-1"></div>
          </div>
          
          {(escalation.routingRules || []).map(rule => (
            <div key={rule.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-4">
                <input 
                  type="text" value={rule.serviceMatch} onChange={e => updateRule(rule.id, 'serviceMatch', e.target.value)}
                  placeholder="e.g. payment-*" className="w-full rounded border border-line px-2 py-1.5 text-xs"
                />
              </div>
              <div className="col-span-3">
                <input 
                  type="text" value={rule.team} onChange={e => updateRule(rule.id, 'team', e.target.value)}
                  placeholder="Billing" className="w-full rounded border border-line px-2 py-1.5 text-xs"
                />
              </div>
              <div className="col-span-4">
                <input 
                  type="text" value={rule.emails} onChange={e => updateRule(rule.id, 'emails', e.target.value)}
                  placeholder="bill@co.com" className="w-full rounded border border-line px-2 py-1.5 text-xs"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button onClick={() => removeRule(rule.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          
          <button onClick={addRule} className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 border border-dashed border-slate-300 rounded text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 transition-colors">
            <Plus size={14} /> Add Routing Rule
          </button>
        </div>
      </div>
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
                onChange={v => setDataSources(p => ({...p, [source.key]: v}))} 
              />
            </div>
          ))}
        </div>
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
    dataSources, setDataSources
  } = useSettings()

  const tabs = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'automation', label: 'AI Automation', icon: Bot },
    { id: 'routing', label: 'Escalation Routing', icon: BellRing },
    { id: 'datasources', label: 'Data Sources', icon: Share2 }
  ]

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="border-b border-line px-6 py-4 flex items-center gap-2">
        <Settings2 size={18} className="text-indigo-600" />
        <h1 className="text-base font-bold text-ink">Settings</h1>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 border-r border-line bg-slate-50/50 p-4 flex flex-col gap-1 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold transition-colors ${
                activeTab === tab.id 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
              }`}
            >
              <tab.icon size={14} className={activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-white">
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
          </div>
        </div>
      </div>
    </div>
  )
}
