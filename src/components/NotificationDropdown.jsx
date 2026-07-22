import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell, CheckCircle2, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSimulation } from '../context/SimulationContext'

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return
      handler(event)
    }
    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)
    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}

const READ_STORAGE_KEY = 'foresight.read_notifications'

function getReadIds() {
  try {
    const data = localStorage.getItem(READ_STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveReadIds(ids) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

export default function NotificationDropdown() {
  const { incidents } = useSimulation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState(getReadIds)
  const dropdownRef = useRef(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  const notifications = useMemo(() => {
    const notifs = []
    incidents.forEach((inc) => {
      // 1. Incident Detected
      notifs.push({
        id: `inc-${inc.id}`,
        type: 'incident',
        incidentId: inc.id,
        title: 'New Incident Detected',
        message: inc.title,
        timestamp: inc.runStart,
      })

      // 2. Remediation waiting
      if (inc.aiAnalysis && inc.aiAnalysis.remediationPlan?.some(p => p.type === 'requires_approval')) {
        notifs.push({
          id: `rem-${inc.id}`,
          type: 'remediation',
          incidentId: inc.id,
          title: 'Approval Required',
          message: `Remediation plan ready for ${inc.title}`,
          timestamp: inc.runStart + 5000, // Approximate completion time for sorting
        })
      }
    })
    return notifs.sort((a, b) => b.timestamp - a.timestamp)
  }, [incidents])

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length

  const markAllRead = () => {
    const allIds = notifications.map(n => n.id)
    setReadIds(allIds)
    saveReadIds(allIds)
  }

  const handleNotifClick = (n) => {
    if (!readIds.includes(n.id)) {
      const newReadIds = [...readIds, n.id]
      setReadIds(newReadIds)
      saveReadIds(newReadIds)
    }
    setIsOpen(false)
    navigate(`/incidents/${n.incidentId}`)
  }

  const fmtTime = (ts) => {
    const diff = Math.floor((Date.now() - ts) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`
    return `${Math.floor(diff/3600)}h ago`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          isOpen ? 'bg-indigo-50 text-indigo-700' : 'text-ink-soft hover:bg-muted'
        }`}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-semibold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-line bg-white shadow-xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-line bg-slate-50/50 px-4 py-3 shrink-0">
            <h3 className="text-[13px] font-bold text-ink uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 flex flex-col gap-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-ink-faint">
                <Bell size={24} className="mb-2 opacity-20" />
                <p className="text-[12px]">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isRead = readIds.includes(n.id)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`flex items-start gap-3 w-full text-left p-3 rounded-lg transition-colors ${
                      isRead ? 'hover:bg-slate-50 opacity-70' : 'bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100/50'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      n.type === 'remediation' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {n.type === 'remediation' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-[13px] font-bold truncate ${isRead ? 'text-ink-soft' : 'text-indigo-950'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{fmtTime(n.timestamp)}</span>
                      </div>
                      <p className={`text-[12px] line-clamp-2 ${isRead ? 'text-slate-500' : 'text-slate-700'}`}>
                        {n.message}
                      </p>
                    </div>
                    {!isRead && (
                      <div className="shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-2 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
