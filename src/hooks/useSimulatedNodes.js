import { useMemo } from 'react'
import { NODES } from '../data/serviceMapData'
import { useSimulation } from '../context/SimulationContext'

/**
 * NODES merged with whatever the active simulation run is currently doing to
 * each component's health/metrics. Falls back to the real (historical)
 * values for every node the simulation isn't touching.
 */
export function useSimulatedNodes() {
  const { componentEffects } = useSimulation()

  return useMemo(() => {
    if (Object.keys(componentEffects).length === 0) return NODES
    return NODES.map((node) => {
      const eff = componentEffects[node.id]
      if (!eff) return node
      return {
        ...node,
        health: eff.health,
        metrics: { ...node.metrics, ...eff.metrics },
        simulated: true,
      }
    })
  }, [componentEffects])
}
