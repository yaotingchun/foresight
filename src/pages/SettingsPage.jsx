import { useState } from 'react'
import Swal from 'sweetalert2'
import 'sweetalert2/dist/sweetalert2.min.css'
import { useSettings } from '../context/SettingsContext'
import {
    Settings, Settings2, SlidersHorizontal, Share2,
    BellRing, Activity, Terminal, CreditCard,
    Network, Shield, Bot, Plus, Trash2,
    Upload, FileText, BrainCircuit, ChevronDown, ChevronUp, Play
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

function AutomationSettings({ riskTiers, setRiskTiers, allowedActions, setAllowedActions, businessContext, setBusinessContext, policyMcpConfigs = {}, setPolicyMcpConfigs, customPolicies = [], setCustomPolicies }) {
    const [expandedPolicies, setExpandedPolicies] = useState({
        restart_service: false,
        scale_up: false,
        block_ip: false,
        revert_deployment: false,
        drop_database: false
    })
    
    const [testingKey, setTestingKey] = useState(null)

    const togglePolicyExpanded = (key) => {
        setExpandedPolicies(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleMcpChange = (key, field, value) => {
        setPolicyMcpConfigs(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }))
    }

    const handleTestMcp = (key) => {
        setTestingKey(key)
        handleMcpChange(key, 'status', 'testing')
        
        setTimeout(() => {
            const config = policyMcpConfigs[key] || {}
            const isInvalid = config.transport === 'stdio' ? !config.command : !config.url
            if (isInvalid) {
                Swal.fire({
                    title: 'Connection Failed',
                    text: `Missing command or endpoint URL for this policy's MCP tool.`,
                    icon: 'error',
                    confirmButtonColor: '#4f46e5'
                })
                handleMcpChange(key, 'status', 'disconnected')
                setTestingKey(null)
                return
            }
            
            let mockTools = config.tools || []
            if (mockTools.length === 0) {
                if (key === 'restart_service') mockTools = ['kube:restart-pod', 'kube:get-pod-logs']
                else if (key === 'scale_up') mockTools = ['aws:scale-asg', 'aws:get-metric']
                else if (key === 'block_ip') mockTools = ['cloudflare:block-ip', 'cloudflare:get-analytics']
                else if (key === 'revert_deployment') mockTools = ['github:revert-pr']
                else mockTools = ['db:failover-primary', 'db:kill-long-queries']
                handleMcpChange(key, 'tools', mockTools)
            }
            
            Swal.fire({
                title: 'MCP Connected Successfully',
                html: `<div style="text-align: left; font-size: 13.5px; font-family: sans-serif;">
                         <p style="font-weight: 600; margin-bottom: 8px; color: #10b981;">Successfully loaded policy tool signature!</p>
                         <p style="font-weight: 500; margin-bottom: 4px; color: #475569;">Available Tools:</p>
                         <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px;">
                           ${mockTools.map(t => `<code style="display: block; margin-bottom: 4px; color: #0f172a; font-family: monospace; font-size: 11.5px;">${t}</code>`).join('')}
                         </div>
                       </div>`,
                icon: 'success',
                confirmButtonColor: '#10b981'
            })
            
            handleMcpChange(key, 'status', 'connected')
            setTestingKey(null)
        }, 1500)
    }

    const handleCreatePolicyClick = () => {
        Swal.fire({
            title: 'Create Custom Automation Policy',
            html: `
                <div style="font-family: 'Inter', sans-serif; text-align: left; display: flex; flex-direction: column; gap: 14px; color: #0f172a; padding: 4px 0;">
                    <p style="font-size: 12.5px; text-align: left; margin: 0 0 10px 0; color: #64748b; line-height: 1.5;">
                        Define a new guardrail policy. This will expose a custom trigger action configuration for the AI to query and execute.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Policy Name</label>
                            <input id="swal-policy-name" type="text" placeholder="e.g. Flush Cache Cluster" 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; outline: none; transition: border-color 0.2s;" />
                        </div>

                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Description</label>
                            <input id="swal-policy-desc" type="text" placeholder="e.g. Allows AI to flush Redis keys." 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; outline: none;" />
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Default Transport</label>
                                <select id="swal-policy-transport" 
                                        style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; background-color: white; outline: none;">
                                    <option value="stdio">Stdio (Local Process)</option>
                                    <option value="sse">SSE (HTTP endpoint)</option>
                                </select>
                            </div>

                            <div>
                                <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Exposed Tool Name</label>
                                <input id="swal-policy-tool" type="text" placeholder="e.g. redis:flush-cache" 
                                       style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: monospace; outline: none;" />
                            </div>
                        </div>

                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Command Binary / SSE URL</label>
                            <input id="swal-policy-command" type="text" placeholder="e.g. npx or http://localhost:5000/sse" 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: monospace; outline: none;" />
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Create Policy',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl shadow-xl border border-slate-100 p-6',
                title: 'text-[17px] font-bold text-slate-800 tracking-tight text-left border-b border-slate-100 pb-3 font-sans',
                confirmButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer mr-2',
                cancelButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white bg-slate-400 hover:bg-slate-500 transition-all active:scale-95 cursor-pointer'
            },
            buttonsStyling: false,
            preConfirm: () => {
                const name = document.getElementById('swal-policy-name').value;
                const desc = document.getElementById('swal-policy-desc').value;
                const transport = document.getElementById('swal-policy-transport').value;
                const command = document.getElementById('swal-policy-command').value;
                const tool = document.getElementById('swal-policy-tool').value;

                if (!name || !desc) {
                    Swal.showValidationMessage('Please fill in name and description!');
                    return false;
                }
                return { name, desc, transport, command, tool };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const { name, desc, transport, command, tool } = result.value;
                const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

                setCustomPolicies(prev => [
                    ...prev,
                    { key, label: name, desc }
                ]);

                setAllowedActions(prev => ({
                    ...prev,
                    [key]: true
                }));

                setPolicyMcpConfigs(prev => ({
                    ...prev,
                    [key]: {
                        transport,
                        command: transport === 'stdio' ? command : 'npx',
                        args: '',
                        url: transport === 'sse' ? command : 'http://localhost:3000/sse',
                        env: '',
                        template: '{"action": "remediate"}',
                        status: 'disconnected',
                        tools: tool ? [tool] : []
                    }
                }));

                Swal.fire({
                    title: 'Policy Created',
                    text: `"${name}" policy has been added successfully!`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    customClass: {
                        popup: 'rounded-xl shadow-lg border border-slate-100 font-sans',
                        title: 'text-[16px] font-bold text-slate-800',
                        confirmButton: 'rounded-lg px-4 py-2 font-bold text-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors'
                    },
                    buttonsStyling: false
                });
            }
        });
    };

    const handleDeletePolicyClick = (key, label) => {
        Swal.fire({
            title: 'Delete Custom Policy?',
            text: `Are you sure you want to permanently delete "${label}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl border border-slate-100 shadow-xl font-sans p-6',
                title: 'text-[18px] font-bold text-slate-800 tracking-tight font-sans',
                htmlContainer: 'text-[13.5px] text-slate-500 leading-relaxed font-sans mt-2',
                confirmButton: 'rounded-lg px-4 py-2 font-semibold text-[13px] text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 cursor-pointer mx-1.5',
                cancelButton: 'rounded-lg px-4 py-2 font-semibold text-[13px] text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer mx-1.5'
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                setCustomPolicies(prev => prev.filter(p => p.key !== key));
                setAllowedActions(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                setPolicyMcpConfigs(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Policy has been removed.',
                    icon: 'success',
                    customClass: {
                        popup: 'rounded-xl shadow-lg border border-slate-100 font-sans',
                        title: 'text-[16px] font-bold text-slate-800',
                        confirmButton: 'rounded-lg px-4 py-2 font-bold text-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors'
                    },
                    buttonsStyling: false
                });
            }
        });
    };

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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-ink mb-1">AI Automation Policies</h3>
                        <p className="text-xs text-slate-500">Allow or block AI from performing specific actions, and customize their Model Context Protocol (MCP) executor tool.</p>
                    </div>
                    <button
                        onClick={handleCreatePolicyClick}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} />
                        Create Policy
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    {[
                        { key: 'restart_service', label: 'Restart Services', desc: 'Allows AI to rolling-restart pods/services during outages.' },
                        { key: 'scale_up', label: 'Scale Up Resources', desc: 'Allows AI to increase replicas or provision larger node capacities.' },
                        { key: 'block_ip', label: 'Block IP Ranges', desc: 'Allows AI to update WAF/CDN rules to mitigate DDoS or anomalous traffic.' },
                        { key: 'revert_deployment', label: 'Revert Deployments', desc: 'Allows AI to roll back recent bad git deployments.' },
                        { key: 'drop_database', label: 'Drop Database Tables', desc: 'Allows AI to drop schemas or clean up database records.' },
                        ...customPolicies
                    ].map(action => {
                        const isAllowed = allowedActions[action.key]
                        const config = policyMcpConfigs[action.key] || {}
                        const isExpanded = expandedPolicies[action.key]
                        const isCustom = customPolicies.some(cp => cp.key === action.key)
                        
                        return (
                            <div key={action.key} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all bg-white">
                                {/* Header / Toggle Bar */}
                                <div className="flex items-center justify-between p-4 bg-slate-50/50">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-bold text-ink">{action.label}</span>
                                        <span className="text-[11px] text-slate-500">{action.desc}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isAllowed && (
                                            <button
                                                onClick={() => togglePolicyExpanded(action.key)}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-0.5 px-2 py-1 rounded bg-indigo-50 border border-indigo-100 transition-colors"
                                            >
                                                <span>Configure MCP</span>
                                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                            </button>
                                        )}
                                        {isCustom && (
                                            <button
                                                onClick={() => handleDeletePolicyClick(action.key, action.label)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Delete Custom Policy"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                        <Toggle
                                            checked={isAllowed}
                                            onChange={v => {
                                                setAllowedActions(p => ({ ...p, [action.key]: v }))
                                                setExpandedPolicies(p => ({ ...p, [action.key]: v }))
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* MCP Sub-Panel */}
                                {isAllowed && isExpanded && (
                                    <div className="border-t border-slate-100 p-4 bg-white flex flex-col gap-4 animate-slide-fade">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transport Protocol</label>
                                                <select
                                                    value={config.transport || 'stdio'}
                                                    onChange={e => handleMcpChange(action.key, 'transport', e.target.value)}
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-50/50"
                                                >
                                                    <option value="stdio">Stdio (Standard I/O Process)</option>
                                                    <option value="sse">SSE (Server-Sent Events HTTP)</option>
                                                </select>
                                            </div>

                                            {config.transport === 'stdio' ? (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stdio Command</label>
                                                    <input
                                                        type="text"
                                                        value={config.command || ''}
                                                        onChange={e => handleMcpChange(action.key, 'command', e.target.value)}
                                                        placeholder="e.g. npx, uvx, python"
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-mono"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SSE Endpoint URL</label>
                                                    <input
                                                        type="text"
                                                        value={config.url || ''}
                                                        onChange={e => handleMcpChange(action.key, 'url', e.target.value)}
                                                        placeholder="e.g. http://localhost:3000/sse"
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {config.transport === 'stdio' && (
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Command Arguments</label>
                                                <input
                                                    type="text"
                                                    value={config.args || ''}
                                                    onChange={e => handleMcpChange(action.key, 'args', e.target.value)}
                                                    placeholder="e.g. -y @modelcontextprotocol/server-kubernetes restart-pod"
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-mono"
                                                />
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arguments Template (JSON Payload)</label>
                                                <textarea
                                                    rows={3}
                                                    value={config.template || ''}
                                                    onChange={e => handleMcpChange(action.key, 'template', e.target.value)}
                                                    placeholder='e.g. {"service": "{{component}}-service"}'
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-mono min-h-[60px]"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Environment Variables (KEY=VALUE)</label>
                                                <textarea
                                                    rows={3}
                                                    value={config.env || ''}
                                                    onChange={e => handleMcpChange(action.key, 'env', e.target.value)}
                                                    placeholder="e.g. KUBECONFIG=~/.kube/config&#10;NAMESPACE=prod"
                                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-mono min-h-[60px]"
                                                />
                                            </div>
                                        </div>

                                        {/* Status and Action Buttons */}
                                        <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
                                                {config.status === 'testing' ? (
                                                    <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-spin mr-1" />
                                                        Testing...
                                                    </span>
                                                ) : config.status === 'connected' ? (
                                                    <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <span className="relative flex h-1.5 w-1.5 mr-1">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                        Connected & Ready
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        Disconnected
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <button
                                                onClick={() => handleTestMcp(action.key)}
                                                disabled={config.status === 'testing'}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                <Play size={11} className={config.status === 'testing' ? 'animate-spin mr-0.5' : 'mr-0.5'} />
                                                Test MCP Tool
                                            </button>
                                        </div>

                                        {/* Exposed Tools Mini List */}
                                        {config.status === 'connected' && config.tools && config.tools.length > 0 && (
                                            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Connected Exposed Tools</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {config.tools.map(tool => (
                                                        <code key={tool} className="text-[10px] font-semibold bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-mono">
                                                            {tool}
                                                        </code>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="border-t border-line pt-6">
                <h3 className="text-sm font-bold text-ink mb-1">Business Context (RAG)</h3>
                <p className="text-xs text-slate-505 mb-4">Provide context to the AI for smarter plans.</p>

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
                                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-55 rounded border border-line">
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
    const [expandedRules, setExpandedRules] = useState({})

    const handleAddRuleClick = () => {
        Swal.fire({
            title: 'Add Escalation Routing Rule',
            html: `
                <div style="font-family: 'Inter', sans-serif; text-align: left; display: flex; flex-direction: column; gap: 14px; color: #0f172a; padding: 4px 0;">
                    <p style="font-size: 12.5px; text-align: left; margin: 0 0 10px 0; color: #64748b; line-height: 1.5;">
                        Configure a new escalation routing rule. Alerts matching this service pattern will be routed to the specified on-call team.
                    </p>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Service Match Pattern</label>
                            <input id="swal-rule-pattern" type="text" placeholder="e.g. payment-* or database-primary" 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: monospace; outline: none; transition: border-color 0.2s;" />
                        </div>

                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">On-Call Team Name</label>
                            <input id="swal-rule-team" type="text" placeholder="e.g. Billing Team" 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-weight: 600; outline: none;" />
                        </div>

                        <div>
                            <label style="display: block; font-weight: 700; font-size: 10.5px; text-transform: uppercase; tracking-wider; color: #475569; margin-bottom: 5px;">Contact Email(s)</label>
                            <input id="swal-rule-emails" type="text" placeholder="e.g. billing-alerts@company.com" 
                                   style="width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; font-size: 13px; outline: none;" />
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add Rule',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl shadow-xl border border-slate-100 p-6',
                title: 'text-[17px] font-bold text-slate-800 tracking-tight text-left border-b border-slate-100 pb-3 font-sans',
                confirmButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-95 cursor-pointer mr-2',
                cancelButton: 'rounded-lg px-4 py-2 font-bold text-[13px] text-white bg-slate-400 hover:bg-slate-500 transition-all active:scale-95 cursor-pointer'
            },
            buttonsStyling: false,
            preConfirm: () => {
                const serviceMatch = document.getElementById('swal-rule-pattern').value;
                const team = document.getElementById('swal-rule-team').value;
                const emails = document.getElementById('swal-rule-emails').value;

                if (!serviceMatch || !team || !emails) {
                    Swal.showValidationMessage('Please fill in all fields!');
                    return false;
                }
                return { serviceMatch, team, emails };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const { serviceMatch, team, emails } = result.value;
                const id = Date.now();

                setEscalation(p => ({
                    ...p,
                    routingRules: [...(p.routingRules || []), { id, serviceMatch, team, emails }]
                }));

                Swal.fire({
                    title: 'Rule Added',
                    text: `Escalation rule for "${serviceMatch}" has been added successfully!`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    customClass: {
                        popup: 'rounded-xl shadow-lg border border-slate-100 font-sans',
                        title: 'text-[16px] font-bold text-slate-800',
                        confirmButton: 'rounded-lg px-4 py-2 font-bold text-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors'
                    },
                    buttonsStyling: false
                });
            }
        });
    };

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
        setExpandedRules(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
    }

    const handleDeleteRuleClick = (id, pattern) => {
        Swal.fire({
            title: 'Delete Escalation Rule?',
            text: `Are you sure you want to permanently delete the routing rule for pattern "${pattern || '*'}"? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Delete It',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl border border-slate-100 shadow-xl font-sans p-6',
                title: 'text-[18px] font-bold text-slate-800 tracking-tight font-sans',
                htmlContainer: 'text-[13.5px] text-slate-500 leading-relaxed font-sans mt-2',
                confirmButton: 'rounded-lg px-4 py-2 font-semibold text-[13px] text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 cursor-pointer mx-1.5',
                cancelButton: 'rounded-lg px-4 py-2 font-semibold text-[13px] text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95 cursor-pointer mx-1.5'
            },
            buttonsStyling: false,
        }).then((result) => {
            if (result.isConfirmed) {
                removeRule(id);
                Swal.fire({
                    title: 'Deleted!',
                    text: 'Routing rule has been removed.',
                    icon: 'success',
                    customClass: {
                        popup: 'rounded-xl shadow-lg border border-slate-100 font-sans',
                        title: 'text-[16px] font-bold text-slate-800',
                        confirmButton: 'rounded-lg px-4 py-2 font-bold text-[12px] bg-emerald-500 text-white hover:bg-emerald-600 transition-colors'
                    },
                    buttonsStyling: false
                });
            }
        });
    };

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
                    onClick={handleAddRuleClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                    <Plus size={14} />
                    Add Rule
                </button>
            </div>

            <div className="flex flex-col gap-4 mt-2">
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
                            onClick={handleAddRuleClick}
                            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-ink text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            <Plus size={16} />
                            Create your first rule
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3.5">
                        {rules.map((rule) => {
                            const isExpanded = expandedRules[rule.id]
                            return (
                                <div key={rule.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow transition-all bg-white">
                                    {/* Header / Summary Bar */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50/50">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                                <Network size={13} className="text-slate-400" />
                                                Service Match Pattern: <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[10.5px] font-bold">{rule.serviceMatch || '*'}</code>
                                            </span>
                                            <span className="text-[11px] text-slate-505">
                                                Routes to: <strong className="text-slate-700 font-semibold">{rule.team || 'Unconfigured Team'}</strong> {rule.emails && `(${rule.emails})`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <button
                                                onClick={() => setExpandedRules(prev => ({ ...prev, [rule.id]: !prev[rule.id] }))}
                                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 flex items-center gap-0.5 px-2 py-1 rounded bg-indigo-50 border border-indigo-100 transition-colors"
                                            >
                                                <span>Configure Routing</span>
                                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRuleClick(rule.id, rule.serviceMatch)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                title="Delete Rule"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Inputs inside the expanded card */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 p-4 bg-white flex flex-col gap-4 animate-slide-fade">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Pattern</label>
                                                    <input
                                                        type="text"
                                                        value={rule.serviceMatch}
                                                        onChange={e => updateRule(rule.id, 'serviceMatch', e.target.value)}
                                                        placeholder="e.g. payment-*"
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-50/50 font-mono"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Team Name</label>
                                                    <input
                                                        type="text"
                                                        value={rule.team}
                                                        onChange={e => updateRule(rule.id, 'team', e.target.value)}
                                                        placeholder="e.g. Billing Team"
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50 font-semibold"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact Email(s)</label>
                                                    <input
                                                        type="text"
                                                        value={rule.emails}
                                                        onChange={e => updateRule(rule.id, 'emails', e.target.value)}
                                                        placeholder="e.g. billing@company.com"
                                                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none bg-slate-55/50"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
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
        policyMcpConfigs, setPolicyMcpConfigs,
        customPolicies, setCustomPolicies,
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
                                policyMcpConfigs={policyMcpConfigs} setPolicyMcpConfigs={setPolicyMcpConfigs}
                                customPolicies={customPolicies} setCustomPolicies={setCustomPolicies}
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
