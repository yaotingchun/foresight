import {
  LayoutGrid,
  Share2,
  Logs,
  CircleDollarSign,
  AlertOctagon,
  FileBarChart,
  Settings,
} from 'lucide-react'

/**
 * Single source of truth for the sidebar and the router.
 * `built: true` renders the real screen; everything else falls through
 * to the Coming Soon placeholder.
 */
export const navItems = [
  { path: '/overview', label: 'Overview', icon: LayoutGrid, built: true },
  { path: '/topology', label: 'Topology', icon: Share2, built: true },
  { path: '/logs', label: 'Logs', icon: Logs, built: true },
  { path: '/financial-monitor', label: 'Financial Monitor', icon: CircleDollarSign, built: true },
  { path: '/incidents', label: 'Incidents', icon: AlertOctagon, built: true },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/settings', label: 'Settings', icon: Settings, built: true },
]
