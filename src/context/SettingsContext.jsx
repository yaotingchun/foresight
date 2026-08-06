import { createContext, useContext, useState, useEffect, useMemo } from 'react'

const SettingsContext = createContext(null)

const defaultThresholds = { latency: 1000, errorRate: 5, rpsDrop: 20 }
const defaultRiskTiers = { tier1: 90, tier2: 70 }
const defaultEscalation = {
    routingRules: [
        { id: 1, serviceMatch: 'payment-*', team: 'Billing Team', emails: 'billing@company.com' },
        { id: 2, serviceMatch: 'order-*', team: 'Fulfillment Ops', emails: 'ops@company.com' },
        { id: 3, serviceMatch: '*', team: 'DevOps On-Call', emails: 'devops-oncall@company.com' }
    ]
}
const defaultBusinessContext = { uploadedFiles: [], instructions: '' }
const defaultAllowedActions = {
    restart_service: true,
    scale_up: true,
    block_ip: true,
    revert_deployment: false,
    drop_database: false
}
const defaultDataSources = {
    metrics: true,
    logs: true,
    transactions: true,
    network: false,
    security: false
}

const defaultPolicyMcpConfigs = {
    restart_service: {
        transport: 'stdio',
        command: 'npx',
        args: '-y @modelcontextprotocol/server-kubernetes restart-pod',
        env: 'KUBECONFIG=~/.kube/config\nNAMESPACE=prod',
        template: '{"pod_name": "{{component}}-service", "namespace": "prod"}',
        status: 'connected',
        tools: ['kube:restart-pod', 'kube:get-pod-logs']
    },
    scale_up: {
        transport: 'stdio',
        command: 'uvx',
        args: 'mcp-server-aws scale-asg',
        env: 'AWS_DEFAULT_REGION=us-east-1',
        template: '{"asg_name": "{{component}}-asg", "replicas": 5}',
        status: 'connected',
        tools: ['aws:scale-asg', 'aws:get-metric']
    },
    block_ip: {
        transport: 'sse',
        url: 'http://localhost:4000/sse',
        env: 'CLOUDFLARE_API_TOKEN=xxxx',
        template: '{"action": "block", "ip": "{{ip_range}}"}',
        status: 'connected',
        tools: ['cloudflare:block-ip', 'cloudflare:get-analytics']
    },
    revert_deployment: {
        transport: 'stdio',
        command: 'npx',
        args: '-y @modelcontextprotocol/server-github revert-pr',
        env: 'GITHUB_TOKEN=xxxx',
        template: '{"repo": "org/{{component}}", "pr_number": 12}',
        status: 'disconnected',
        tools: []
    },
    drop_database: {
        transport: 'sse',
        url: 'http://localhost:4001/sse',
        env: '',
        template: '{"query": "DROP TABLE {{table}}"}',
        status: 'disconnected',
        tools: []
    }
}

const STORAGE_KEY = 'foresight.experienceLogs'
const BUSINESS_CONTEXT_KEY = 'foresight.businessContext'
const THRESHOLDS_KEY = 'foresight.thresholds'
const RISK_TIERS_KEY = 'foresight.riskTiers'
const ESCALATION_KEY = 'foresight.escalation'
const ALLOWED_ACTIONS_KEY = 'foresight.allowedActions'
const DATA_SOURCES_KEY = 'foresight.dataSources'
const POLICY_MCP_CONFIGS_KEY = 'foresight.policyMcpConfigs'
const CUSTOM_POLICIES_KEY = 'foresight.customPolicies'


function loadStoredExperienceLogs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function loadStoredBusinessContext() {
    try {
        const raw = localStorage.getItem(BUSINESS_CONTEXT_KEY)
        return raw ? JSON.parse(raw) : defaultBusinessContext
    } catch {
        return defaultBusinessContext
    }
}

function loadStoredThresholds() {
    try {
        const raw = localStorage.getItem(THRESHOLDS_KEY)
        return raw ? JSON.parse(raw) : defaultThresholds
    } catch {
        return defaultThresholds
    }
}

function loadStoredRiskTiers() {
    try {
        const raw = localStorage.getItem(RISK_TIERS_KEY)
        return raw ? JSON.parse(raw) : defaultRiskTiers
    } catch {
        return defaultRiskTiers
    }
}

function loadStoredEscalation() {
    try {
        const raw = localStorage.getItem(ESCALATION_KEY)
        return raw ? JSON.parse(raw) : defaultEscalation
    } catch {
        return defaultEscalation
    }
}

