'use client'
import { useState, useEffect } from 'react'
import { Receipt, Search, Eye, Edit, Download, Share2, MoreVertical, Plus, CalendarDays, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { BillingStatusBadge } from '@/components/shared/status-badge'
import { StatsCard } from '@/components/shared/stats-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ExcelUploadModal } from '@/components/billing/excel-upload-modal'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { Wallet, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { Bill, BillingStatus } from '@/types'

export default function BillingPage() {
  const { bills, fetchBills, updateBill, generateBills, addPayment } = useAppStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')

  // Upload Excel / Sheet dialog
  const [uploadOpen, setUploadOpen] = useState(false)

  // Generate Bills dialog
  const [generateOpen, setGenerateOpen] = useState(false)
  const [genMonth, setGenMonth] = useState('2026-06')
  const [genAmount, setGenAmount] = useState('3000')
  const [genDueDay, setGenDueDay] = useState('10')
  const [generating, setGenerating] = useState(false)

  // Edit Bill dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editPenalty, setEditPenalty] = useState('')
  const [editStatus, setEditStatus] = useState<BillingStatus>('pending')
  const [editDueDate, setEditDueDate] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [payTxnId, setPayTxnId] = useState('')
  const [payRemarks, setPayRemarks] = useState('')

  useEffect(() => {
    fetchBills()
  }, [])

  const months = [...new Set(bills.map((b: any) => b.billingMonth))].sort().reverse()

  const filtered = bills.filter((b: any) => {
    const matchSearch = !search || [b.flatNumber, b.ownerName].some((v: string) => v?.toLowerCase().includes(search.toLowerCase()))
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchMonth = monthFilter === 'all' || b.billingMonth === monthFilter
    return matchSearch && matchStatus && matchMonth
  })

  const totalExpected = bills.reduce((s: number, b: any) => s + (b.amount || 0) + (b.penalty || 0), 0)
  const totalCollected = bills.reduce((s: number, b: any) => s + (b.paidAmount || 0), 0)
  const pending = bills
    .filter((b: any) => ['pending', 'partial'].includes(b.status))
    .reduce((s: number, b: any) => s + (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0), 0)
  const overdue = bills.filter((b: any) => b.status === 'overdue').reduce((s: number, b: any) => s + (b.amount || 0) + (b.penalty || 0), 0)

  function openEdit(bill: Bill) {
    setEditingBill(bill)
    setEditAmount(String(bill.amount))
    setEditPenalty(String(bill.penalty))
    setEditStatus(bill.status)
    setEditDueDate(typeof bill.dueDate === 'string' ? bill.dueDate.split('T')[0] : '')
    setPayAmount('')
    setPayMethod('cash')
    setPayTxnId('')
    setPayRemarks('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editingBill) return
    const id = (editingBill as any)._id || editingBill.id
    try {
      await updateBill(id, {
        amount: Number(editAmount),
        penalty: Number(editPenalty),
        status: editStatus,
        dueDate: editDueDate,
      })
      if (Number(payAmount) > 0) {
        await addPayment({
          billId: id,
          paidAmount: Number(payAmount),
          paymentMethod: payMethod,
          transactionId: payTxnId || undefined,
          remarks: payRemarks || undefined,
        })
      }
      setEditOpen(false)
      toast({ title: 'Bill updated', description: `${editingBill.flatNumber} bill has been updated.`, variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update bill.', variant: 'destructive' })
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      // apartmentId comes from the authenticated admin's context — backend derives it from the JWT
      await generateBills({ billingMonth: genMonth, amount: Number(genAmount), dueDayOfMonth: Number(genDueDay) })
      setGenerateOpen(false)
      toast({ title: 'Bills generated', description: `Maintenance bills for ${formatMonth(genMonth)} have been generated.`, variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to generate bills.', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Maintenance Billing" description="Manage monthly maintenance bills for all flats">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setUploadOpen(true)}
            className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Upload Excel / Sheet
          </Button>
          <Button onClick={() => setGenerateOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate Bills
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Expected Collection" value={formatCurrency(totalExpected)} icon={Wallet} iconClassName="bg-indigo-50 text-indigo-600" />
        <StatsCard title="Total Collected" value={formatCurrency(totalCollected)} icon={CheckCircle2} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Pending Amount" value={formatCurrency(pending)} icon={Clock} iconClassName="bg-amber-50 text-amber-600" />
        <StatsCard title="Overdue Amount" value={formatCurrency(overdue)} icon={AlertCircle} iconClassName="bg-red-50 text-red-600" />
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search flat or owner..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filter month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map((m: any) => <SelectItem key={m} value={m}>{formatMonth(m)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Receipt} title="No bills found" description="No billing records match your filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Flat No.', 'Owner', 'Billing Month', 'Amount', 'Due Date', 'Paid', 'Penalty', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((bill: any) => (
                    <tr key={bill._id || bill.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{bill.flatNumber}</td>
                      <td className="px-4 py-3.5 text-slate-700">{bill.ownerName}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatMonth(bill.billingMonth)}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{formatCurrency(bill.amount)}</td>
                      <td className="px-4 py-3.5 text-slate-600">{formatDate(bill.dueDate)}</td>
                      <td className="px-4 py-3.5 font-medium text-emerald-700">{formatCurrency(bill.paidAmount)}</td>
                      <td className="px-4 py-3.5 text-red-600">{bill.penalty > 0 ? formatCurrency(bill.penalty) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5"><BillingStatusBadge status={bill.status} /></td>
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/billing/${bill._id || bill.id}`}><Eye className="mr-2 h-4 w-4" />View Bill</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(bill as Bill)}>
                              <Edit className="mr-2 h-4 w-4" />Edit Bill
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast({ title: 'Invoice downloaded', description: `Invoice for ${bill.flatNumber} — ${formatMonth(bill.billingMonth)}` })}>
                              <Download className="mr-2 h-4 w-4" />Download Invoice
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast({ title: 'Invoice shared', description: 'Invoice link copied to clipboard.' })}>
                              <Share2 className="mr-2 h-4 w-4" />Share Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Bills Dialog */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-indigo-600" />Generate Monthly Bills</DialogTitle>
            <DialogDescription>This will create maintenance bills for all active flats for the selected month.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Billing Month</Label>
              <Input type="month" value={genMonth} onChange={(e) => setGenMonth(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Maintenance Amount (₹)</Label>
                <Input type="number" value={genAmount} onChange={(e) => setGenAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Due Date (Day of month)</Label>
                <Select value={genDueDay} onValueChange={setGenDueDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((d) => <SelectItem key={d} value={String(d)}>{d}th</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700">
              Bills will be generated for all occupied flats for <strong>{formatMonth(genMonth) || 'selected month'}</strong> with an amount of <strong>₹{Number(genAmount).toLocaleString('en-IN')}</strong> each.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Bills'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill</DialogTitle>
            {editingBill && (
              <DialogDescription>{editingBill.flatNumber} — {formatMonth(editingBill.billingMonth)}</DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Bill Amount (₹)</Label>
                <Input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Penalty (₹)</Label>
                <Input type="number" value={editPenalty} onChange={(e) => setEditPenalty(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as BillingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Record Payment</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Amount (₹)</Label>
                  <Input type="number" placeholder="0" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction ID</Label>
                  <Input placeholder="Optional" value={payTxnId} onChange={(e) => setPayTxnId(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Remarks</Label>
                  <Input placeholder="Optional" value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excel / Water Sheet Upload & PDF Generator Modal */}
      <ExcelUploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => fetchBills()}
      />
    </div>
  )
}
