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
          className="flex items-center gap-1.5 rounded-lg border border-slate-900 bg-slate-900 px-3 py-1.5
                     text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-black hover:border-black cursor-pointer"
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
