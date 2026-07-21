import { Bell, MessageSquare, HelpCircle, Zap } from 'lucide-react'
import SearchInput from './SearchInput'
import IconButton from './IconButton'
import ProfileBlock from './ProfileBlock'
import { useSimulation } from '../context/SimulationContext'

export default function TopBar() {
  const { openDrawer, activeRun } = useSimulation()

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-line bg-card px-6">
      <SearchInput />

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          onClick={openDrawer}
          className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5
                     text-xs font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
        >
          <Zap size={13} className={activeRun ? 'animate-pulse' : ''} />
          Simulate Event
        </button>
        <IconButton icon={Bell} badge={12} label="Notifications" />
        <IconButton icon={MessageSquare} label="Messages" />
        <IconButton icon={HelpCircle} label="Help" />
        <ProfileBlock />
      </div>
    </header>
  )
}
