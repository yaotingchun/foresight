import { useState, useRef, useEffect, useMemo } from 'react'
import { Bell, CheckCircle2, ShieldAlert, X } from 'lucide-react'
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

  // Auto-appearing popup state & queue
  const [popupQueue, setPopupQueue] = useState([])
  const [currentPopup, setCurrentPopup] = useState(null)
  const seenNotifIdsRef = useRef(null)

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

  // Track initial notifications so pre-existing ones don't trigger popups on load,
  // but any NEW notifications added dynamically during session are enqueued for auto-popup.
  useEffect(() => {
    if (!seenNotifIdsRef.current) {
      seenNotifIdsRef.current = new Set(notifications.map((n) => n.id))
      return
    }

    const newNotifs = []
    notifications.forEach((n) => {
      if (!seenNotifIdsRef.current.has(n.id)) {
        seenNotifIdsRef.current.add(n.id)
        newNotifs.push(n)
      }
    })

    if (newNotifs.length > 0) {
      setPopupQueue((prev) => [...prev, ...newNotifs])
    }
  }, [notifications])

  // Process popup queue sequentially (one item at a time)
  useEffect(() => {
    if (currentPopup || popupQueue.length === 0) return

    const next = popupQueue[0]
    setCurrentPopup(next)
    setPopupQueue((prev) => prev.slice(1))
  }, [popupQueue, currentPopup])

  // Auto-dismiss current popup after 5.5 seconds
  useEffect(() => {
    if (!currentPopup) return
    const timer = setTimeout(() => {
      setCurrentPopup(null)
    }, 5500)
    return () => clearTimeout(timer)
  }, [currentPopup])

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
    setCurrentPopup(null)
    navigate(`/incidents/${n.incidentId}`)
  }

  const handleToggleOpen = () => {
    setIsOpen((v) => {
      const nextOpen = !v
      if (nextOpen) {
        // Full panel takes over the spot when opened
        setCurrentPopup(null)
      }
      return nextOpen
    })
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
        onClick={handleToggleOpen}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
          isOpen ? 'bg-brand-tint text-[#047857]' : 'text-ink-soft hover:bg-brand-hover hover:text-[#047857]'
        }`}
      >
        <Bell size={20} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-red px-1 text-[10px] font-semibold text-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Auto-Appearing Single-Item Popup (shown at same location when full dropdown is closed) */}
      {!isOpen && currentPopup && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl border border-line bg-white shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-line bg-slate-50/50 px-4 py-3 shrink-0">
            <h3 className="text-[13px] font-bold text-ink uppercase tracking-widest">NOTIFICATIONS</h3>
            <button
              type="button"
              onClick={() => setCurrentPopup(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close notification"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={() => handleNotifClick(currentPopup)}
              className="flex items-start gap-3 w-full text-left p-3 rounded-lg bg-indigo-50/30 hover:bg-indigo-50 border border-indigo-100/50 transition-colors group"
            >
              <div className={`mt-0.5 shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                currentPopup.type === 'remediation' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {currentPopup.type === 'remediation' ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-[13px] font-bold text-indigo-950 truncate group-hover:text-indigo-600 transition-colors">
                    {currentPopup.title}
                  </p>
                  <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{fmtTime(currentPopup.timestamp)}</span>
                </div>
                <p className="text-[12px] text-slate-700 line-clamp-2">
                  {currentPopup.message}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Full Notification Panel (opened when user clicks bell icon) */}
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
