'use client'
import { useState, useEffect } from 'react'
import {
  Search, Plus, AlertTriangle, CreditCard, Send, ShieldCheck, Eye,
  CheckCircle2, Clock, TrendingUp, Wallet, X, Check, FileText, Ban
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/page-header'
import { BillingStatusBadge } from '@/components/shared/status-badge'
import { StatsCard } from '@/components/shared/stats-card'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function CollectionsPage() {
  const { toast } = useToast()
  const {
    payments,
    bills,
    pendingVerifications,
    fetchPayments,
    fetchBills,
    fetchPendingVerifications,
    verifyPayment,
    addPayment
  } = useAppStore()

  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([])

  // Record payment form state
  const [selectedBillId, setSelectedBillId] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Verification & screenshot modal state
  const [viewScreenshotModalOpen, setViewScreenshotModalOpen] = useState(false)
  const [activeProofUrl, setActiveProofUrl] = useState('')
  const [activeProofTitle, setActiveProofTitle] = useState('')

  // Reject confirmation dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectingPaymentId, setRejectingPaymentId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [processingVerify, setProcessingVerify] = useState(false)

  useEffect(() => {
    fetchPayments()
    fetchBills()
    fetchPendingVerifications()
  }, [])

  const filtered = payments.filter((p: any) => {
    const matchesSearch = !search || [p.flatNumber, p.ownerName, p.transactionId].some((v: string) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
    const matchesMethod = methodFilter === 'all' || p.paymentMethod === methodFilter
    return matchesSearch && matchesMethod
  })

  const totalCollected = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.paidAmount || 0), 0)
  const totalExpected = bills.reduce((s: number, b: any) => s + (b.amount || 0), 0)
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0
  const defaulters = bills.filter((b: any) => b.status === 'overdue' || b.status === 'pending')
  const pendingBills = bills.filter((b: any) => b.status === 'pending' || b.status === 'partial' || b.status === 'overdue')

  // Manual payment recording
  async function handleRecordPayment() {
    if (!selectedBillId || !paidAmount || !paymentMethod) return
    setSubmitting(true)
    try {
      await addPayment({ billId: selectedBillId, paidAmount: Number(paidAmount), paymentMethod, transactionId, remarks })
      await Promise.all([fetchPayments(), fetchBills()])
      setPaymentDialogOpen(false)
      setSelectedBillId(''); setPaidAmount(''); setPaymentMethod(''); setTransactionId(''); setRemarks('')
      toast({
        title: 'Payment Recorded',
        description: 'Payment was successfully recorded. The bill is updated and resident due is cleared.',
        variant: 'success',
      })
    } catch {
      toast({
        title: 'Failed to Record Payment',
        description: 'Could not record payment. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Admin approves payment after verifying screenshot
  async function handleApprove(paymentId: string, flatNumber: string, amount: number) {
    setProcessingVerify(true)
    try {
      await verifyPayment(paymentId, 'approve')
      toast({
        title: 'Payment Approved & Verified!',
        description: `Verified ₹${amount.toLocaleString('en-IN')} for Flat ${flatNumber}. Bill & flat dues updated.`,
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: 'Verification Failed',
        description: err instanceof Error ? err.message : 'Could not approve payment.',
        variant: 'destructive',
      })
    } finally {
      setProcessingVerify(false)
    }
  }

  // Open reject reason dialog
  function openRejectDialog(paymentId: string) {
    setRejectingPaymentId(paymentId)
    setRejectReason('Payment screenshot or UTR could not be verified with bank.')
    setRejectModalOpen(true)
  }

  // Confirm rejection
  async function handleConfirmReject() {
    if (!rejectingPaymentId) return
    setProcessingVerify(true)
    try {
      await verifyPayment(rejectingPaymentId, 'reject', rejectReason)
      setRejectModalOpen(false)
      toast({
        title: 'Payment Rejected',
        description: 'The payment proof was rejected. Resident will see the status update.',
        variant: 'destructive',
      })
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Could not reject payment.',
        variant: 'destructive',
      })
    } finally {
      setProcessingVerify(false)
    }
  }

  function handleOpenScreenshot(url: string, title: string) {
    setActiveProofUrl(url)
    setActiveProofTitle(title)
    setViewScreenshotModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Collections & Payment Verification" description="Track maintenance collections and verify resident payment screenshots">
        <Button onClick={() => setPaymentDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Record Direct Payment
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Total Collected" value={formatCurrency(totalCollected)} icon={Wallet} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Collection Rate" value={`${collectionRate}%`} icon={TrendingUp} iconClassName="bg-indigo-50 text-indigo-600" />
        <StatsCard
          title="Verifications Pending"
          value={String(pendingVerifications.length)}
          icon={ShieldCheck}
          iconClassName={pendingVerifications.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}
        />
        <StatsCard title="Pending / Defaulters" value={String(defaulters.length)} icon={Clock} iconClassName="bg-red-50 text-red-600" />
      </div>

      <Tabs defaultValue={pendingVerifications.length > 0 ? 'verifications' : 'all'}>
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="verifications" className="relative data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            Payment Verifications
            {pendingVerifications.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingVerifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            All Payments ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="defaulters" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            Defaulters ({defaulters.length})
          </TabsTrigger>
          <TabsTrigger value="trend" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Trend
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENDING PAYMENT VERIFICATIONS (SCREENSHOT REVIEWS) */}
        <TabsContent value="verifications" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-600" />
                    Resident Payment Proofs Awaiting Admin Verification
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Review uploaded UPI / bank transfer screenshots submitted by flat owners and tenants. Once approved, the bill is marked as paid.
                  </CardDescription>
                </div>
                {pendingVerifications.length > 0 && (
                  <Badge className="bg-amber-500 text-white font-bold text-xs">
                    {pendingVerifications.length} Pending Approval
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {pendingVerifications.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">All caught up! No pending payment verifications.</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When residents upload payment screenshots from their portal, they will appear here for you to verify and approve.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {pendingVerifications.map((p: any) => (
                    <div key={p._id} className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Screenshot Thumbnail with zoom click */}
                        {p.receiptUrl || p.proofUrl ? (
                          <div
                            onClick={() => handleOpenScreenshot(p.receiptUrl || p.proofUrl, `Flat ${p.flatNumber} - ${p.ownerName}`)}
                            className="relative group cursor-pointer shrink-0"
                            title="Click to view full screenshot"
                          >
                            <img
                              src={p.receiptUrl || p.proofUrl}
                              alt="Payment Screenshot Proof"
                              className="h-16 w-16 object-cover rounded-xl border border-slate-200 shadow-sm group-hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="h-4 w-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <CreditCard className="h-6 w-6" />
                          </div>
                        )}

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-slate-900">{p.flatNumber}</span>
                            <span className="text-sm font-semibold text-slate-700">— {p.ownerName}</span>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                              Verification Pending
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Month: <b className="text-slate-800">{formatMonth(p.billingMonth || '2026-10')}</b></span>
                            <span>Method: <b className="uppercase text-slate-800">{p.paymentMethod || 'UPI'}</b></span>
                            {p.transactionId && <span>Ref/UTR: <b className="font-mono text-slate-800">{p.transactionId}</b></span>}
                            <span>Submitted: {formatDate(p.paymentDate || p.createdAt)}</span>
                          </div>
                          {p.remarks && (
                            <p className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded inline-block">
                              Note: {p.remarks}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Amount and Approve / Reject buttons */}
                      <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="text-right">
                          <p className="text-lg font-extrabold text-emerald-700">
                            {formatCurrency(p.paidAmount)}
                          </p>
                          <span className="text-[11px] text-slate-400">Total Bill: {formatCurrency(p.totalAmount)}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {p.receiptUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenScreenshot(p.receiptUrl, `Payment Proof - Flat ${p.flatNumber}`)}
                              className="h-8 text-xs flex items-center gap-1 border-slate-200"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Proof
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => handleApprove(p._id, p.flatNumber, p.paidAmount)}
                            disabled={processingVerify}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openRejectDialog(p._id)}
                            disabled={processingVerify}
                            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ALL PAYMENTS */}
        <TabsContent value="all" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search flat, owner, UTR..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No payment records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        {['Flat', 'Owner', 'Month', 'Total Bill', 'Paid Amount', 'Balance', 'Date', 'Method', 'Screenshot Proof', 'Status'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((p: any) => (
                        <tr key={p._id || p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-900">{p.flatNumber}</td>
                          <td className="px-4 py-3.5 text-slate-700 font-medium">{p.ownerName}</td>
                          <td className="px-4 py-3.5 text-slate-600">{formatMonth(p.billingMonth)}</td>
                          <td className="px-4 py-3.5 font-medium text-slate-900">{formatCurrency(p.totalAmount)}</td>
                          <td className="px-4 py-3.5 text-emerald-700 font-bold">{formatCurrency(p.paidAmount)}</td>
                          <td className="px-4 py-3.5">
                            {(p.balanceAmount || 0) > 0 ? (
                              <span className="text-red-600 font-medium">{formatCurrency(p.balanceAmount)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600">{formatDate(p.paymentDate || p.createdAt)}</td>
                          <td className="px-4 py-3.5 uppercase text-slate-600 font-medium">{p.paymentMethod || 'UPI'}</td>
                          <td className="px-4 py-3.5">
                            {p.receiptUrl || p.proofUrl ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenScreenshot(p.receiptUrl || p.proofUrl, `Proof - Flat ${p.flatNumber}`)}
                                className="h-6 text-[10px] px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 flex items-center gap-1"
                              >
                                <Eye className="h-3 w-3" />
                                Screenshot
                              </Button>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            {p.status === 'pending_verification' ? (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Under Review
                              </Badge>
                            ) : p.status === 'rejected' ? (
                              <Badge className="bg-red-100 text-red-800 text-[10px] font-bold">
                                Rejected
                              </Badge>
                            ) : (
                              <BillingStatusBadge status={p.status} />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: DEFAULTERS */}
        <TabsContent value="defaulters" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">
                Pending &amp; Defaulter Flats ({defaulters.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {defaulters.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  All maintenance payments are up to date!
                </div>
              ) : (
                <div className="space-y-3">
                  {defaulters.map((bill: any) => (
                    <div key={bill._id || bill.id} className="flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{bill.flatNumber}</span>
                          <span className="text-slate-600 text-xs">— {bill.ownerName}</span>
                          <BillingStatusBadge status={bill.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {formatMonth(bill.billingMonth)} · Due: {formatDate(bill.dueDate)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-red-600">
                          {formatCurrency((bill.amount || 0) + (bill.penalty || 0) - (bill.paidAmount || 0))}
                        </p>
                        <p className="text-[10px] text-slate-400">outstanding</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: TREND */}
        <TabsContent value="trend" className="mt-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900">Monthly Collection Trend</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center text-xs text-slate-400 py-12">
                Overall Collection Target: {formatCurrency(totalExpected)} | Collected: {formatCurrency(totalCollected)} ({collectionRate}%)
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECORD PAYMENT DIALOG */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Direct Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Pending Bill <span className="text-red-500">*</span></Label>
              <Select value={selectedBillId} onValueChange={setSelectedBillId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select bill" /></SelectTrigger>
                <SelectContent>
                  {pendingBills.map((b: any) => (
                    <SelectItem key={b._id || b.id} value={b._id || b.id} className="text-xs">
                      {b.flatNumber} — {b.ownerName} ({formatMonth(b.billingMonth)}) — ₹{(b.amount || 0).toLocaleString('en-IN')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Amount Paid <span className="text-red-500">*</span></Label>
                <Input type="number" placeholder="3000" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Method <span className="text-red-500">*</span></Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transaction ID (optional)</Label>
              <Input placeholder="TXN123456" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks (optional)</Label>
              <Input placeholder="Any notes..." value={remarks} onChange={(e) => setRemarks(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button size="sm" onClick={handleRecordPayment} disabled={submitting || !selectedBillId || !paidAmount || !paymentMethod} className="bg-indigo-600 hover:bg-indigo-700">
              <CreditCard className="h-4 w-4" />
              {submitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FULL-SIZE SCREENSHOT VIEWER MODAL */}
      <Dialog open={viewScreenshotModalOpen} onOpenChange={setViewScreenshotModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-400" />
              {activeProofTitle || 'Payment Confirmation Screenshot'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setViewScreenshotModalOpen(false)} className="text-slate-400 hover:text-white p-1 h-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[75vh] overflow-auto">
            {activeProofUrl ? (
              <img src={activeProofUrl} alt="Payment Screenshot" className="max-h-[70vh] w-auto object-contain rounded shadow-lg border border-slate-800" />
            ) : (
              <p className="text-slate-500 text-xs py-8">No screenshot available</p>
            )}
          </div>
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setViewScreenshotModalOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REJECT CONFIRMATION MODAL */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Reject Payment Proof
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide a reason for rejecting this payment submission so the resident is notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs">Rejection Reason</Label>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. UTR number not found in bank statement"
              className="h-9 text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmReject} disabled={processingVerify} className="bg-red-600 hover:bg-red-700 text-white font-bold">
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
