'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Share2, Building, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BillingStatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { billsAPI, bankAPI, paymentsAPI } from '@/lib/api'
import { useAppStore } from '@/store'

export default function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { apartmentName } = useAppStore()
  const [bill, setBill] = useState<any>(null)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      billsAPI.getById(id),
      bankAPI.get().catch(() => null),
      paymentsAPI.list({ billId: id }).catch(() => null),
    ]).then(([billRes, bankRes, payRes]) => {
      setBill(billRes?.data || billRes)
      setBankDetails(bankRes?.data || bankRes)
      const payData = payRes?.data || payRes
      setPayments(Array.isArray(payData) ? payData : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!bill) {
    return (
      <div className="py-16 text-center text-slate-400">
        Bill not found.{' '}
        <Link href="/billing" className="text-indigo-600 hover:underline">Go back</Link>
      </div>
    )
  }

  const aptName = apartmentName || 'Apartment Management'
  const invoiceNo = `INV-${String(bill._id || bill.id).slice(-8).toUpperCase()}`

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="h-4 w-4" />Download
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigator.share?.({ title: invoiceNo, url: window.location.href })}>
          <Share2 className="h-4 w-4" />Share
        </Button>
      </div>

      {/* Invoice card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-8 py-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Building className="h-5 w-5 text-indigo-200" />
                <span className="text-indigo-200 text-sm">MAINTENANCE INVOICE</span>
              </div>
              <h1 className="text-2xl font-bold">{aptName}</h1>
            </div>
            <div className="text-right">
              <p className="text-indigo-200 text-xs">Invoice No.</p>
              <p className="font-bold text-lg">{invoiceNo}</p>
              <BillingStatusBadge status={bill.status} />
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Bill To & Details */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</p>
              <p className="font-semibold text-slate-900">{bill.ownerName}</p>
              <p className="text-sm text-slate-600">Flat {bill.flatNumber}</p>
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Billing Month</span>
                  <span className="text-sm font-medium text-slate-900">{formatMonth(bill.billingMonth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Due Date</span>
                  <span className="text-sm font-medium text-slate-900">{formatDate(bill.dueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-400">Generated On</span>
                  <span className="text-sm font-medium text-slate-900">{formatDate(bill.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="rounded-xl overflow-hidden border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                <tr>
                  <td className="px-4 py-3 text-slate-700">Monthly Maintenance — {formatMonth(bill.billingMonth)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(bill.amount)}</td>
                </tr>
                {(bill.penalty || 0) > 0 && (
                  <tr>
                    <td className="px-4 py-3 text-red-600">Late Payment Penalty</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatCurrency(bill.penalty)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(bill.amount)}</span>
              </div>
              {(bill.penalty || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-red-500">Penalty</span>
                  <span className="text-red-600">{formatCurrency(bill.penalty)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Amount Paid</span>
                <span className="text-emerald-700 font-medium">-{formatCurrency(bill.paidAmount || 0)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between">
                <span className="font-bold text-slate-900">Balance Due</span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(Math.max(0, (bill.amount || 0) + (bill.penalty || 0) - (bill.paidAmount || 0)))}
                </span>
              </div>
            </div>
          </div>

          {/* Payment history */}
          {payments.length > 0 && (
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Payment History</p>
              <div className="space-y-2">
                {payments.map((p: any) => (
                  <div key={p._id || p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-800 capitalize">{p.paymentMethod?.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400">
                        {p.transactionId ? `Txn: ${p.transactionId} · ` : ''}
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                      {p.remarks && <p className="text-xs text-slate-400">{p.remarks}</p>}
                    </div>
                    <span className="font-semibold text-emerald-700">{formatCurrency(p.paidAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bank payment info */}
          {/* {bankDetails && (
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pay To</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {bankDetails.bankName && <div><span className="text-slate-400">Bank: </span><span className="text-slate-700">{bankDetails.bankName}</span></div>}
                {bankDetails.ifscCode && <div><span className="text-slate-400">IFSC: </span><span className="text-slate-700">{bankDetails.ifscCode}</span></div>}
                {bankDetails.accountNumber && <div className="col-span-2"><span className="text-slate-400">Account: </span><span className="text-slate-700 font-mono">{bankDetails.accountNumber}</span></div>}
                {bankDetails.upiId && <div className="col-span-2"><span className="text-slate-400">UPI: </span><span className="text-slate-700">{bankDetails.upiId}</span></div>}
              </div>
            </div>
          )} */}

          <p className="text-center text-xs text-slate-400">Thank you for your prompt payment. Contact the apartment management for queries.</p>
        </div>
      </div>
    </div>
  )
}
