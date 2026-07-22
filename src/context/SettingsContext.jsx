import { createContext, useContext, useState, useMemo } from 'react'

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

export function SettingsProvider({ children }) {
  const [thresholds, setThresholds] = useState(defaultThresholds)
  const [riskTiers, setRiskTiers] = useState(defaultRiskTiers)
  const [escalation, setEscalation] = useState(defaultEscalation)
  const [businessContext, setBusinessContext] = useState(defaultBusinessContext)
  const [allowedActions, setAllowedActions] = useState(defaultAllowedActions)
  const [dataSources, setDataSources] = useState(defaultDataSources)

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
    setDataSources
  }), [thresholds, riskTiers, escalation, businessContext, allowedActions, dataSources])

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
