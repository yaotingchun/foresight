import { NavLink } from 'react-router-dom'

export default function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'group flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
          isActive
            ? 'bg-brand-tint font-bold text-[#047857] text-brand-dark'
            : 'font-medium text-ink-soft hover:bg-brand-hover hover:text-[#047857] hover:text-brand-dark hover:font-bold',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={1.75}
            className={isActive ? 'text-[#047857] text-brand-dark' : 'text-ink-faint group-hover:text-[#047857] group-hover:text-brand-dark'}
          />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}
