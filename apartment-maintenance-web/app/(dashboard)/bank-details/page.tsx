'use client'
import { useState, useEffect } from 'react'
import { Copy, Check, Landmark, QrCode, Share2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/shared/page-header'
import { useToast } from '@/hooks/use-toast'
import { bankAPI } from '@/lib/api'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-slate-900 font-medium ${mono ? 'font-mono text-base' : ''}`}>{value}</p>
    </div>
    <CopyButton value={value} />
  </div>
)

const emptyBank = { bankName: '', accountHolderName: '', accountNumber: '', ifscCode: '', accountType: 'savings', upiId: '' }

export default function BankDetailsPage() {
  const { toast } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [form, setForm] = useState(emptyBank)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    bankAPI.get().then((res) => {
      const data = res.data || res
      if (data && data.bankName) {
        setBankDetails(data)
        setForm({
          bankName: data.bankName || '',
          accountHolderName: data.accountHolderName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          accountType: data.accountType || 'savings',
          upiId: data.upiId || '',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    if (!form.bankName || !form.accountNumber || !form.ifscCode) {
      toast({ title: 'Validation error', description: 'Bank name, account number and IFSC are required.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const response = await bankAPI.create(form)
      const saved = response.data || response
      setBankDetails(saved)
      setEditOpen(false)
      toast({ title: 'Bank details saved', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save bank details.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Bank Details" description="Payment account information for residents">
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="h-4 w-4" />
          Edit Details
        </Button>
      </PageHeader>

      {bankDetails ? (
        <>
          {/* Main bank card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Landmark className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-indigo-200 text-xs">Bank Account</p>
                  <p className="text-white font-bold text-lg">{bankDetails.bankName}</p>
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <DetailRow label="Account Holder" value={bankDetails.accountHolderName} />
              <DetailRow label="Account Number" value={bankDetails.accountNumber} mono />
              <DetailRow label="IFSC Code" value={bankDetails.ifscCode} mono />
            </CardContent>
          </Card>

          {/* UPI section */}
          {bankDetails.upiId && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-indigo-600" />
                  UPI Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                    <div className="text-center">
                      <QrCode className="h-16 w-16 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">QR Code</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">UPI ID</p>
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="flex-1 font-mono text-indigo-600 font-bold">{bankDetails.upiId}</p>
                        <CopyButton value={bankDetails.upiId} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button className="w-full" onClick={() => navigator.clipboard.writeText(bankDetails.upiId)}>
                        <Copy className="h-4 w-4" />
                        Copy UPI ID
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Share2 className="h-4 w-4" />
                        Share Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <Landmark className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No bank details added yet</p>
            <p className="text-sm mt-1">Click &ldquo;Edit Details&rdquo; to add your bank account information.</p>
          </CardContent>
        </Card>
      )}

      {/* Payment instructions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Payment Instructions for Residents</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-slate-600">
            {[
              'Transfer exactly the maintenance amount due.',
              'Add your flat number in the payment remarks/description.',
              'Send a screenshot of the payment to the committee.',
              'Payments via UPI are preferred for quick processing.',
              'Avoid cash payments without prior notice to the committee.',
            ].map((instruction, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{i + 1}</span>
                {instruction}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Bank Details</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Bank Name <span className="text-red-500">*</span></Label>
              <Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} placeholder="State Bank of India" />
            </div>
            <div className="space-y-1.5">
              <Label>Account Holder Name <span className="text-red-500">*</span></Label>
              <Input value={form.accountHolderName} onChange={(e) => setForm((f) => ({ ...f, accountHolderName: e.target.value }))} placeholder="Greenview Residency" />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number <span className="text-red-500">*</span></Label>
              <Input value={form.accountNumber} onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))} placeholder="XXXXXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>IFSC Code <span className="text-red-500">*</span></Label>
              <Input value={form.ifscCode} onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value.toUpperCase() }))} placeholder="SBIN0001234" />
            </div>
            <div className="space-y-1.5">
              <Label>UPI ID</Label>
              <Input value={form.upiId} onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))} placeholder="apartment@upi" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
