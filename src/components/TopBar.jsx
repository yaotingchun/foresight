import { Bell, MessageSquare, HelpCircle } from 'lucide-react'
import SearchInput from './SearchInput'
import IconButton from './IconButton'
import ProfileBlock from './ProfileBlock'

export default function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-line bg-card px-6">
      <SearchInput />

      <div className="ml-auto flex items-center gap-4">
        <IconButton icon={Bell} badge={12} label="Notifications" />
        <IconButton icon={MessageSquare} label="Messages" />
        <IconButton icon={HelpCircle} label="Help" />
        <ProfileBlock />
      </div>
    </header>
  )
}
