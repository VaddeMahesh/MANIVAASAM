'use client'
import { useEffect } from 'react'
import { Bell, Check, CheckCheck, CreditCard, MessageSquare, Megaphone, Clock, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/page-header'
import { useAppStore } from '@/store'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  payment: { icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  complaint: { icon: MessageSquare, color: 'text-red-600', bg: 'bg-red-100' },
  announcement: { icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-100' },
  reminder: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  system: { icon: Info, color: 'text-slate-600', bg: 'bg-slate-100' },
}

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markNotificationRead, markAllNotificationsRead } = useAppStore()
  const unread = notifications.filter((n) => !(n as any).isRead && !n.read)

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Notifications" description={`${unread.length} unread notifications`}>
        {unread.length > 0 && (
          <Button variant="outline" onClick={markAllNotificationsRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </PageHeader>

      {/* Unread section */}
      {unread.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Unread</p>
          {unread.map((notification) => {
            const { icon: Icon, color, bg } = typeConfig[notification.type]
            return (
              <Card key={notification.id} className="border-indigo-100 bg-indigo-50/30 hover:shadow-md transition-shadow cursor-pointer" onClick={() => markNotificationRead(notification.id)}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{notification.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1" />
                        <span className="text-xs text-slate-400">{formatDate(notification.timestamp)}</span>
                      </div>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600">{notification.message}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Read section */}
      {notifications.filter((n) => n.read).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">Earlier</p>
          {notifications.filter((n) => n.read).map((notification) => {
            const { icon: Icon, color, bg } = typeConfig[notification.type]
            return (
              <Card key={notification.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full opacity-60', bg)}>
                    <Icon className={cn('h-5 w-5', color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-700">{notification.title}</p>
                      <span className="text-xs text-slate-400 shrink-0">{formatDate(notification.timestamp)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{notification.message}</p>
                  </div>
                  <Check className="h-4 w-4 text-slate-300 shrink-0 mt-0.5" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {notifications.length === 0 && (
        <div className="flex flex-col items-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-4">
            <Bell className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-900">All caught up!</p>
          <p className="text-sm text-slate-500">No notifications at this time.</p>
        </div>
      )}
    </div>
  )
}
