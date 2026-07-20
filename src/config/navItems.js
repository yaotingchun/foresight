import {
  LayoutGrid,
  Share2,
  Server,
  AppWindow,
  Database,
  Cloud,
  Network,
  ShieldCheck,
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
  { path: '/overview', label: 'Overview', icon: LayoutGrid },
  { path: '/topology', label: 'Topology', icon: Share2, built: true },
  { path: '/infrastructure', label: 'Infrastructure', icon: Server },
  { path: '/applications', label: 'Applications', icon: AppWindow },
  { path: '/databases', label: 'Databases', icon: Database },
  { path: '/cloud-services', label: 'Cloud Services', icon: Cloud },
  { path: '/network', label: 'Network', icon: Network },
  { path: '/security', label: 'Security', icon: ShieldCheck },
  { path: '/financial-monitor', label: 'Financial Monitor', icon: CircleDollarSign },
  { path: '/incidents', label: 'Incidents', icon: AlertOctagon },
  { path: '/reports', label: 'Reports', icon: FileBarChart },
  { path: '/settings', label: 'Settings', icon: Settings },
]
