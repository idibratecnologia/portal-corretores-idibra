import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Users, Calendar, ClipboardList, CheckCircle, X, BellOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import type { NotifIcon } from '@/hooks/useNotifications'

const iconMap: Record<NotifIcon, React.ElementType> = {
  users:     Users,
  calendar:  Calendar,
  clipboard: ClipboardList,
  check:     CheckCircle,
  bell:      Bell,
}

const iconBg: Record<NotifIcon, string> = {
  users:     'bg-amber-50 text-amber-600',
  calendar:  'bg-blue-50 text-blue-600',
  clipboard: 'bg-green-50 text-green-600',
  check:     'bg-green-50 text-green-600',
  bell:      'bg-gray-50 text-gray-500',
}

export function NotificationBell() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const { notifications, unread, markRead, markAllRead } = useNotifications(
    (role as 'admin' | 'corretor') ?? 'corretor'
  )

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleOpen = () => setOpen((o) => !o)

  const handleClick = (id: string, href?: string) => {
    markRead(id)
    setOpen(false)
    if (href) navigate(href)
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={handleOpen}
        aria-label="Notificações"
        aria-expanded={open}
        className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-[18px] h-[18px]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-0.5 border border-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-gray-900">Notificações</p>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                  {unread} nova{unread > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-semibold text-green-700 hover:text-green-600 transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2.5 text-center px-4">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                <BellOff className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Nenhuma notificação</p>
              <p className="text-xs text-gray-400">Avisos de eventos e inscrições aparecerão aqui</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n) => {
                const Icon = iconMap[n.icon]
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n.id, n.href)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50',
                      !n.read && 'bg-green-50/40'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', iconBg[n.icon])}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn('text-xs leading-tight', n.read ? 'text-gray-700 font-medium' : 'text-gray-900 font-bold')}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium capitalize">{n.time}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={() => setOpen(false)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors w-full justify-center"
              >
                <X className="w-3 h-3" /> Fechar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
