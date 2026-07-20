import { NavLink } from 'react-router-dom'

export default function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
          isActive
            ? 'bg-status-indigo-tint font-semibold text-status-indigo'
            : 'font-medium text-ink-soft hover:bg-muted',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={1.75}
            className={isActive ? 'text-status-indigo' : 'text-ink-faint'}
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}
