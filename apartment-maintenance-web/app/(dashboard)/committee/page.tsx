'use client'
import { useState, useEffect, useMemo } from 'react'
import { Shield, Mail, Phone, Pencil, Trash2, Crown, Star, Search, UserPlus, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { getInitials } from '@/lib/utils'
import { committeeAPI } from '@/lib/api'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import type { Flat } from '@/types'

const roleConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'secondary' | 'blue'; icon: typeof Crown }> = {
  president:     { variant: 'default',   icon: Crown },
  vice_president:{ variant: 'warning',   icon: Star },
  secretary:     { variant: 'blue',      icon: Star },
  treasurer:     { variant: 'success',   icon: Star },
  member:        { variant: 'secondary', icon: Shield },
}

const roleLabel: Record<string, string> = {
  president: 'President',
  vice_president: 'Vice President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  member: 'Member',
}

interface MemberForm {
  flatId: string
  memberName: string
  phoneNumber: string
  email: string
  role: string
}

const emptyForm: MemberForm = { flatId: '', memberName: '', phoneNumber: '', email: '', role: 'member' }

export default function CommitteePage() {
  const { toast } = useToast()
  const { flats, fetchFlats, apartmentId, fetchProfile } = useAppStore()

  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<MemberForm>(emptyForm)
  const [flatSearch, setFlatSearch] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  useEffect(() => {
    loadMembers()
    if (!flats.length) fetchFlats()
    if (!apartmentId) fetchProfile()
  }, [])

  async function loadMembers() {
    try {
      setLoading(true)
      const response = await committeeAPI.list()
      const data = response.data || response
      setMembers(Array.isArray(data) ? data : [])
    } catch {
      toast({ title: 'Error', description: 'Failed to load committee members.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Only occupied flats are eligible
  const occupiedFlats = useMemo(
    () => flats.filter((f) => f.occupancyStatus === 'occupied'),
    [flats]
  )

  // Set of flatIds already in the committee
  const committeeFlatIds = useMemo(
    () => new Set(members.map((m) => m.flatId?.toString?.() ?? m.flatId)),
    [members]
  )

  // Flats filtered by search and not yet on committee (for Add mode)
  const availableFlats = useMemo(() => {
    const q = flatSearch.toLowerCase()
    return occupiedFlats.filter((f) => {
      const inCommittee = committeeFlatIds.has(f.id)
      const matchSearch = !q || f.flatNumber.toLowerCase().includes(q) || (f.ownerName || '').toLowerCase().includes(q) || (f.tenantName || '').toLowerCase().includes(q)
      return !inCommittee && matchSearch
    })
  }, [occupiedFlats, committeeFlatIds, flatSearch])

  function residentName(flat: Flat) {
    return flat.occupancyType === 'tenant' && flat.tenantName ? flat.tenantName : flat.ownerName
  }
  function residentPhone(flat: Flat) {
    return flat.occupancyType === 'tenant' && flat.tenantMobile ? flat.tenantMobile : flat.ownerMobile
  }
  function residentEmail(flat: Flat) {
    return flat.occupancyType === 'tenant' && flat.tenantEmail ? flat.tenantEmail : flat.ownerEmail
  }

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFlatSearch('')
    setDialogOpen(true)
  }

  function openEdit(member: any) {
    setEditing(member)
    setForm({
      flatId: member.flatId || '',
      memberName: member.memberName || '',
      phoneNumber: member.phoneNumber || '',
      email: member.email || '',
      role: member.role || 'member',
    })
    setFlatSearch('')
    setDialogOpen(true)
  }

  function onFlatSelect(flatId: string) {
    const flat = flats.find((f) => f.id === flatId)
    if (!flat) return
    setForm((f) => ({
      ...f,
      flatId,
      memberName: residentName(flat),
      phoneNumber: residentPhone(flat) || '',
      email: residentEmail(flat) || '',
    }))
  }

  async function handleSave() {
    if (!form.role) {
      toast({ title: 'Validation error', description: 'Role is required.', variant: 'destructive' })
      return
    }
    if (!editing && !form.flatId) {
      toast({ title: 'Validation error', description: 'Please select a flat.', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const id = editing._id || editing.id
        const response = await committeeAPI.update(id, {
          memberName: form.memberName,
          phoneNumber: form.phoneNumber,
          email: form.email,
          role: form.role,
        })
        const updated = response.data || response
        setMembers((prev) => prev.map((m) => (m._id === id || m.id === id ? { ...m, ...updated } : m)))
        toast({ title: 'Member updated', variant: 'success' })
      } else {
        let aptId = apartmentId
        if (!aptId) {
          await fetchProfile()
          aptId = useAppStore.getState().apartmentId
        }
        const response = await committeeAPI.create({
          apartmentId: aptId,
          flatId: form.flatId,
          memberName: form.memberName,
          phoneNumber: form.phoneNumber,
          email: form.email,
          role: form.role,
        })
        const created = response.data || response
        setMembers((prev) => [created, ...prev])
        toast({ title: 'Member added', description: `${form.memberName} has been added to the committee.`, variant: 'success' })
      }
      setDialogOpen(false)
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save member.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const id = deleteTarget._id || deleteTarget.id
    try {
      await committeeAPI.delete(id)
      setMembers((prev) => prev.filter((m) => m._id !== id && m.id !== id))
      toast({ title: 'Member removed', variant: 'success' })
    } catch {
      toast({ title: 'Error', description: 'Failed to remove member.', variant: 'destructive' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const selectedFlat = form.flatId ? flats.find((f) => f.id === form.flatId) : null

  return (
    <div className="space-y-6">
      <PageHeader title="Committee Members" description={`${members.length} active committee member${members.length !== 1 ? 's' : ''}`}>
        <Button onClick={openAdd}>
          <UserPlus className="h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-12 text-slate-400">Loading committee members...</div>
      ) : members.length === 0 ? (
        <EmptyState icon={Shield} title="No committee members" description="Add your first committee member to get started." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {members.map((member) => {
            const roleKey = (member.role || 'member').toLowerCase()
            const { variant, icon: Icon } = roleConfig[roleKey] || roleConfig.member
            const displayName = member.memberName || ''
            const flatNum = member.flatNumber || flats.find((f) => f.id === member.flatId?.toString())?.flatNumber
            return (
              <Card key={member._id || member.id} className="hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                      <Avatar className="h-16 w-16 ring-4 ring-white shadow-md">
                        <AvatarFallback className="text-lg font-bold bg-indigo-100 text-indigo-700">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm">
                        <Icon className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                    </div>

                    <h3 className="font-semibold text-slate-900">{displayName}</h3>
                    <Badge variant={variant} className="mt-1.5">{roleLabel[roleKey] || member.role}</Badge>
                    {flatNum && (
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />Flat {flatNum}
                      </p>
                    )}

                    <div className="mt-4 w-full space-y-1 text-left">
                      {member.phoneNumber && (
                        <a href={`tel:${member.phoneNumber}`} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.phoneNumber}</span>
                        </a>
                      )}
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{member.email}</span>
                        </a>
                      )}
                    </div>

                    <div className="mt-4 flex w-full gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(member)}>
                        <Pencil className="h-3.5 w-3.5" />Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:border-red-200"
                        onClick={() => setDeleteTarget(member)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Committee Member' : 'Add Committee Member'}</DialogTitle>
            {!editing && (
              <DialogDescription>Select a resident from your apartment to assign a committee role.</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Flat selector — only in Add mode */}
            {!editing ? (
              <div className="space-y-1.5">
                <Label>Select Resident <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by flat number or name…"
                    className="pl-9"
                    value={flatSearch}
                    onChange={(e) => setFlatSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                  {occupiedFlats.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-400 text-center">No occupied flats found.</p>
                  ) : availableFlats.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-400 text-center">No matching residents found.</p>
                  ) : (
                    availableFlats.map((flat) => {
                      const name = residentName(flat)
                      const isSelected = form.flatId === flat.id
                      return (
                        <button
                          key={flat.id}
                          type="button"
                          onClick={() => onFlatSelect(flat.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-xs font-semibold bg-indigo-100 text-indigo-700">
                              {getInitials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                            <p className="text-xs text-slate-400">Flat {flat.flatNumber} · {flat.occupancyType === 'tenant' ? 'Tenant' : 'Owner'}</p>
                          </div>
                          {isSelected && <Badge variant="default" className="ml-auto shrink-0 text-xs">Selected</Badge>}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Read-only flat info in edit mode */
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Resident</p>
                <p className="text-sm font-medium text-slate-900">{form.memberName}</p>
                {selectedFlat && (
                  <p className="text-xs text-slate-400 mt-0.5">Flat {selectedFlat.flatNumber}</p>
                )}
              </div>
            )}

            {/* Auto-filled details */}
            {(form.flatId || editing) && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input
                      value={form.memberName}
                      onChange={(e) => setForm((f) => ({ ...f, memberName: e.target.value }))}
                      placeholder="Member name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone</Label>
                    <Input
                      value={form.phoneNumber}
                      onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                      placeholder="10-digit number"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Committee Role <span className="text-red-500">*</span></Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="president">President</SelectItem>
                  <SelectItem value="vice_president">Vice President</SelectItem>
                  <SelectItem value="secretary">Secretary</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || (!editing && !form.flatId)}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Remove Member</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteTarget?.memberName}</strong> from the committee? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
