'use client'
import { useState, useEffect } from 'react'
import { Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { BillingStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/utils'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import { reportsAPI } from '@/lib/api'
import { useAppStore } from '@/store'

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#94a3b8']
const STATUS_COLORS: Record<string, string> = { paid: '#10b981', pending: '#f59e0b', partial: '#3b82f6', overdue: '#ef4444' }
const PRIORITY_COLORS: Record<string, string> = { low: '#94a3b8', medium: '#f59e0b', high: '#ef4444', emergency: '#7c3aed' }

export default function ReportsPage() {
  const { authToken } = useAppStore()
  const [year, setYear] = useState(String(new Date().getFullYear()))

  const [financial, setFinancial] = useState<any>(null)
  const [collections, setCollections] = useState<any>(null)
  const [expensesData, setExpensesData] = useState<any>(null)
  const [complaintsData, setComplaintsData] = useState<any>(null)
  const [occupancy, setOccupancy] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authToken) return
    loadAll()
  }, [year, authToken])

  async function loadAll() {
    setLoading(true)
    try {
      const [fin, col, exp, comp, occ] = await Promise.allSettled([
        reportsAPI.financial(Number(year)),
        reportsAPI.collections(),
        reportsAPI.expenses(Number(year)),
        reportsAPI.complaints(),
        reportsAPI.occupancy(),
      ])
      if (fin.status === 'fulfilled') setFinancial(fin.value?.data)
      if (col.status === 'fulfilled') setCollections(col.value?.data)
      if (exp.status === 'fulfilled') setExpensesData(exp.value?.data)
      if (comp.status === 'fulfilled') setComplaintsData(comp.value?.data)
      if (occ.status === 'fulfilled') setOccupancy(occ.value?.data)
    } finally {
      setLoading(false)
    }
  }

  const collectionStatusData = (collections?.statusBreakdown || []).map((s: any) => ({
    name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1) || s._id,
    value: s.count,
    fill: STATUS_COLORS[s._id] || '#94a3b8'
  }))

  const expByCategoryData = (expensesData?.byCategory || []).map((e: any) => ({
    name: e._id?.charAt(0).toUpperCase() + e._id?.slice(1) || e._id,
    value: e.total
  }))

  const monthlyCollections = (collections?.monthly || []).map((m: any) => ({
    month: m._id,
    collections: m.totalCollected,
    expenses: 0
  }))

  const monthlyExpenses = (expensesData?.monthly || []).map((m: any) => ({
    month: `${m._id?.year}-${String(m._id?.month).padStart(2, '0')}`,
    expenses: m.total
  }))

  // Merge collections and expenses by month
  const monthlyData = (() => {
    const map: Record<string, any> = {}
    monthlyCollections.forEach((m: any) => { map[m.month] = { ...map[m.month], month: m.month, collections: m.collections } })
    monthlyExpenses.forEach((m: any) => { map[m.month] = { ...map[m.month], month: m.month, expenses: m.expenses } })
    return Object.values(map).sort((a: any, b: any) => a.month.localeCompare(b.month))
  })()

  const complaintsByStatus = (complaintsData?.byStatus || []).map((s: any) => ({
    name: s._id?.replace('_', ' '),
    value: s.count
  }))

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" description="Comprehensive financial and operational reports">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2026, 2025, 2024].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <Button>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      {loading && (
        <div className="text-center py-8 text-slate-400">Loading report data...</div>
      )}

      <Tabs defaultValue="financial">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
        </TabsList>

        {/* Financial Report */}
        <TabsContent value="financial" className="mt-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Collected', value: formatCurrency(financial?.totalCollected || 0), color: 'text-emerald-600' },
              { label: 'Total Expenses', value: formatCurrency(financial?.totalExpenses || 0), color: 'text-red-600' },
              { label: 'Net Balance', value: formatCurrency(financial?.netBalance || 0), color: 'text-indigo-600' },
            ].map((item) => (
              <Card key={item.label} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-slate-400 mt-1">FY {year}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {monthlyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Collections vs Expenses — Monthly</CardTitle>
                <CardDescription>{year} comparison</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="rCollectGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rExpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(v, n) => [formatCurrency(Number(v)), n === 'collections' ? 'Collections' : 'Expenses']} />
                    <Legend formatter={(v) => <span style={{ fontSize: 12, color: '#64748b' }}>{v === 'collections' ? 'Collections' : 'Expenses'}</span>} />
                    <Area type="monotone" dataKey="collections" stroke="#4f46e5" strokeWidth={2} fill="url(#rCollectGrad)" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#rExpGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Collections Report */}
        <TabsContent value="collections" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Payment Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {collectionStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={collectionStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {collectionStatusData.map((entry: any, i: number) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-400">No data available</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Collections</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyCollections.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyCollections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v)), 'Collected']} />
                      <Bar dataKey="collections" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-400">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Expenses Report */}
        <TabsContent value="expenses" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {expByCategoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={expByCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {expByCategoryData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v))]} />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: '#64748b' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-400">No data available</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Expense Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyExpenses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyExpenses}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={40} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v)), 'Expenses']} />
                      <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-400">No data available</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Complaints Report */}
        <TabsContent value="complaints" className="mt-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: 'Total Complaints', value: complaintsData?.total || 0 },
              { label: 'Resolved', value: (complaintsData?.byStatus || []).filter((s: any) => s._id === 'resolved' || s._id === 'closed').reduce((sum: number, s: any) => sum + s.count, 0) },
              { label: 'Open', value: (complaintsData?.byStatus || []).find((s: any) => s._id === 'open')?.count || 0 },
              { label: 'Emergency', value: (complaintsData?.byPriority || []).find((s: any) => s._id === 'emergency')?.count || 0 },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-5 text-center">
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {complaintsByStatus.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Complaints by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={complaintsByStatus} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Occupancy Report */}
        <TabsContent value="occupancy" className="mt-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Flats', value: occupancy?.total || 0, color: 'text-slate-900' },
              { label: 'Occupied', value: (occupancy?.byStatus || []).find((s: any) => s._id === 'occupied')?.count || 0, color: 'text-emerald-600' },
              { label: 'Vacant', value: (occupancy?.byStatus || []).find((s: any) => s._id === 'vacant')?.count || 0, color: 'text-amber-600' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  {occupancy?.total > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{Math.round((Number(stat.value) / (occupancy?.total || 1)) * 100)}% of total</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {(occupancy?.byType || []).length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Owner vs Rented</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {(occupancy?.byType || []).map((t: any) => (
                    <div key={t._id} className="flex-1 rounded-xl bg-slate-50 p-4 text-center">
                      <p className="text-xs text-slate-500 capitalize">{t._id}</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{t.count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
