import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconClassName?: string
  trend?: { value: string; positive: boolean }
  className?: string
}

export function StatsCard({ title, value, subtitle, icon: Icon, iconClassName, trend, className }: StatsCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{title}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
            {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
            {trend && (
              <p className={cn('mt-1 text-xs font-medium', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
                {trend.positive ? '↑' : '↓'} {trend.value}
              </p>
            )}
          </div>
          <div className={cn('ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconClassName || 'bg-indigo-50')}>
            <Icon className={cn('h-6 w-6', iconClassName ? '' : 'text-indigo-600')} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
