'use client'
import { useState } from 'react'
import { MessageSquareWarning, Plus, RefreshCw, ShieldAlert, Inbox, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ComplaintStatusBadge, PriorityBadge } from '@/components/shared/status-badge'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store'
import { formatDate } from '@/lib/utils'

const categoryLabels: Record<string, string> = {
  water: 'Water', electricity: 'Electricity', lift: 'Lift',
  parking: 'Parking', security: 'Security', cleaning: 'Cleaning',
  noise: 'Noise', other: 'Other',
}

const isClosed = (status?: string) => status === 'resolved' || status === 'closed'

export function ResidentComplaints() {
  const { toast } = useToast()
  const { residentComplaints, submitResidentComplaint, fetchResidentComplaints } = useAppStore()
  const { raised, against } = residentComplaints

  const [view, setView] = useState<'raised' | 'against'>('raised')
  const [refreshing, setRefreshing] = useState(false)

  // New complaint form
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('medium')
  const [description, setDescription] = useState('')
  const [againstFlat, setAgainstFlat] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const list = view === 'raised' ? raised : against
  const openRaised = raised.filter((c: any) => !isClosed(c.status)).length
  const openAgainst = against.filter((c: any) => !isClosed(c.status)).length

  function resetForm() {
    setCategory(''); setPriority('medium'); setDescription(''); setAgainstFlat('')
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await fetchResidentComplaints()
    } catch {
      toast({ title: 'Could not refresh', description: 'Please try again.', variant: 'destructive' })
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!category || !description.trim()) {
      toast({ title: 'Missing details', description: 'Please choose a category and describe the issue.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await submitResidentComplaint({
        category,
        priority,
        description: description.trim(),
        againstFlatNumber: againstFlat.trim() || undefined,
      })
      toast({ title: 'Complaint submitted', description: 'The society admin will review it shortly.', variant: 'success' })
      setOpen(false)
      resetForm()
      setView('raised')
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Could not submit complaint.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Complaints</CardTitle>
            <CardDescription className="text-xs">
              Raise issues with the society and track their status. You can also see complaints filed against your flat.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing} className="text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Raise Complaint
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Sub-view switcher */}
          <div className="flex gap-2 p-4 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setView('raised')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'raised' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Inbox className="h-3.5 w-3.5" />
              My Complaints ({raised.length})
              {openRaised > 0 && (
                <span className={`ml-1 rounded-full px-1.5 text-[10px] ${view === 'raised' ? 'bg-white/25' : 'bg-indigo-100 text-indigo-700'}`}>
                  {openRaised} open
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setView('against')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                view === 'against' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Against My Flat ({against.length})
              {openAgainst > 0 && (
                <span className={`ml-1 rounded-full px-1.5 text-[10px] ${view === 'against' ? 'bg-white/25' : 'bg-red-100 text-red-700'}`}>
                  {openAgainst} open
                </span>
              )}
            </button>
          </div>

          {list.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                {view === 'raised' ? <MessageSquareWarning className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {view === 'raised' ? 'You have not raised any complaints' : 'No complaints against your flat'}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {view === 'raised'
                  ? 'Use "Raise Complaint" to report water, lift, parking, cleaning or other issues.'
                  : 'Complaints filed against your flat by neighbours or the admin will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((c: any) => (
                <ComplaintRow key={c._id || c.id} complaint={c} view={view} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Raise Complaint */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <MessageSquareWarning className="h-5 w-5 text-indigo-600" />
              Raise a Complaint
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your complaint goes to the society admin. You can track its status here.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category <span className="text-red-500">*</span></Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Against Flat (optional)</Label>
              <Input
                placeholder="e.g. B-202 — only if the issue is caused by another flat"
                value={againstFlat}
                onChange={(e) => setAgainstFlat(e.target.value)}
                className="h-9 text-xs"
              />
              <span className="text-[10px] text-slate-400">
                Your name and flat are not shown to the other flat.
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe the issue in detail..."
                rows={4}
                maxLength={1000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
              <span className="text-[10px] text-slate-400 block text-right">{description.length}/1000</span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {submitting ? 'Submitting...' : 'Submit Complaint'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ComplaintRow({ complaint: c, view }: { complaint: any; view: 'raised' | 'against' }) {
  const [expanded, setExpanded] = useState(false)
  const id = (c._id || c.id || '').slice(-6).toUpperCase()
  const comments: any[] = c.comments || []

  return (
    <li className="p-4 hover:bg-slate-50/60 transition-colors">
      <button type="button" onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-indigo-600">#{id}</span>
              <span className="text-xs font-bold text-slate-900">{categoryLabels[c.category] || c.category}</span>
              <PriorityBadge priority={c.priority} />
              {view === 'raised' && c.againstFlatNumber && (
                <span className="text-[11px] font-medium text-slate-500">against Flat {c.againstFlatNumber}</span>
              )}
              {view === 'raised' && c.raisedBy === 'admin' && (
                <span className="text-[11px] font-medium text-slate-400">· logged by admin</span>
              )}
            </div>
            <p className={`text-xs text-slate-600 ${expanded ? '' : 'line-clamp-1'}`}>{c.description}</p>
            <p className="text-[11px] text-slate-400">Filed on {formatDate(c.createdAt || c.date)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ComplaintStatusBadge status={c.status} />
            {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 ml-0 sm:ml-1 space-y-2 text-xs">
          {c.assignedTo && (
            <p className="text-slate-600"><span className="text-slate-400">Assigned to:</span> <span className="font-semibold">{c.assignedTo}</span></p>
          )}
          {c.resolution && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
              <p className="font-semibold mb-0.5">Resolution{c.resolvedAt ? ` · ${formatDate(c.resolvedAt)}` : ''}</p>
              <p>{c.resolution}</p>
            </div>
          )}
          {comments.length > 0 && (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-700">Updates from admin</p>
              {comments.map((cm: any, i: number) => (
                <div key={cm._id || i} className="rounded-lg bg-slate-100 p-2.5">
                  <p className="text-slate-700">{cm.message}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{cm.author} · {formatDate(cm.timestamp)}</p>
                </div>
              ))}
            </div>
          )}
          {!c.assignedTo && !c.resolution && comments.length === 0 && (
            <p className="text-slate-400">No updates yet. The admin will review this complaint soon.</p>
          )}
        </div>
      )}
    </li>
  )
}
