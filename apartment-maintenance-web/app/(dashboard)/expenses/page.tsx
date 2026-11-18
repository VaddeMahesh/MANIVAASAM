'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, MoreVertical, TrendingDown, Zap, Droplets, Wrench, ShieldCheck, Trash2, MoreHorizontal, Edit, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { ExpenseStatusBadge } from '@/components/shared/status-badge'
import { StatsCard } from '@/components/shared/stats-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { reportsAPI } from '@/lib/api'
import type { Expense, ExpenseCategory, ExpenseStatus, ExpensePaidBy } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const categoryConfig: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  electricity: { label: 'Electricity', color: 'bg-yellow-100 text-yellow-700', icon: Zap },
  water:       { label: 'Water',       color: 'bg-blue-100 text-blue-700',    icon: Droplets },
  repairs:     { label: 'Repairs',     color: 'bg-orange-100 text-orange-700', icon: Wrench },
  maintenance: { label: 'Maintenance', color: 'bg-indigo-100 text-indigo-700', icon: Wrench },
  security:    { label: 'Security',    color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck },
  cleaning:    { label: 'Cleaning',    color: 'bg-purple-100 text-purple-700', icon: Trash2 },
  other:       { label: 'Other',       color: 'bg-slate-100 text-slate-700',   icon: MoreHorizontal },
}

const emptyForm = { category: 'electricity' as ExpenseCategory, description: '', amount: '', date: '', status: true, paidBy: 'apartment' as ExpensePaidBy, remarks: '' }

export default function ExpensesPage() {
  const { expenses, addExpense, updateExpense, deleteExpense, fetchExpenses } = useAppStore()
  const { toast } = useToast()

  const [expenseChartData, setExpenseChartData] = useState<{ month: string; expenses: number }[]>([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  useEffect(() => {
    fetchExpenses()
    reportsAPI.expenses().then((r) => {
      const monthly = r?.data?.monthly || []
      setExpenseChartData(
        monthly.map((item: any) => ({
          month: MONTHS[(item._id?.month ?? 1) - 1],
          expenses: item.total || 0,
        }))
      )
    }).catch(() => {})
  }, [fetchExpenses])

  // Add / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  // Delete confirm dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteTarget = expenses.find((e) => e.id === deleteId)

  const filtered = expenses.filter((e) => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter
    return matchSearch && matchCat
  })

  const totalExpenses = expenses.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amount, 0)
  const unpaid = expenses.filter((e) => e.status === 'unpaid').reduce((s, e) => s + e.amount, 0)
  const thisMonth = expenses.filter((e) => e.date.startsWith('2026-05')).reduce((s, e) => s + e.amount, 0)

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditingId(expense.id)
    setForm({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      status: expense.status === 'paid',
      paidBy: expense.paidBy || 'apartment',
      remarks: expense.remarks || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }
    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      status: (form.status ? 'paid' : 'unpaid') as ExpenseStatus,
      paidBy: form.paidBy,
      remarks: form.remarks || undefined,
    }
    try {
      if (editingId) {
        await updateExpense(editingId, payload)
        toast({ title: 'Expense updated', description: `"${form.description}" has been updated.`, variant: 'success' })
      } else {
        await addExpense({ ...payload, id: '' })
        toast({ title: 'Expense added', description: `"${form.description}" has been recorded.`, variant: 'success' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Save failed', description: 'Could not save expense. Please try again.', variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!deleteId) return
    const expense = expenses.find((e) => e.id === deleteId || (e as { _id?: string })._id === deleteId)
    try {
      await deleteExpense(deleteId)
      toast({ title: 'Expense deleted', description: `"${expense?.description}" has been removed.` })
    } catch {
      toast({ title: 'Delete failed', description: 'Could not delete expense. Please try again.', variant: 'destructive' })
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Expenses" description="Track all apartment expenses">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatsCard title="Total Paid Expenses" value={formatCurrency(totalExpenses)} icon={TrendingDown} iconClassName="bg-red-50 text-red-600" />
        <StatsCard title="This Month" value={formatCurrency(thisMonth)} icon={TrendingDown} iconClassName="bg-orange-50 text-orange-600" />
        <StatsCard title="Pending Payment" value={formatCurrency(unpaid)} icon={TrendingDown} iconClassName="bg-amber-50 text-amber-600" />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly Expense Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expenseChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(v) => [formatCurrency(Number(v)), 'Expenses']} />
              <Bar dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(categoryConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={TrendingDown} title="No expenses found" description="Add your first expense record." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Category', 'Description', 'Amount', 'Date', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((expense) => {
                    const cat = categoryConfig[expense.category] || categoryConfig.other
                    const Icon = cat.icon
                    return (
                      <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${cat.color}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-medium text-slate-700">{cat.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate">{expense.description}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{formatCurrency(expense.amount)}</td>
                        <td className="px-4 py-3.5 text-slate-600">{formatDate(expense.date)}</td>
                        <td className="px-4 py-3.5"><ExpenseStatusBadge status={expense.status} /></td>
                        <td className="px-4 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(expense)}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeleteId(expense.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as ExpenseCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Input placeholder="Brief description of expense" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Amount (₹) <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Paid By</Label>
              <Select value={form.paidBy} onValueChange={(v) => setForm((p) => ({ ...p, paidBy: v as ExpensePaidBy }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="flat_owner">Flat Owner</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.status} onCheckedChange={(v) => setForm((p) => ({ ...p, status: v })) } />
              <Label className="font-normal">{form.status ? 'Paid' : 'Unpaid'}</Label>
            </div>
            <div className="space-y-1.5">
              <Label>Remarks <span className="text-slate-400">(optional)</span></Label>
              <Textarea placeholder="Any additional notes..." rows={2} value={form.remarks} onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Expense'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />Delete Expense
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.description}"</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
