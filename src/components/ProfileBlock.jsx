import { useState, useRef, useEffect } from 'react'
import { User, ChevronDown, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ProfileBlock() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef()

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
          <User size={18} strokeWidth={1.75} className="text-ink-faint" />
        </span>
        <span className="text-left leading-tight hidden sm:block">
          <span className="block text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block text-[11px] text-ink-faint">Administrator</span>
        </span>
        <ChevronDown size={16} strokeWidth={1.75} className="text-ink-faint" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-white/20 bg-white/70 p-1.5 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] backdrop-blur-xl animate-slide-fade z-50">
          <div className="px-3 py-2.5 border-b border-black/5 mb-1">
            <p className="text-sm font-bold text-ink truncate">{user.name}</p>
            <p className="text-xs text-ink-faint truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              setIsOpen(false)
              logout()
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
