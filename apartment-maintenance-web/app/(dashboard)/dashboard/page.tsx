'use client'
import { useEffect, useState } from 'react'
import {
  Building2, Users, Home, Wallet, AlertCircle, TrendingDown, PiggyBank, MessageSquareWarning,
  ArrowUpRight, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/shared/stats-card'
import { OverviewChart } from '@/components/dashboard/overview-chart'
import { ComplaintsChart } from '@/components/dashboard/complaints-chart'
import { BillingStatusBadge, ComplaintStatusBadge, PriorityBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { useAppStore } from '@/store'
import { reportsAPI } from '@/lib/api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function DashboardPage() {
  const { payments, complaints, flats, fetchFlats, fetchExpenses, fetchPayments, fetchComplaints, fetchProfile } = useAppStore()

  const [financialStats, setFinancialStats] = useState({ totalCollected: 0, totalExpenses: 0, netBalance: 0, totalBilled: 0 })
  const [overviewChartData, setOverviewChartData] = useState<{ month: string; collections: number; expenses: number }[]>([])
  const [complaintsChartData, setComplaintsChartData] = useState<{ _id: string; count: number }[]>([])

  useEffect(() => {
    fetchFlats()
    fetchExpenses()
    fetchPayments()
    fetchComplaints()
    fetchProfile()

    reportsAPI.financial().then((r) => {
      if (r?.data) setFinancialStats(r.data)
    }).catch(() => {})

    Promise.all([reportsAPI.collections(), reportsAPI.expenses()]).then(([cols, exps]) => {
      const monthly = cols?.data?.monthly || []
      const expMonthly = exps?.data?.monthly || []
      const merged = monthly.map((item: any) => {
        const [y, m] = item._id.split('-').map(Number)
        const expEntry = expMonthly.find((e: any) => e._id.year === y && e._id.month === m)
        return { month: MONTHS[m - 1], collections: item.totalCollected || 0, expenses: expEntry?.total || 0 }
      })
      setOverviewChartData(merged)
    }).catch(() => {})

    reportsAPI.complaints().then((r) => {
      if (r?.data?.byStatus) setComplaintsChartData(r.data.byStatus)
    }).catch(() => {})
  }, [fetchFlats, fetchExpenses, fetchPayments, fetchComplaints, fetchProfile])

  const recentPayments = payments.slice(0, 5)
  const pendingComplaints = complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').slice(0, 5)

  const stats = {
    totalFlats: flats.length,
    occupiedFlats: flats.filter((f) => (f as any).status === 'occupied' || (f as any).occupancyStatus === 'occupied').length,
    vacantFlats: flats.filter((f) => (f as any).status === 'vacant' || (f as any).occupancyStatus === 'vacant').length,
    openComplaints: complaints.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length,
    totalCollections: financialStats.totalCollected,
    pendingDues: Math.max(0, financialStats.totalBilled - financialStats.totalCollected),
    totalExpenses: financialStats.totalExpenses,
    remainingBalance: financialStats.netBalance,
  }

  // Build recent activity from real payments + complaints
  const activityItems = [
    ...payments.slice(0, 3).map((p: any) => ({
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
      title: `Payment received from ${p.flatNumber}`,
      sub: `${p.ownerName} paid ${formatCurrency(p.paidAmount)} for ${formatMonth(p.billingMonth)}`,
      time: p.paymentDate || p.createdAt || '',
    })),
    ...complaints.filter((c: any) => c.status !== 'resolved').slice(0, 2).map((c: any) => ({
      icon: c.priority === 'high' || c.priority === 'emergency' ? AlertTriangle : Clock,
      color: c.priority === 'high' || c.priority === 'emergency' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50',
      title: `Complaint filed — ${c.category}`,
      sub: `${(c.description || '').slice(0, 60)}${c.description?.length > 60 ? '…' : ''} · ${c.flatNumber}`,
      time: c.createdAt || c.date || '',
    })),
  ]
    .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back! Here&apos;s what&apos;s happening at your apartment.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total Flats" value={stats.totalFlats} subtitle="Registered units" icon={Building2} iconClassName="bg-indigo-50 text-indigo-600" />
        <StatsCard
          title="Occupied"
          value={stats.occupiedFlats}
          subtitle={`${stats.totalFlats > 0 ? Math.round((stats.occupiedFlats / stats.totalFlats) * 100) : 0}% occupancy`}
          icon={Home}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
        <StatsCard title="Vacant" value={stats.vacantFlats} subtitle="Available units" icon={Building2} iconClassName="bg-slate-100 text-slate-500" />
        <StatsCard title="Open Complaints" value={stats.openComplaints} subtitle="Needs attention" icon={MessageSquareWarning} iconClassName="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total Collections" value={formatCurrency(stats.totalCollections)} subtitle="All time" icon={Wallet} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Pending Dues" value={formatCurrency(stats.pendingDues)} subtitle="Uncollected" icon={AlertCircle} iconClassName="bg-amber-50 text-amber-600" />
        <StatsCard title="Total Expenses" value={formatCurrency(stats.totalExpenses)} subtitle="All time" icon={TrendingDown} iconClassName="bg-orange-50 text-orange-600" />
        <StatsCard title="Balance" value={formatCurrency(stats.remainingBalance)} subtitle="Collections − Expenses" icon={PiggyBank} iconClassName="bg-indigo-50 text-indigo-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Collections vs Expenses</CardTitle>
            <CardDescription>Monthly overview</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-indigo-600" />
                <span className="text-xs text-slate-500">Collections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-xs text-slate-500">Expenses</span>
              </div>
            </div>
            <OverviewChart data={overviewChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Complaint Status</CardTitle>
            <CardDescription>Current breakdown</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <ComplaintsChart data={complaintsChartData} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest updates across the system</CardDescription>
          </CardHeader>
          <CardContent>
            {activityItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No recent activity</p>
            ) : (
              <ul className="space-y-4">
                {activityItems.map((activity, i) => {
                  const Icon = activity.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                        <p className="text-xs text-slate-500 truncate">{activity.sub}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{timeAgo(activity.time)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Pending Complaints */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Pending Complaints</CardTitle>
                <CardDescription>Open & in-progress issues</CardDescription>
              </div>
              <Badge variant="destructive">{pendingComplaints.length} open</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingComplaints.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No pending complaints</div>
            ) : (
              <div className="space-y-3">
                {pendingComplaints.map((complaint: any) => (
                  <div key={complaint._id || complaint.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-900">{complaint.flatNumber}</span>
                        <PriorityBadge priority={complaint.priority} />
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 truncate">{complaint.description}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatDate(complaint.date || complaint.createdAt)}</p>
                    </div>
                    <ComplaintStatusBadge status={complaint.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Payments</CardTitle>
              <CardDescription>Latest maintenance collections</CardDescription>
            </div>
            <a href="/collections" className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No payments recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500">Flat</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500">Owner</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500">Month</th>
                    <th className="pb-3 text-right text-xs font-semibold text-slate-500">Amount</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500 pl-4">Method</th>
                    <th className="pb-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentPayments.map((payment: any) => (
                    <tr key={payment._id || payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 font-medium text-slate-900">{payment.flatNumber}</td>
                      <td className="py-3 text-slate-600">{payment.ownerName}</td>
                      <td className="py-3 text-slate-500">{formatMonth(payment.billingMonth)}</td>
                      <td className="py-3 text-right font-semibold text-slate-900">{formatCurrency(payment.paidAmount)}</td>
                      <td className="py-3 pl-4">
                        <span className="capitalize text-slate-500">{(payment.paymentMethod || '').replace('_', ' ')}</span>
                      </td>
                      <td className="py-3">
                        <BillingStatusBadge status={payment.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
