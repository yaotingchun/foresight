import ServiceMapPanel from '../components/ServiceMapPanel'

/** Full-height Service Map screen — no side rails on this route. */
export default function TopologyPage() {
  return (
    <div className="h-full min-h-0 flex flex-col">
      <ServiceMapPanel />
    </div>
  )
}
