import { Badge } from '@/components/ui/badge'
import type { BillingStatus, ComplaintStatus, ComplaintPriority, ExpenseStatus, OccupancyStatus } from '@/types'
import { cn } from '@/lib/utils'

const billingStatusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'blue' | 'default' }> = {
  paid: { label: 'Paid', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  partial: { label: 'Partial', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  pending_verification: { label: 'Under Review', variant: 'warning' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  verified: { label: 'Verified', variant: 'success' },
}

const complaintStatusConfig: Record<string, { label: string; variant: 'destructive' | 'warning' | 'blue' | 'success' | 'secondary' }> = {
  open: { label: 'Open', variant: 'destructive' },
  assigned: { label: 'Assigned', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', className: 'bg-amber-100 text-amber-700' },
  emergency: { label: 'Emergency', className: 'bg-red-100 text-red-700' },
}

export function BillingStatusBadge({ status }: { status?: string | BillingStatus }) {
  const normStatus = (status || 'pending').toLowerCase()
  const config = billingStatusConfig[normStatus] || {
    label: status ? status.replace(/_/g, ' ') : 'Pending',
    variant: 'secondary' as const,
  }
  return <Badge variant={config.variant} className="capitalize">{config.label}</Badge>
}

export function ComplaintStatusBadge({ status }: { status?: string | ComplaintStatus }) {
  const normStatus = (status || 'open').toLowerCase()
  const config = complaintStatusConfig[normStatus] || {
    label: status ? status.replace(/_/g, ' ') : 'Open',
    variant: 'secondary' as const,
  }
  return <Badge variant={config.variant} className="capitalize">{config.label}</Badge>
}

export function PriorityBadge({ priority }: { priority?: string | ComplaintPriority }) {
  const normPriority = (priority || 'medium').toLowerCase()
  const config = priorityConfig[normPriority] || {
    label: priority || 'Medium',
    className: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', config.className)}>
      {config.label}
    </span>
  )
}

export function OccupancyBadge({ status }: { status?: string | OccupancyStatus }) {
  const isOccupied = status === 'occupied'
  return (
    <Badge variant={isOccupied ? 'success' : 'secondary'}>
      {isOccupied ? 'Occupied' : 'Vacant'}
    </Badge>
  )
}

export function ExpenseStatusBadge({ status }: { status?: string | ExpenseStatus }) {
  const isPaid = status === 'paid'
  return <Badge variant={isPaid ? 'success' : 'warning'}>{isPaid ? 'Paid' : 'Unpaid'}</Badge>
}