function loadStoredAllowedActions() {
    try {
        const raw = localStorage.getItem(ALLOWED_ACTIONS_KEY)
        return raw ? JSON.parse(raw) : defaultAllowedActions
    } catch {
        return defaultAllowedActions
    }
}

function loadStoredDataSources() {
    try {
        const raw = localStorage.getItem(DATA_SOURCES_KEY)
        return raw ? JSON.parse(raw) : defaultDataSources
    } catch {
        return defaultDataSources
    }
}

function loadStoredPolicyMcpConfigs() {
    try {
        const raw = localStorage.getItem(POLICY_MCP_CONFIGS_KEY)
        return raw ? JSON.parse(raw) : defaultPolicyMcpConfigs
    } catch {
        return defaultPolicyMcpConfigs
    }
}

function loadStoredCustomPolicies() {
    try {
        const raw = localStorage.getItem(CUSTOM_POLICIES_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

export function SettingsProvider({ children }) {
    const [thresholds, setThresholds] = useState(loadStoredThresholds)
    const [riskTiers, setRiskTiers] = useState(loadStoredRiskTiers)
    const [escalation, setEscalation] = useState(loadStoredEscalation)
    const [businessContext, setBusinessContext] = useState(loadStoredBusinessContext)
    const [allowedActions, setAllowedActions] = useState(loadStoredAllowedActions)
    const [dataSources, setDataSources] = useState(loadStoredDataSources)
    const [policyMcpConfigs, setPolicyMcpConfigs] = useState(loadStoredPolicyMcpConfigs)
    const [customPolicies, setCustomPolicies] = useState(loadStoredCustomPolicies)
    const [experienceLogs, setExperienceLogs] = useState(loadStoredExperienceLogs)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(experienceLogs))
        } catch (err) {
            console.error('Failed to save experience logs to localStorage', err)
        }
    }, [experienceLogs])

    useEffect(() => {
        try {
            localStorage.setItem(BUSINESS_CONTEXT_KEY, JSON.stringify(businessContext))
        } catch (err) {
            console.error('Failed to save business context to localStorage', err)
        }
    }, [businessContext])

    useEffect(() => {
        try {
            localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(thresholds))
        } catch (err) {
            console.error('Failed to save thresholds to localStorage', err)
        }
    }, [thresholds])

    useEffect(() => {
        try {
            localStorage.setItem(RISK_TIERS_KEY, JSON.stringify(riskTiers))
        } catch (err) {
            console.error('Failed to save risk tiers to localStorage', err)
        }
    }, [riskTiers])

    useEffect(() => {
        try {
            localStorage.setItem(ESCALATION_KEY, JSON.stringify(escalation))
        } catch (err) {
            console.error('Failed to save escalation to localStorage', err)
        }
    }, [escalation])

    useEffect(() => {
        try {
            localStorage.setItem(ALLOWED_ACTIONS_KEY, JSON.stringify(allowedActions))
        } catch (err) {
            console.error('Failed to save allowed actions to localStorage', err)
        }
    }, [allowedActions])

    useEffect(() => {
        try {
            localStorage.setItem(DATA_SOURCES_KEY, JSON.stringify(dataSources))
        } catch (err) {
            console.error('Failed to save data sources to localStorage', err)
        }
    }, [dataSources])

    useEffect(() => {
        try {
            localStorage.setItem(POLICY_MCP_CONFIGS_KEY, JSON.stringify(policyMcpConfigs))
        } catch (err) {
            console.error('Failed to save policy MCP configs to localStorage', err)
        }
    }, [policyMcpConfigs])

    useEffect(() => {
        try {
            localStorage.setItem(CUSTOM_POLICIES_KEY, JSON.stringify(customPolicies))
        } catch (err) {
            console.error('Failed to save custom policies to localStorage', err)
        }
    }, [customPolicies])

    const value = useMemo(() => ({
        thresholds,
        setThresholds,
        riskTiers,
        setRiskTiers,
        escalation,
        setEscalation,
        businessContext,
        setBusinessContext,
        allowedActions,
        setAllowedActions,
        dataSources,
        setDataSources,
        policyMcpConfigs,
        setPolicyMcpConfigs,
        customPolicies,
        setCustomPolicies,
        experienceLogs,
        setExperienceLogs
    }), [thresholds, riskTiers, escalation, businessContext, allowedActions, dataSources, policyMcpConfigs, customPolicies, experienceLogs])

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const ctx = useContext(SettingsContext)
    if (!ctx) throw new Error('useSettings must be used within a SettingsProvider')
    return ctx
}
