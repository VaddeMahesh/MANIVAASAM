'use client'
import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Edit, Share2, MoreVertical, Building2, Phone, Mail, Home, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/page-header'
import { OccupancyBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/lib/utils'
import { SocietyCodeCard, buildInviteMessage, whatsappUrl } from '@/components/shared/society-code-card'
import type { Flat } from '@/types'

const emptyForm = {
  flatNumber: '', floor: '', ownerName: '', ownerMobile: '', ownerEmail: '',
  tenantName: '', tenantMobile: '', tenantEmail: '',
}

export default function FlatsPage() {
  const { flats, fetchFlats, addFlat, updateFlat, societyCode, apartmentName, fetchProfile } = useAppStore()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [viewingFlat, setViewingFlat] = useState<Flat | null>(null)
  const [editingFlat, setEditingFlat] = useState<Flat | null>(null)
  const [isOccupied, setIsOccupied] = useState(true)
  const [isTenant, setIsTenant] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    fetchFlats()
    if (!societyCode) fetchProfile()
  }, [fetchFlats])

  const filtered = flats.filter((f) => {
    const matchSearch = !search || [f.flatNumber, f.ownerName, f.ownerMobile, f.tenantName].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
    const matchStatus = statusFilter === 'all' || f.occupancyStatus === statusFilter
    return matchSearch && matchStatus
  })

  // Send this flat's resident a WhatsApp invite with the society code and registration link
  function inviteFlat(flat: Flat) {
    if (!societyCode) {
      toast({ title: 'Society Code not loaded', description: 'Refresh the page and try again.', variant: 'destructive' })
      return
    }
    const phone = (flat.tenantName ? flat.tenantMobile : flat.ownerMobile) || flat.ownerMobile
    // Bill import fills unknown numbers with 9999999999; open WhatsApp without a recipient in that case
    const usablePhone = phone && !/^9{10}$/.test(phone.replace(/\D/g, '')) ? phone : undefined
    window.open(whatsappUrl(buildInviteMessage(societyCode, apartmentName, flat.flatNumber), usablePhone), '_blank', 'noopener')
    if (!usablePhone) {
      toast({ title: 'No mobile number on file', description: 'WhatsApp opened without a contact. Choose the resident there.' })
    }
  }

  function openView(flat: Flat) {
    setViewingFlat(flat)
    setViewDialogOpen(true)
  }

  function openEdit(flat: Flat) {
    setEditingFlat(flat)
    setIsOccupied(flat.occupancyStatus === 'occupied')
    setIsTenant(flat.occupancyType === 'tenant')
    setForm({
      flatNumber: flat.flatNumber,
      floor: String(flat.floor),
      ownerName: flat.ownerName,
      ownerMobile: flat.ownerMobile,
      ownerEmail: flat.ownerEmail,
      tenantName: flat.tenantName || '',
      tenantMobile: flat.tenantMobile || '',
      tenantEmail: flat.tenantEmail || '',
    })
    setDialogOpen(true)
  }

  function openAdd() {
    setEditingFlat(null)
    setIsOccupied(true)
    setIsTenant(false)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.flatNumber || !form.ownerName || !form.ownerMobile) {
      toast({ title: 'Missing fields', description: 'Flat number, owner name, and mobile are required.', variant: 'destructive' })
      return
    }
    const payload: Partial<Flat> = {
      flatNumber: form.flatNumber,
      floor: Number(form.floor) || 0,
      ownerName: form.ownerName,
      ownerMobile: form.ownerMobile,
      ownerEmail: form.ownerEmail,
      occupancyStatus: isOccupied ? 'occupied' : 'vacant',
      occupancyType: isTenant ? 'tenant' : 'owner',
      tenantName: isTenant ? form.tenantName : undefined,
      tenantMobile: isTenant ? form.tenantMobile : undefined,
      tenantEmail: isTenant ? form.tenantEmail : undefined,
    }
    setSaving(true)
    try {
      if (editingFlat) {
        const id = (editingFlat as { _id?: string })._id || editingFlat.id
        await updateFlat(id, payload)
        toast({ title: 'Flat updated', description: `Flat ${form.flatNumber} has been updated.`, variant: 'success' })
      } else {
        await addFlat(payload as Flat)
        toast({ title: 'Flat added', description: `Flat ${form.flatNumber} has been added.`, variant: 'success' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Save failed', description: 'Could not save flat. Please try again.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const occupiedCount = flats.filter((f) => f.occupancyStatus === 'occupied').length
  const vacantCount = flats.filter((f) => f.occupancyStatus === 'vacant').length

  return (
    <div className="space-y-6">
      <PageHeader title="Flats" description={`${flats.length} total · ${occupiedCount} occupied · ${vacantCount} vacant`}>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add Flat
        </Button>
      </PageHeader>

      <SocietyCodeCard code={societyCode} apartmentName={apartmentName} />

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'All Flats', value: 'all', count: flats.length },
          { label: 'Occupied', value: 'occupied', count: occupiedCount },
          { label: 'Vacant', value: 'vacant', count: vacantCount },
        ].map((chip) => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
              statusFilter === chip.value
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {chip.label}
            <span className={`rounded-full px-1.5 py-0.5 text-xs ${statusFilter === chip.value ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by flat, owner, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No flats found" description="Try adjusting your search or filters, or add a new flat." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Flat No.', 'Owner', 'Mobile', 'Status', 'Tenant', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((flat) => (
                    <tr key={flat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-700">
                            {flat.flatNumber.split('-')[0]}
                          </div>
                          <span className="font-semibold text-slate-900">{flat.flatNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
                            {getInitials(flat.ownerName)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{flat.ownerName}</p>
                            <p className="text-xs text-slate-400">{flat.ownerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{flat.ownerMobile}</td>
                      <td className="px-4 py-3.5"><OccupancyBadge status={flat.occupancyStatus} /></td>
                      <td className="px-4 py-3.5 text-slate-600">{flat.tenantName || <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(flat)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(flat)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => inviteFlat(flat)}>
                              <Share2 className="mr-2 h-4 w-4" />Invite via WhatsApp
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingFlat ? 'Edit Flat' : 'Add New Flat'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-2">
            <div className="space-y-1.5">
              <Label>Flat Number <span className="text-red-500">*</span></Label>
              <Input placeholder="A-101" value={form.flatNumber} onChange={(e) => setForm((p) => ({ ...p, flatNumber: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Floor Number</Label>
              <Input type="number" placeholder="1" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Name <span className="text-red-500">*</span></Label>
              <Input placeholder="John Doe" value={form.ownerName} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Owner Mobile <span className="text-red-500">*</span></Label>
              <Input placeholder="9876543210" value={form.ownerMobile} onChange={(e) => setForm((p) => ({ ...p, ownerMobile: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Owner Email</Label>
              <Input type="email" placeholder="owner@email.com" value={form.ownerEmail} onChange={(e) => setForm((p) => ({ ...p, ownerEmail: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2 py-2 border-t border-slate-100">
              <Switch checked={isOccupied} onCheckedChange={setIsOccupied} />
              <Label className="font-normal">{isOccupied ? 'Occupied' : 'Vacant'}</Label>
            </div>
            {isOccupied && (
              <>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <Switch checked={isTenant} onCheckedChange={setIsTenant} />
                  <Label className="font-normal">{isTenant ? 'Tenant Occupied' : 'Owner Occupied'}</Label>
                </div>
                {isTenant && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Tenant Name</Label>
                      <Input placeholder="Tenant Name" value={form.tenantName} onChange={(e) => setForm((p) => ({ ...p, tenantName: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tenant Mobile</Label>
                      <Input placeholder="9876543210" value={form.tenantMobile} onChange={(e) => setForm((p) => ({ ...p, tenantMobile: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Tenant Email</Label>
                      <Input type="email" placeholder="tenant@email.com" value={form.tenantEmail} onChange={(e) => setForm((p) => ({ ...p, tenantEmail: e.target.value }))} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editingFlat ? 'Save Changes' : 'Add Flat'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Flat Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Flat Details</DialogTitle>
          </DialogHeader>
          {viewingFlat && (
            <div className="space-y-5 py-1">
              {/* Flat identity */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100 text-xl font-bold text-indigo-700">
                  {viewingFlat.flatNumber.split('-')[0]}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewingFlat.flatNumber}</h3>
                  <p className="text-sm text-slate-500">Floor {viewingFlat.floor}</p>
                  <OccupancyBadge status={viewingFlat.occupancyStatus} />
                </div>
              </div>

              <Separator />

              {/* Owner section */}
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5" /> Owner Details
                </p>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-slate-100 text-slate-700 text-sm font-semibold">
                      {getInitials(viewingFlat.ownerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1.5">
                    <p className="font-semibold text-slate-900">{viewingFlat.ownerName}</p>
                    <a href={`mailto:${viewingFlat.ownerEmail}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                      <Mail className="h-3.5 w-3.5" />{viewingFlat.ownerEmail}
                    </a>
                    <a href={`tel:${viewingFlat.ownerMobile}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                      <Phone className="h-3.5 w-3.5" />{viewingFlat.ownerMobile}
                    </a>
                  </div>
                  <Badge variant="secondary">{viewingFlat.occupancyType === 'owner' ? 'Self Occupied' : 'Owner'}</Badge>
                </div>
              </div>

              {/* Tenant section */}
              {viewingFlat.occupancyType === 'tenant' && viewingFlat.tenantName && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Tenant Details
                    </p>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                          {getInitials(viewingFlat.tenantName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1.5">
                        <p className="font-semibold text-slate-900">{viewingFlat.tenantName}</p>
                        {viewingFlat.tenantEmail && (
                          <a href={`mailto:${viewingFlat.tenantEmail}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                            <Mail className="h-3.5 w-3.5" />{viewingFlat.tenantEmail}
                          </a>
                        )}
                        {viewingFlat.tenantMobile && (
                          <a href={`tel:${viewingFlat.tenantMobile}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                            <Phone className="h-3.5 w-3.5" />{viewingFlat.tenantMobile}
                          </a>
                        )}
                      </div>
                      <Badge variant="success">Tenant</Badge>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => {
              setViewDialogOpen(false)
              if (viewingFlat) openEdit(viewingFlat)
            }}>
              <Edit className="h-4 w-4" />
              Edit Flat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
