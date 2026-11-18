'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, MessageSquareWarning, MoreVertical, Eye, UserCheck, RefreshCw, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { ComplaintStatusBadge, PriorityBadge } from '@/components/shared/status-badge'
import { StatsCard } from '@/components/shared/stats-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, CheckCircle2, Clock, AlertOctagon } from 'lucide-react'
import type { Complaint, ComplaintStatus } from '@/types'

const categoryLabels: Record<string, string> = {
  water: 'Water', electricity: 'Electricity', lift: 'Lift',
  parking: 'Parking', security: 'Security', cleaning: 'Cleaning',
  noise: 'Noise', other: 'Other',
}

export default function ComplaintsPage() {
  const { complaints, fetchComplaints, addComplaint, updateComplaint } = useAppStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // New complaint dialog
  const [newOpen, setNewOpen] = useState(false)
  const [newFlat, setNewFlat] = useState('')
  const [newResident, setNewResident] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [newDescription, setNewDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Assign dialog
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null)
  const [assignee, setAssignee] = useState('')

  // Update Status dialog
  const [statusTarget, setStatusTarget] = useState<Complaint | null>(null)
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('in_progress')

  // Resolve dialog
  const [resolveTarget, setResolveTarget] = useState<Complaint | null>(null)
  const [resolution, setResolution] = useState('')

  useEffect(() => {
    fetchComplaints()
  }, [])

  const filtered = complaints.filter((c: any) => {
    const matchSearch = !search || [c.flatNumber, c.residentName, c.description, c.id, c._id].some(
      (v: string) => v?.toLowerCase().includes(search.toLowerCase())
    )
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchPriority = priorityFilter === 'all' || c.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const openCount = complaints.filter((c: any) => c.status === 'open').length
  const inProgressCount = complaints.filter((c: any) => c.status === 'in_progress' || c.status === 'assigned').length
  const resolvedCount = complaints.filter((c: any) => c.status === 'resolved').length
  const emergencyCount = complaints.filter((c: any) => c.priority === 'emergency').length

  async function handleSubmitComplaint() {
    if (!newFlat || !newCategory || !newDescription.trim()) {
      toast({ title: 'Missing fields', description: 'Please fill in flat, category and description.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      await addComplaint({
        flatNumber: newFlat,
        residentName: newResident || 'Unknown',
        category: newCategory,
        priority: newPriority,
        description: newDescription.trim(),
        comments: [],
      })
      setNewOpen(false)
      setNewFlat(''); setNewResident(''); setNewCategory(''); setNewPriority('medium'); setNewDescription('')
      toast({ title: 'Complaint filed', description: 'New complaint has been submitted.', variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to file complaint.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssign() {
    if (!assignTarget || !assignee) return
    const id = (assignTarget as any)._id || assignTarget.id
    try {
      await updateComplaint(id, { assignedTo: assignee, status: 'assigned' })
      toast({ title: 'Complaint assigned', description: `Assigned to ${assignee}.`, variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to assign complaint.', variant: 'destructive' })
    }
    setAssignTarget(null)
    setAssignee('')
  }

  async function handleStatusUpdate() {
    if (!statusTarget) return
    const id = (statusTarget as any)._id || statusTarget.id
    try {
      await updateComplaint(id, { status: newStatus })
      toast({ title: 'Status updated', description: `Status changed to "${newStatus.replace('_', ' ')}".`, variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' })
    }
    setStatusTarget(null)
  }

  async function handleResolve() {
    if (!resolveTarget || !resolution.trim()) return
    const id = (resolveTarget as any)._id || resolveTarget.id
    try {
      await updateComplaint(id, {
        status: 'resolved',
        resolution: resolution.trim(),
        resolvedAt: new Date().toISOString().split('T')[0],
      })
      toast({ title: 'Complaint resolved', description: `Marked as resolved.`, variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to resolve complaint.', variant: 'destructive' })
    }
    setResolveTarget(null)
    setResolution('')
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Complaints" description="Manage resident complaints and issues">
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" />
          New Complaint
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatsCard title="Open" value={openCount} icon={MessageSquareWarning} iconClassName="bg-red-50 text-red-600" />
        <StatsCard title="In Progress" value={inProgressCount} icon={Clock} iconClassName="bg-blue-50 text-blue-600" />
        <StatsCard title="Resolved" value={resolvedCount} icon={CheckCircle2} iconClassName="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Emergency" value={emergencyCount} icon={AlertOctagon} iconClassName="bg-red-50 text-red-600" />
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Search complaints..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={MessageSquareWarning} title="No complaints found" description="No complaints match your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['ID', 'Flat', 'Resident', 'Category', 'Priority', 'Status', 'Assigned To', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((c: any) => (
                    <tr key={c._id || c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-medium text-indigo-600">{(c._id || c.id)?.slice(-6).toUpperCase()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{c.flatNumber}</td>
                      <td className="px-4 py-3.5 text-slate-700">{c.residentName}</td>
                      <td className="px-4 py-3.5 text-slate-600">{categoryLabels[c.category] || c.category}</td>
                      <td className="px-4 py-3.5"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-4 py-3.5"><ComplaintStatusBadge status={c.status} /></td>
                      <td className="px-4 py-3.5 text-slate-600">{c.assignedTo || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5 text-slate-500">{formatDate(c.date || c.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/complaints/${c._id || c.id}`}><Eye className="mr-2 h-4 w-4" />View Details</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => { setAssignTarget(c); setAssignee(c.assignedTo || '') }}
                              disabled={c.status === 'resolved' || c.status === 'closed'}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />Assign
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setStatusTarget(c); setNewStatus(c.status) }}
                              disabled={c.status === 'resolved' || c.status === 'closed'}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setResolveTarget(c); setResolution('') }}
                              disabled={c.status === 'resolved' || c.status === 'closed'}
                              className="text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />Resolve
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

      {/* New Complaint Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>File New Complaint</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Flat Number <span className="text-red-500">*</span></Label>
                <Input placeholder="A-101" value={newFlat} onChange={(e) => setNewFlat(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Resident Name</Label>
                <Input placeholder="Resident name" value={newResident} onChange={(e) => setNewResident(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category <span className="text-red-500">*</span></Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-red-500">*</span></Label>
              <Textarea placeholder="Describe the issue in detail..." rows={3} value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmitComplaint} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Complaint'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-indigo-600" />Assign Complaint</DialogTitle>
            <DialogDescription>{(assignTarget as any)?._id?.slice(-6).toUpperCase() || assignTarget?.id} — {assignTarget?.flatNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Assign To</Label>
              <Input placeholder="Enter name or committee member" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTarget(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!assignee}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={!!statusTarget} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-blue-600" />Update Status</DialogTitle>
            <DialogDescription>{(statusTarget as any)?._id?.slice(-6).toUpperCase() || statusTarget?.id} — {statusTarget?.flatNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>New Status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplaintStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusTarget(null)}>Cancel</Button>
            <Button onClick={handleStatusUpdate}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={(open) => !open && setResolveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700"><CheckCircle className="h-5 w-5" />Resolve Complaint</DialogTitle>
            <DialogDescription>{(resolveTarget as any)?._id?.slice(-6).toUpperCase() || resolveTarget?.id} — {resolveTarget?.flatNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Resolution Notes <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Describe how the issue was resolved..."
                rows={4}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button variant="success" onClick={handleResolve} disabled={!resolution.trim()}>
              <CheckCircle className="h-4 w-4" />Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
