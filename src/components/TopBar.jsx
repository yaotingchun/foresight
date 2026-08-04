import { Zap } from 'lucide-react'
import SearchInput from './SearchInput'
import IconButton from './IconButton'
import ProfileBlock from './ProfileBlock'
import { useSimulation } from '../context/SimulationContext'
import NotificationDropdown from './NotificationDropdown'

export default function TopBar() {
  const { openDrawer, activeRun } = useSimulation()

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-line/50 bg-white px-6">
      <SearchInput />

      <div className="ml-auto flex items-center gap-4">
        <button
          type="button"
          onClick={openDrawer}
          className="flex items-center gap-1.5 rounded-lg border border-brand-hover/30 bg-brand-tint px-3 py-1.5
                     text-xs font-semibold text-brand transition-colors hover:bg-brand-tint/80"
        >
          <Zap size={13} className={activeRun ? 'animate-pulse' : ''} />
          Simulate Event
        </button>
        <NotificationDropdown />
        <ProfileBlock />
      </div>
    </header>
  )
}
