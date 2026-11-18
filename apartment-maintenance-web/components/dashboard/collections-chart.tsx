'use client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface CollectionsChartProps {
  data?: { month: string; collections?: number }[]
}

export function CollectionsChart({ data = [] }: CollectionsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="collectionsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={45}
        />
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px' }}
          formatter={(value) => [formatCurrency(Number(value)), 'Collections']}
        />
        <Area
          type="monotone"
          dataKey="collections"
          stroke="#4f46e5"
          strokeWidth={2}
          fill="url(#collectionsGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#4f46e5' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
