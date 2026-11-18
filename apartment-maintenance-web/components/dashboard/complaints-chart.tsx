'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  open: '#ef4444',
  assigned: '#f59e0b',
  in_progress: '#3b82f6',
  resolved: '#10b981',
  closed: '#94a3b8',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

interface ComplaintsChartProps {
  data?: { _id: string; count: number }[]
}

export function ComplaintsChart({ data = [] }: ComplaintsChartProps) {
  const chartData = data.map((d) => ({
    name: STATUS_LABELS[d._id] || d._id,
    value: d.count,
    color: STATUS_COLORS[d._id] || '#94a3b8',
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
        No complaint data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          formatter={(value) => [Number(value), 'Complaints']}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: '12px', color: '#64748b' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
