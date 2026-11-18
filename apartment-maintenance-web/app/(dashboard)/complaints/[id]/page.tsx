'use client'
import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, User, MessageSquare, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ComplaintStatusBadge, PriorityBadge } from '@/components/shared/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { complaintsAPI } from '@/lib/api'
import { formatDate, getInitials } from '@/lib/utils'

const statusSteps = ['open', 'assigned', 'in_progress', 'resolved', 'closed']
const statusLabels: Record<string, string> = {
  open: 'Open', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
}
const categoryLabels: Record<string, string> = {
  water: 'Water', electricity: 'Electricity', lift: 'Lift',
  parking: 'Parking', security: 'Security', cleaning: 'Cleaning',
  noise: 'Noise', other: 'Other',
}

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [complaint, setComplaint] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    complaintsAPI.getById(id)
      .then((r) => setComplaint(r.data || r))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  async function handleStatusChange(status: string) {
    try {
      await complaintsAPI.update(id, { status })
      setComplaint((prev: any) => ({ ...prev, status }))
    } catch (_) {}
  }

  async function handleAddComment() {
    if (!comment.trim()) return
    setSaving(true)
    try {
      const r = await complaintsAPI.addComment(id, comment, 'Admin')
      setComplaint(r.data || r)
      setComment('')
    } catch (_) {} finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="py-16 text-center text-slate-400">
        Complaint not found.{' '}
        <Link href="/complaints" className="text-indigo-600 hover:underline">Go back</Link>
      </div>
    )
  }

  const currentStep = statusSteps.indexOf(complaint.status)
  const complaintId = complaint._id || complaint.id
  const filedDate = complaint.date || complaint.createdAt

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/complaints">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div className="flex-1" />
        <Select value={complaint.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-mono font-bold text-indigo-600 text-lg">
                  #{String(complaintId).slice(-6).toUpperCase()}
                </span>
                <ComplaintStatusBadge status={complaint.status} />
                <PriorityBadge priority={complaint.priority} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 capitalize">
                {categoryLabels[complaint.category] || complaint.category} Issue
              </h2>
              <p className="mt-2 text-slate-600">{complaint.description}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs">Flat</p>
              <p className="font-semibold text-slate-900">{complaint.flatNumber}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Resident</p>
              <p className="font-semibold text-slate-900">{complaint.residentName}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Filed On</p>
              <p className="font-semibold text-slate-900">{formatDate(filedDate)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Assigned To</p>
              <p className="font-semibold text-slate-900">{complaint.assignedTo || 'Unassigned'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Tracker */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Status Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-0">
            {statusSteps.map((step, i) => {
              const isCompleted = i <= currentStep
              const isCurrent = i === currentStep
              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCompleted ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-indigo-100' : ''}`}>
                      {isCompleted && i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                    </div>
                    <p className={`mt-1.5 text-[10px] font-medium text-center ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {statusLabels[step]}
                    </p>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Comments / Timeline */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Activity & Comments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filed entry */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <User className="h-4 w-4 text-red-600" />
              </div>
              <div className="mt-1 flex-1 w-0.5 bg-slate-100" />
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="font-medium text-slate-900">{complaint.residentName}</span>
                <span className="text-xs text-slate-400">filed complaint</span>
                <span className="ml-auto text-xs text-slate-400">{formatDate(filedDate)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{complaint.description}</p>
            </div>
          </div>

          {/* Comments */}
          {(complaint.comments || []).map((c: any, idx: number) => (
            <div key={c._id || idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {getInitials(c.author || 'Admin')}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-1 flex-1 w-0.5 bg-slate-100" />
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-slate-900">{c.author || 'Admin'}</span>
                  <span className="text-xs text-slate-400">commented</span>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(c.timestamp)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{c.message}</p>
              </div>
            </div>
          ))}

          {/* Resolution */}
          {complaint.resolution && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-emerald-700">Resolved</span>
                  {complaint.resolvedAt && (
                    <span className="ml-auto text-xs text-slate-400">{formatDate(complaint.resolvedAt)}</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">{complaint.resolution}</p>
              </div>
            </div>
          )}

          {/* Add comment */}
          {complaint.status !== 'closed' && complaint.status !== 'resolved' && (
            <div className="border-t border-slate-100 pt-4">
              <Textarea
                placeholder="Add a comment or update..."
                rows={3}
                className="mb-3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={handleAddComment} disabled={saving || !comment.trim()}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Post Comment
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
