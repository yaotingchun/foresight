import { Activity, Gauge, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useLiveDashboard } from '../hooks/useLiveDashboard'
import { formatCompact, clockLabel } from '../components/overview/chartUtils'
import LiveBadge from '../components/servicemap/LiveBadge'
import Card from '../components/overview/Card'
import RangeTabs from '../components/overview/RangeTabs'
import MetricCard from '../components/overview/MetricCard'
import TrafficChart from '../components/overview/TrafficChart'
import LatencyChart from '../components/overview/LatencyChart'
import ResourceMeters from '../components/overview/ResourceMeters'
import StatusDonut from '../components/overview/StatusDonut'
import TopEndpoints from '../components/overview/TopEndpoints'
import EventFeed from '../components/overview/EventFeed'

/**
 * Foresight — Overview. A single-screen, real-time IT monitoring dashboard:
 * a key-metrics row, the live traffic graph, response-time performance
 * tracking, infrastructure utilisation, response-code mix, hottest endpoints
 * and a rolling event stream.
 */
export default function OverviewPage() {
  const { range, rangeMeta, setRange, series, current, events, kpis, topEndpoints } = useLiveDashboard()

  const healthPct = Math.round((current.nodesHealthy / current.nodesTotal) * 100)

  return (
    <div className="h-full overflow-y-auto animate-slide-fade">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-800">Overview</h1>
              <LiveBadge />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span>Real-time infrastructure &amp; service health</span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/50 bg-white/60 px-2 py-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-600 font-bold tabular-nums">{current.nodesHealthy}/{current.nodesTotal}</span>
                <span className="text-slate-400">nodes healthy</span>
                <span className="text-emerald-600 font-extrabold">({healthPct}%)</span>
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider sm:inline-flex">
              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Updated {clockLabel(series.t[series.t.length - 1])}</span>
            </span>
            <RangeTabs value={range} onChange={setRange} />
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            icon={Activity}
            tint="#DBEAFE"
            iconColor="#0EA5E9"
            label="Throughput"
            value={formatCompact(kpis.throughput.value)}
            unit="req/s"
            delta={kpis.throughput.delta}
            polarity="up-good"
            spark={kpis.throughput.spark}
            sparkColor="#0EA5E9"
            footnote="vs 5 min ago"
          />
          <MetricCard
            icon={Gauge}
            tint="#EDE9FE"
            iconColor="#4F46E5"
            label="p95 Latency"
            value={kpis.latency.value}
            unit="ms"
            delta={kpis.latency.delta}
            polarity="down-good"
            spark={kpis.latency.spark}
            sparkColor="#4F46E5"
            footnote="response time"
          />
          <MetricCard
            icon={AlertTriangle}
            tint="#FEE2E2"
            iconColor="#EF4444"
            label="Error Rate"
            value={kpis.errorRate.value.toFixed(2)}
            unit="%"
            delta={kpis.errorRate.delta}
            polarity="down-good"
            spark={kpis.errorRate.spark}
            sparkColor="#EF4444"
            footnote="5xx of total"
          />
          <MetricCard
            icon={ShieldCheck}
            tint="#DCFCE7"
            iconColor="#10B981"
            label="Availability"
            value={kpis.availability.value.toFixed(2)}
            unit="%"
            spark={kpis.availability.spark}
            sparkColor="#10B981"
            footnote="30-day SLA 99.95%"
          />
        </div>

        {/* Traffic + performance */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card
            className="xl:col-span-2"
            title="Request Traffic"
            subtitle="Throughput across all edge gateways"
            right={
              <div className="flex items-center gap-3 text-xs text-ink-soft">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-3.5 rounded-full bg-status-blue" /> Current
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0 w-3.5 border-t-2 border-dashed border-ink-faint" /> Previous
                </span>
              </div>
            }
          >
            <TrafficChart series={series} range={rangeMeta} />
          </Card>

          <Card title="Response Time" subtitle="Latency percentiles">
            <LatencyChart series={series} range={rangeMeta} />
          </Card>
        </div>

        {/* Infrastructure + mix + endpoints */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Infrastructure" subtitle="Cluster utilisation">
            <ResourceMeters resources={current.resources} />
          </Card>

          <Card title="Response Codes" subtitle="Live status distribution">
            <StatusDonut mix={current.statusMix} />
          </Card>

          <Card title="Top Endpoints" subtitle="By share of live traffic">
            <TopEndpoints endpoints={topEndpoints} throughput={kpis.throughput.value} />
          </Card>
        </div>

        {/* Event stream */}
        <Card title="Event Stream" subtitle="System activity, newest first">
          <EventFeed events={events} />
        </Card>
      </div>
    </div>
  )
}
