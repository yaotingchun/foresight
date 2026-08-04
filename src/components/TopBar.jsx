import SearchInput from './SearchInput'
import NotificationDropdown from './NotificationDropdown'
import ProfileBlock from './ProfileBlock'

export default function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-line/50 bg-white px-6">
      <SearchInput />

      <div className="ml-auto flex items-center gap-4">
        <NotificationDropdown />
        <ProfileBlock />
      </div>
    </header>
  )
}
