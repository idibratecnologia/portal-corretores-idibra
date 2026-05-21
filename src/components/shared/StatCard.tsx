import { LucideIcon, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray'
  subtitle?: string
  trend?: number
}

const colorConfig = {
  green:  { icon: 'bg-gradient-to-br from-green-400 to-green-600',  border: 'stat-border-green',  trend: 'text-green-600 bg-green-50' },
  blue:   { icon: 'bg-gradient-to-br from-blue-400 to-blue-600',    border: 'stat-border-blue',   trend: 'text-blue-600 bg-blue-50'   },
  yellow: { icon: 'bg-gradient-to-br from-amber-400 to-amber-600',  border: 'stat-border-yellow', trend: 'text-amber-600 bg-amber-50'  },
  red:    { icon: 'bg-gradient-to-br from-red-400 to-red-600',      border: 'stat-border-red',    trend: 'text-red-600 bg-red-50'     },
  purple: { icon: 'bg-gradient-to-br from-violet-400 to-violet-600',border: 'stat-border-purple', trend: 'text-violet-600 bg-violet-50'},
  gray:   { icon: 'bg-gradient-to-br from-slate-400 to-slate-600',  border: 'stat-border-gray',   trend: 'text-slate-600 bg-slate-50' },
}

export function StatCard({ title, value, icon: Icon, color = 'green', subtitle, trend }: StatCardProps) {
  const cfg = colorConfig[color]

  return (
    <div className={cn('bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 card-hover border border-gray-100/80', cfg.border)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2.5 rounded-xl shadow-sm', cfg.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend !== undefined && (
          <span className={cn('flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full', cfg.trend)}>
            <TrendingUp className="w-3 h-3" />
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-gray-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}
