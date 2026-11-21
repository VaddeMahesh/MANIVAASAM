'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building, LogOut, Receipt, CreditCard, Droplets, CheckCircle2,
  Clock, AlertCircle, Upload, Eye, X, FileText, ArrowRight, ShieldCheck,
  Calendar, Phone, User, Landmark, ChevronRight, Sparkles, RefreshCw, AlertTriangle, Check, MessageSquareWarning,
  QrCode, Smartphone, Zap, ExternalLink, Copy
} from 'lucide-react'
import { ResidentComplaints } from '@/components/resident/resident-complaints'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { bankAPI } from '@/lib/api'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'

export default function ResidentPortalPage() {
  const router = useRouter()
  const { toast } = useToast()
  const {
    isAuthenticated,
    userRole,
    residentProfile,
    residentFlatData,
    residentBills,
    residentPayments,
    fetchResidentData,
    submitResidentPayment,
    logout
  } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [showQrCode, setShowQrCode] = useState(false)

  // Payment submission form state
  const [selectedBillId, setSelectedBillId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('upi')
  const [transactionId, setTransactionId] = useState('')
  const [payRemarks, setPayRemarks] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [proofImageBase64, setProofImageBase64] = useState<string>('')
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)

  // Lightbox / screenshot viewer modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string>('')
  const [activeScreenshotTitle, setActiveScreenshotTitle] = useState<string>('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    loadData()
  }, [isAuthenticated])

  async function loadData() {
    setLoading(true)
    try {
      await fetchResidentData()
      const bRes = await bankAPI.get().catch(() => null)
      if (bRes?.data) setBankDetails(bRes.data)
    } catch {
      toast({
        title: 'Error Loading Data',
        description: 'Could not load your flat details. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleSignOut() {
    logout()
    router.push('/login')
  }

  // Calculate bills and pending amounts accurately
  const latestBill = residentBills[0] || residentFlatData?.latestBill

  // Outstanding balance on latest bill:
  const latestBillDue = latestBill && latestBill.status !== 'paid'
    ? Math.max(0, (latestBill.amount || 0) + (latestBill.penalty || 0) - (latestBill.paidAmount || 0))
    : 0

  // Filter bills that have an unpaid balance:
  const pendingBills = residentBills.filter(
    (b: any) => b.status !== 'paid' && Math.max(0, (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0)) > 0
  )

  // Net total due across all bills:
  const billsTotalDue = pendingBills.reduce((sum: number, b: any) => {
    return sum + Math.max(0, (b.amount || 0) + (b.penalty || 0) - (b.paidAmount || 0))
  }, 0)

  // Flat profile due (configured by admin in Flats Directory or backend pending total)
  const flatProfileDue = Number(
    residentFlatData?.pendingTotal ??
    residentFlatData?.flat?.dues?.pendingDueAmount ??
    residentFlatData?.flat?.dues?.totalDueAmount ??
    0
  )

  // If bills exist, use bills total due; otherwise fall back to flat profile due
  const totalDue = residentBills.length > 0 ? billsTotalDue : flatProfileDue

  const hasBills = Boolean(latestBill || residentBills.length > 0)
  const hasPendingDue = totalDue > 0

  // ONLY mark as paid if there were actual bills and they are paid / settled (totalDue === 0 and latestBill was paid)
  const isPaid = hasBills && Boolean(latestBill) && (latestBill.status === 'paid' || latestBillDue === 0) && totalDue === 0
  const isNoBills = !hasBills && totalDue === 0

  // Check if any payment is currently under verification
  const pendingVerificationPayment = residentPayments.find((p: any) => p.status === 'pending_verification')

  // Handle screenshot image upload
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (PNG, JPG, or WEBP).',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image size should be less than 8MB.',
        variant: 'destructive',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setProofImageBase64(base64)
      setScreenshotPreview(base64)
    }
    reader.readAsDataURL(file)
  }

  // Pre-load a sample receipt screenshot for instant testing
  function handleUseSampleScreenshot() {
    const canvas = document.createElement('canvas')
    canvas.width = 600
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, 600, 800)

      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      ctx.arc(300, 160, 50, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.moveTo(280, 160)
      ctx.lineTo(295, 175)
      ctx.lineTo(325, 145)
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Payment Successful', 300, 250)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '16px sans-serif'
      ctx.fillText('UPI Ref: UPI/' + Math.floor(100000000000 + Math.random() * 900000000000), 300, 280)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 42px sans-serif'
      ctx.fillText(`₹${Number(payAmount || totalDue || 0).toLocaleString('en-IN')}`, 300, 360)

      ctx.fillStyle = '#38bdf8'
      ctx.font = '18px sans-serif'
      ctx.fillText(`To: ${residentFlatData?.flat?.apartmentName || 'Apartment Society Maintenance'}`, 300, 420)

      ctx.fillStyle = '#64748b'
      ctx.font = '14px sans-serif'
      ctx.fillText(`Paid for Flat ${residentProfile?.flatNumber || 'A-104'} on ${new Date().toLocaleDateString()}`, 300, 460)

      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(80, 520)
      ctx.lineTo(520, 520)
      ctx.stroke()

      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 15px sans-serif'
      ctx.fillText('Google Pay / PhonePe Verified Screenshot Proof', 300, 570)
    }

    const dataUrl = canvas.toDataURL('image/png')
    setProofImageBase64(dataUrl)
    setScreenshotPreview(dataUrl)
    if (!transactionId) {
      setTransactionId(`UPI${Math.floor(1000000000 + Math.random() * 9000000000)}`)
    }
  }

  // Open payment submission modal prefilled with bill
  function openPaymentModal(bill?: any) {
    // If already marked as paid by admin or remaining balance is 0, do NOT allow payment!
    if (isPaid || totalDue === 0) {
      toast({
        title: 'Maintenance Already Paid',
        description: 'All dues for this flat have already been marked as Paid by the admin. Outstanding balance is ₹0.',
        variant: 'success',
      })
      return
    }

    if (pendingVerificationPayment) {
      toast({
        title: 'Payment Under Review',
        description: 'You have already submitted a payment screenshot which is awaiting admin verification.',
      })
      return
    }

    const targetBill = bill || pendingBills[0] || latestBill
    const billRemaining = targetBill
      ? Math.max(0, (targetBill.amount || 0) + (targetBill.penalty || 0) - (targetBill.paidAmount || 0))
      : totalDue

    if (targetBill?.status === 'paid' || billRemaining === 0) {
      toast({
        title: 'Bill Already Settled',
        description: 'This particular bill is already marked as Paid. Outstanding due is ₹0.',
        variant: 'success',
      })
      return
    }

    setSelectedBillId(targetBill?._id || targetBill?.id || '')
    setPayAmount(String(billRemaining))
    setProofImageBase64('')
    setScreenshotPreview(null)
    setPaymentModalOpen(true)
  }

  // Submit payment to backend for verification
  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault()

    if (isPaid || totalDue === 0) {
      toast({
        title: 'Payment Disallowed',
        description: 'This bill is already marked as Paid by the admin. Your due is ₹0.',
        variant: 'destructive',
      })
      setPaymentModalOpen(false)
      return
    }

    if (!payAmount || Number(payAmount) <= 0) {
      toast({
        title: 'Amount Required',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      })
      return
    }

    if (!transactionId && !proofImageBase64 && !screenshotPreview) {
      toast({
        title: 'Payment Details Required',
        description: 'Please enter your 12-digit UPI Ref/UTR number or upload a screenshot.',
        variant: 'destructive',
      })
      return
    }

    setSubmittingPayment(true)
    try {
      await submitResidentPayment({
        billId: selectedBillId || undefined,
        paidAmount: Number(payAmount),
        paymentMethod: payMethod,
        transactionId: transactionId || `TXN-${Date.now()}`,
        remarks: payRemarks,
        proofImage: proofImageBase64,
        paymentDate: payDate,
      })

      toast({
        title: 'Payment Proof Submitted!',
        description: 'Your payment screenshot has been sent to the society admin for verification.',
        variant: 'success',
      })

      setPaymentModalOpen(false)
      setActiveTab('payments')
    } catch (err) {
      toast({
        title: 'Submission Failed',
        description: err instanceof Error ? err.message : 'Could not submit payment proof.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingPayment(false)
    }
  }

  // Open full-screen screenshot preview
  function viewScreenshot(url: string, title: string) {
    setActiveScreenshotUrl(url)
    setActiveScreenshotTitle(title)
    setPreviewModalOpen(true)
  }

  // Dynamic UPI payment parameters
  const effectiveUpiId = bankDetails?.upiId || 'manivaasam@upi'
  const effectivePayeeName = residentFlatData?.flat?.apartmentName || residentProfile?.apartmentName || 'MANIVAASAM'
  const flatStr = residentProfile?.flatNumber || residentFlatData?.flat?.flatNumber || 'Flat'
  const currentMonthStr = formatMonth(latestBill?.billingMonth || '2026-10')
  const billPayAmount = payAmount || String(totalDue || '0')
  const upiTxnNote = `ManiVaasam ${flatStr} Maint ${currentMonthStr}`

  const upiParams = `pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent(effectivePayeeName)}&am=${encodeURIComponent(billPayAmount)}&tn=${encodeURIComponent(upiTxnNote)}&cu=INR`
  const genericUpiUrl = `upi://pay?${upiParams}`
  const gpayIntentUrl = `tez://upi/pay?${upiParams}`
  const phonepeIntentUrl = `phonepe://pay?${upiParams}`
  const paytmIntentUrl = `paytmmp://pay?${upiParams}`
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(genericUpiUrl)}`

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-base leading-tight">
                  {residentFlatData?.flat?.apartmentName || residentProfile?.apartmentName || 'MANIVAASAM'}
                </span>
                <Badge variant="outline" className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold uppercase">
                  Resident Portal
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Flat: <span className="text-indigo-600 font-bold">
                  {(residentFlatData?.flat?.societyCode || residentProfile?.societyCode) && (
                    <span className="font-mono">{residentFlatData?.flat?.societyCode || residentProfile?.societyCode} / </span>
                  )}
                  {residentProfile?.flatNumber || residentFlatData?.flat?.flatNumber || 'A-104'}
                </span> ({residentProfile?.role || 'Owner'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{residentProfile?.name || 'Resident'}</span>
              <span className="text-[11px] text-slate-500">{residentProfile?.email}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Verification Alert Banner (if payment pending admin review) */}
        {pendingVerificationPayment && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse-subtle">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-900">
                    Payment Screenshot Submitted — Verification in Progress
                  </h4>
                  <Badge className="bg-amber-500 text-white text-[10px]">Under Review</Badge>
                </div>
                <p className="text-xs text-amber-800/90 mt-0.5">
                  You submitted payment proof of <span className="font-bold">₹{pendingVerificationPayment.paidAmount?.toLocaleString('en-IN')}</span> via {pendingVerificationPayment.paymentMethod?.toUpperCase()} (Ref: {pendingVerificationPayment.transactionId || 'None'}). Admin will review the screenshot and confirm your receipt shortly.
                </p>
              </div>
            </div>
            {pendingVerificationPayment.receiptUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => viewScreenshot(pendingVerificationPayment.receiptUrl, 'Uploaded Payment Proof')}
                className="text-xs bg-white border-amber-300 text-amber-800 hover:bg-amber-100 flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Eye className="h-3.5 w-3.5" />
                View Screenshot
              </Button>
            )}
          </div>
        )}

        {/* Hero Card: Flat Status & Dues Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Main Dues Card */}
          <Card className={`md:col-span-2 border-indigo-100 shadow-md relative overflow-hidden text-white transition-all ${
            isPaid
              ? 'bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900'
              : hasPendingDue
              ? 'bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900'
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950'
          }`}>
            <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-20 bottom-0 translate-y-10 w-48 h-48 rounded-full bg-indigo-500/10 pointer-events-none" />

            <CardContent className="p-6 sm:p-8 relative z-10 flex flex-col justify-between h-full space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
                      {latestBill ? `Maintenance Bill · ${formatMonth(latestBill.billingMonth)}` : `Maintenance Account · Flat ${flatStr}`}
                    </span>
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Marked as Paid by Admin
                      </span>
                    ) : pendingVerificationPayment ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/25 text-amber-300 border border-amber-400/40">
                        <Clock className="h-4 w-4 text-amber-400" />
                        Verification Pending
                      </span>
                    ) : hasPendingDue ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/25 text-red-300 border border-red-400/40">
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        Payment Due
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Account Current · No Dues
                      </span>
                    )}
                  </div>

                  {/* Dynamic Outstanding Amount: Shows ₹0 when paid / no dues, or actual remaining balance */}
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                      {formatCurrency(totalDue)}
                    </h2>
                    {isPaid ? (
                      <span className="text-emerald-300 text-sm font-semibold">
                        (Remaining Due: ₹0)
                      </span>
                    ) : isNoBills ? (
                      <span className="text-emerald-300 text-sm font-semibold">
                        (No Pending Bills)
                      </span>
                    ) : null}
                  </div>

                  <p className="text-xs text-indigo-200 mt-1">
                    {isPaid
                      ? '✓ All maintenance dues are cleared. No payment required.'
                      : hasPendingDue
                      ? `Due Date: ${formatDate(latestBill?.dueDate || new Date())}`
                      : '✓ No outstanding balance or bills pending for this flat.'}
                  </p>
                </div>

                {/* Right CTA Button Area */}
                <div className="flex flex-col sm:items-end gap-2">
                  {isPaid ? (
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-sm shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span>All Dues Paid in Full</span>
                      </div>
                      <span className="text-[11px] text-emerald-200/90 font-medium">
                        Payment recorded by Admin · Due: ₹0
                      </span>
                    </div>
                  ) : pendingVerificationPayment ? (
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-sm shadow-sm">
                        <Clock className="h-5 w-5 text-amber-400" />
                        <span>Payment Under Review</span>
                      </div>
                      <span className="text-[11px] text-amber-200/90 font-medium">
                        Admin is reviewing your proof
                      </span>
                    </div>
                  ) : hasPendingDue ? (
                    <>
                      <Button
                        size="lg"
                        onClick={() => openPaymentModal(latestBill)}
                        className="bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 text-sm transition-all transform hover:scale-[1.02]"
                      >
                        <Zap className="h-4 w-4 text-amber-300" />
                        Pay Now (GPay / PhonePe / UPI)
                      </Button>
                      <p className="text-[11px] text-indigo-200/90 font-medium">
                        Instant 1-Tap UPI Apps &amp; Dynamic QR
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm shadow-sm">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span>No Payment Required</span>
                      </div>
                      <span className="text-[11px] text-indigo-200/80 font-medium">
                        Outstanding balance is ₹0
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Water Meter Stats Pill */}
              <div className="pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-indigo-300 block text-[11px]">Flat Unit</span>
                  <span className="font-bold text-white text-sm">{flatStr}</span>
                </div>
                <div>
                  <span className="text-indigo-300 block text-[11px]">Water Consumed</span>
                  <span className="font-bold text-white text-sm">
                    {latestBill ? `${(latestBill.waterUsed || 0).toLocaleString('en-IN')} L` : '0 L (Not billed)'}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-300 block text-[11px]">Tanker Charges</span>
                  <span className="font-bold text-white text-sm">
                    {latestBill ? formatCurrency((latestBill.breakdown?.manjeeraWaterAmt || 0) + (latestBill.breakdown?.pvtTankerAmt || 0)) : '₹0'}
                  </span>
                </div>
                <div>
                  <span className="text-indigo-300 block text-[11px]">Base Maint + HMWSSB</span>
                  <span className="font-bold text-white text-sm">
                    {latestBill ? formatCurrency((latestBill.breakdown?.commonMaintAmt || 0) + (latestBill.breakdown?.hmwssbBill || 0)) : '₹0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Flat Profile Summary Card */}
          <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-600" />
                Registered Resident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3.5 text-xs text-slate-600 flex-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400">Name</span>
                <span className="font-bold text-slate-900">{residentProfile?.name || 'Resident Name'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400">Flat Number</span>
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {flatStr}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400">Occupancy</span>
                <span className="capitalize font-semibold text-slate-700">{residentProfile?.role || 'Owner'}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-400">Email</span>
                <span className="font-medium text-slate-800 truncate max-w-[160px]">{residentProfile?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payment Status</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-600' : hasPendingDue ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isPaid
                    ? 'All Dues Cleared (₹0)'
                    : hasPendingDue
                    ? `Due: ${formatCurrency(totalDue)}`
                    : 'Account Current (₹0)'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Bills Breakdown vs Payments History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl">
            <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Receipt className="mr-1.5 h-3.5 w-3.5" />
              Current Bill &amp; Breakdown
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Payment History &amp; Receipts ({residentPayments.length})
            </TabsTrigger>
            <TabsTrigger value="complaints" className="text-xs data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <MessageSquareWarning className="mr-1.5 h-3.5 w-3.5" />
              Complaints
            </TabsTrigger>
          </TabsList>

          {/* TAB 3: Complaints raised by / against this flat */}
          <TabsContent value="complaints" className="space-y-4">
            <ResidentComplaints />
          </TabsContent>

          {/* TAB 1: Current Bill & Water Meter Breakdown */}
          <TabsContent value="overview" className="space-y-4">
            {!latestBill ? (
              hasPendingDue ? (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Outstanding Maintenance Balance
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Pending dues carried forward on Flat {flatStr}.
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openPaymentModal()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-300" />
                      Pay Now (UPI)
                    </Button>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="p-5 rounded-xl border border-red-200 bg-red-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-red-600 uppercase tracking-wider block mb-1">
                          Payment Due
                        </span>
                        <h3 className="text-2xl font-bold text-red-950">
                          {formatCurrency(totalDue)}
                        </h3>
                        <p className="text-xs text-red-700 mt-1">
                          Previous pending balance on record for Flat {flatStr}. A monthly water meter bill has not been itemized yet for this period.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openPaymentModal()}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-300" />
                        Clear Dues (Pay ₹{totalDue})
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <CardTitle className="text-base font-bold text-slate-900">
                      Monthly Maintenance Bill Breakdown
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Itemized details of base maintenance, municipal water, and individual meter readings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No Monthly Bills Published Yet</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      The society administration has not generated any maintenance or water bills for Flat {flatStr} yet. Your current balance is ₹0 with no dues pending.
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Monthly Maintenance Bill Breakdown · {formatMonth(latestBill.billingMonth)}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Itemized details of base maintenance, municipal water, and individual meter readings.
                    </CardDescription>
                  </div>

                  {!isPaid && !pendingVerificationPayment && (
                    <Button
                      size="sm"
                      onClick={() => openPaymentModal(latestBill)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5 text-amber-300" />
                      Pay Now (UPI)
                    </Button>
                  )}

                  {isPaid && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Bill Settled · ₹0 Due
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-0">
                  <div className="p-5 space-y-6">
                    {/* Meter Reading Highlight Box */}
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-700 block">Meter Start Reading</span>
                        <span className="text-base font-bold text-slate-900">
                          {latestBill.meterStart != null ? latestBill.meterStart.toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-700 block">Meter End Reading</span>
                        <span className="text-base font-bold text-slate-900">
                          {latestBill.meterEnd != null ? latestBill.meterEnd.toLocaleString('en-IN') : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-700 block">Multiplier</span>
                        <span className="text-base font-bold text-indigo-700">10x</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-700 block">Total Water Consumed</span>
                        <span className="text-base font-bold text-indigo-900">
                          {(latestBill.waterUsed || 0).toLocaleString('en-IN')} Liters
                        </span>
                      </div>
                    </div>

                    {/* Itemized Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-4 text-left font-semibold">Bill Component</th>
                            <th className="py-2.5 px-4 text-center font-semibold">Rule / Slab</th>
                            <th className="py-2.5 px-4 text-right font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              Common Area Maintenance
                              <span className="block text-[11px] text-slate-400 font-normal">Electricity, lift, security & cleaning</span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">Fixed monthly share</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">
                              {formatCurrency(latestBill.breakdown?.commonMaintAmt || 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              HMWSSB Water Supply
                              <span className="block text-[11px] text-slate-400 font-normal">Municipal water supply base charge</span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">Fixed share per flat</td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">
                              {formatCurrency(latestBill.breakdown?.hmwssbBill || 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              Manjeera Tanker Water
                              <span className="block text-[11px] text-slate-400 font-normal">Society tanker quota (up to cap)</span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">
                              {(latestBill.breakdown?.manjeeraWaterAmt || 0) > 0 ? 'Exemption slab rate' : 'No excess'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">
                              {formatCurrency(latestBill.breakdown?.manjeeraWaterAmt || 0)}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-medium text-slate-900">
                              Private Tanker Water
                              <span className="block text-[11px] text-slate-400 font-normal">Excess water usage above tanker cap</span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-500">
                              {(latestBill.breakdown?.pvtTankerAmt || 0) > 0 ? 'Excess usage rate' : 'No excess'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-slate-800">
                              {formatCurrency(latestBill.breakdown?.pvtTankerAmt || 0)}
                            </td>
                          </tr>

                          {/* Bill Total Generated Row */}
                          <tr className="bg-slate-50">
                            <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                              Total Bill Generated
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-500">
                              Due by {formatDate(latestBill.dueDate || new Date())}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                              {formatCurrency(latestBill.amount || 0)}
                            </td>
                          </tr>

                          {/* Deduct Paid Amount Row if payment recorded */}
                          {((latestBill.paidAmount || 0) > 0 || isPaid) && (
                            <tr className="bg-emerald-50/70 border-t border-emerald-100">
                              <td className="py-3 px-4 font-semibold text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span>Amount Paid (Recorded by Admin / Verified)</span>
                              </td>
                              <td className="py-3 px-4 text-center text-emerald-700 text-[11px] font-medium">
                                {isPaid ? 'Paid in Full' : 'Partial Payment Received'}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                                - {formatCurrency(isPaid ? (latestBill.amount || 0) : (latestBill.paidAmount || 0))}
                              </td>
                            </tr>
                          )}

                          {/* Net Due Row: Shows ₹0 when paid */}
                          <tr className={isPaid ? 'bg-emerald-100/50 text-emerald-900' : 'bg-indigo-50/50'}>
                            <td className="py-3.5 px-4 font-extrabold text-sm">
                              Remaining Net Due Amount
                            </td>
                            <td className="py-3.5 px-4 text-center font-medium">
                              {isPaid ? (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                                  Settled (₹0 Due)
                                </Badge>
                              ) : (
                                <span className="text-red-600 font-semibold text-xs">Payment Due</span>
                              )}
                            </td>
                            <td className={`py-3.5 px-4 text-right font-extrabold text-base ${isPaid ? 'text-emerald-700' : 'text-indigo-700'}`}>
                              {formatCurrency(latestBillDue)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Society Bank / UPI Payment Info */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Landmark className="h-4 w-4 text-indigo-600" />
                        Payment Status &amp; Policy
                      </div>
                      <p className="text-xs text-slate-600">
                        {isPaid ? (
                          <span className="text-emerald-700 font-medium">
                            ✓ All maintenance dues for this month have been marked as paid by the administrator. No further payment is required.
                          </span>
                        ) : (
                          'Please make the payment via UPI, Google Pay, PhonePe, or Net Banking. Once paid, click "Pay & Upload Screenshot" to submit your proof for admin verification.'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: Payment History & Screenshots */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Payment Receipts &amp; Verifications
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Track the status of all payments and uploaded screenshots for your flat.
                  </CardDescription>
                </div>

                {!isPaid && !pendingVerificationPayment && (
                  <Button
                    size="sm"
                    onClick={() => openPaymentModal(latestBill)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-300" />
                    Pay via UPI
                  </Button>
                )}

                {isPaid && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    All Dues Cleared
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0">
                {residentPayments.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No payment records found yet</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Whenever maintenance is recorded or you upload a screenshot, it will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4 text-left font-semibold">Date</th>
                          <th className="py-3 px-4 text-left font-semibold">Month</th>
                          <th className="py-3 px-4 text-right font-semibold">Amount Paid</th>
                          <th className="py-3 px-4 text-center font-semibold">Method</th>
                          <th className="py-3 px-4 text-center font-semibold">Transaction / UTR</th>
                          <th className="py-3 px-4 text-center font-semibold">Screenshot Proof</th>
                          <th className="py-3 px-4 text-right font-semibold">Verification Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {residentPayments.map((p: any) => {
                          const isVerified = p.status === 'paid'
                          const isPending = p.status === 'pending_verification'
                          const isRejected = p.status === 'rejected'

                          return (
                            <tr key={p._id || p.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-medium text-slate-800">
                                {formatDate(p.paymentDate || p.createdAt)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-600">
                                {formatMonth(p.billingMonth || '2026-10')}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                {formatCurrency(p.paidAmount)}
                              </td>
                              <td className="py-3.5 px-4 text-center uppercase font-medium text-slate-600">
                                {p.paymentMethod || 'UPI'}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-[11px] text-slate-500">
                                {p.transactionId || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {p.receiptUrl || p.proofUrl ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => viewScreenshot(p.receiptUrl || p.proofUrl, `Payment Proof - ${formatCurrency(p.paidAmount)}`)}
                                    className="h-7 text-[11px] border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1 mx-auto"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View Proof
                                  </Button>
                                ) : (
                                  <span className="text-slate-400">Direct Payment</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {isVerified && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3" /> Verified &amp; Paid
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                    <Clock className="h-3 w-3" /> Awaiting Admin Approval
                                  </span>
                                )}
                                {isRejected && (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 cursor-help"
                                    title={p.rejectionReason || 'Rejected by admin'}
                                  >
                                    <AlertTriangle className="h-3 w-3" /> Rejected
                                  </span>
                                )}
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
          </TabsContent>
        </Tabs>
      </main>

      {/* MODAL: Pay Maintenance & Upload Screenshot */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Zap className="h-5 w-5 text-indigo-600" />
              Pay Maintenance with UPI / GPay / PhonePe
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tap your preferred UPI app below to pay with zero fees, or scan the QR code. Then confirm your transaction UTR number to record it instantly.
            </DialogDescription>
          </DialogHeader>

          {isPaid ? (
            <div className="py-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Maintenance Already Paid</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Admin has already recorded and marked your payment as paid. Outstanding due is ₹0.
              </p>
              <Button size="sm" onClick={() => setPaymentModalOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmitPayment} className="space-y-4 py-1">
              {/* Flat & Bill Context */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Flat &amp; Month</span>
                  <span className="font-bold text-slate-900 text-sm">
                    Flat {flatStr} · {currentMonthStr}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Total Outstanding</span>
                  <span className="font-extrabold text-indigo-700 text-base">
                    {formatCurrency(Number(billPayAmount) || totalDue)}
                  </span>
                </div>
              </div>

              {/* STEP 1: ONE-TAP UPI APP LAUNCHER */}
              <div className="rounded-xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Step 1: Tap to Pay with UPI</h4>
                      <p className="text-[11px] text-slate-500">Amount &amp; Flat Note pre-filled automatically</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                    0% Fee
                  </Badge>
                </div>

                {/* 1-Tap App Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {/* Google Pay */}
                  <a
                    href={gpayIntentUrl}
                    onClick={() => setPayMethod('upi')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-center group shadow-xs"
                  >
                    <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs mb-1 group-hover:scale-110 transition-transform">
                      G
                    </div>
                    <span className="text-xs font-bold text-slate-800">Google Pay</span>
                    <span className="text-[10px] text-slate-400">1-Tap Pay</span>
                  </a>

                  {/* PhonePe */}
                  <a
                    href={phonepeIntentUrl}
                    onClick={() => setPayMethod('upi')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/30 transition-all text-center group shadow-xs"
                  >
                    <div className="h-7 w-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs mb-1 group-hover:scale-110 transition-transform">
                      P
                    </div>
                    <span className="text-xs font-bold text-slate-800">PhonePe</span>
                    <span className="text-[10px] text-slate-400">1-Tap Pay</span>
                  </a>

                  {/* Paytm */}
                  <a
                    href={paytmIntentUrl}
                    onClick={() => setPayMethod('upi')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50/30 transition-all text-center group shadow-xs"
                  >
                    <div className="h-7 w-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs mb-1 group-hover:scale-110 transition-transform">
                      ₹
                    </div>
                    <span className="text-xs font-bold text-slate-800">Paytm</span>
                    <span className="text-[10px] text-slate-400">1-Tap Pay</span>
                  </a>

                  {/* Any UPI App */}
                  <a
                    href={genericUpiUrl}
                    onClick={() => setPayMethod('upi')}
                    className="flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 transition-all text-center group shadow-xs"
                  >
                    <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mb-1 group-hover:scale-110 transition-transform">
                      <Smartphone className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-indigo-950">Any UPI</span>
                    <span className="text-[10px] text-indigo-600">BHIM / Cred</span>
                  </a>
                </div>

                {/* Scan QR Code Toggle */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 transition-colors"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    {showQrCode ? 'Hide QR Code' : 'Scan Dynamic QR Code (from Phone)'}
                  </button>
                  <span className="text-[11px] text-slate-500 font-mono">UPI: {effectiveUpiId}</span>
                </div>

                {showQrCode && (
                  <div className="pt-2 flex flex-col items-center justify-center bg-white p-3 rounded-lg border border-slate-200 shadow-xs space-y-2">
                    <img
                      src={dynamicQrUrl}
                      alt="Dynamic Payment QR Code"
                      className="w-44 h-44 rounded-md border border-slate-100 shadow-xs"
                    />
                    <div className="text-center text-[11px] text-slate-600">
                      <p className="font-semibold text-slate-800">Scan with any UPI App (GPay, PhonePe, Paytm)</p>
                      <p className="text-slate-400 text-[10px]">Pre-filled: {formatCurrency(Number(billPayAmount) || totalDue)} to {effectiveUpiId}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: RECORD TRANSACTION */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Step 2: Enter Transaction Details to Confirm</h4>
                    <p className="text-[11px] text-slate-500">Provide the 12-digit UPI Reference (UTR) from your payment screen</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">12-Digit UPI Ref / UTR No. <span className="text-red-500">*</span></Label>
                    <Input
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 432198765432"
                      required
                      className="h-9 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Found on GPay / PhonePe receipt</span>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Amount Paid (₹) <span className="text-red-500">*</span></Label>
                    <Input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="3220"
                      max={totalDue || 99999}
                      className="h-9 text-xs font-semibold"
                    />
                    <span className="text-[10px] text-slate-400">Total Outstanding: {formatCurrency(totalDue)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={payMethod} onValueChange={setPayMethod}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value="bank_transfer">Net Banking / IMPS</SelectItem>
                        <SelectItem value="cash">Cash to Admin</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Payment Date</Label>
                    <Input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* SCREENSHOT UPLOAD (OPTIONAL) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      Payment Screenshot Proof <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleUseSampleScreenshot}
                      className="h-6 text-[11px] text-indigo-600 hover:text-indigo-800 p-0 flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Attach Demo Receipt
                    </Button>
                  </div>

                  {screenshotPreview ? (
                    <div className="relative border-2 border-indigo-200 rounded-xl p-2 bg-slate-50 flex items-center gap-3">
                      <img
                        src={screenshotPreview}
                        alt="Payment Screenshot Preview"
                        className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-xs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">Screenshot Attached</p>
                        <p className="text-[11px] text-slate-500">Ready for admin verification</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-6 text-[10px] px-2"
                          >
                            Change
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setScreenshotPreview(null)
                              setProofImageBase64('')
                            }}
                            className="h-6 text-[10px] px-2 text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/20 transition-all rounded-lg p-3 text-center cursor-pointer group flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                      <span className="text-xs text-slate-600 group-hover:text-indigo-700 font-medium">
                        Click to attach screenshot (optional)
                      </span>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Remarks / Note (Optional)</Label>
                  <Input
                    value={payRemarks}
                    onChange={(e) => setPayRemarks(e.target.value)}
                    placeholder="e.g. Paid via PhonePe from HDFC account"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingPayment || isPaid || Number(payAmount) <= 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Recording Payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Confirm &amp; Record Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* SCREENSHOT FULL PREVIEW LIGHTBOX MODAL */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-900 border-slate-800">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-400" />
              {activeScreenshotTitle || 'Payment Proof Screenshot'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewModalOpen(false)}
              className="text-slate-400 hover:text-white p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[75vh] overflow-auto">
            {activeScreenshotUrl ? (
              <img
                src={activeScreenshotUrl}
                alt="Payment Proof Full Preview"
                className="max-h-[70vh] w-auto object-contain rounded shadow-lg border border-slate-800"
              />
            ) : (
              <p className="text-slate-500 text-xs py-8">No image available</p>
            )}
          </div>
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setPreviewModalOpen(false)} className="text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
