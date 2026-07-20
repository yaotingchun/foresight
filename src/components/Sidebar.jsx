import Logo from './Logo'
import NavItem from './NavItem'
import { navItems } from '../config/navItems'

export default function Sidebar() {
  return (
    <aside className="flex h-full w-[230px] shrink-0 flex-col overflow-y-auto border-r border-line bg-card">
      <Logo />

      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {navItems.map(({ path, label, icon }) => (
          <NavItem key={path} to={path} label={label} icon={icon} />
        ))}
      </nav>
    </aside>
  )
}
