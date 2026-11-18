'use client'
import { useState, useEffect } from 'react'
import { Save, Building, User, Lock, Bell, CreditCard, MapPin, Phone, Mail, Calendar, Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { adminAPI, authAPI, apartmentAPI } from '@/lib/api'

function ReadOnlyField({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-500 text-xs">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 min-h-[38px]">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
        <span>{value || '—'}</span>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { toast } = useToast()

  // Admin profile state
  const [profile, setProfile] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '',
    role: '', status: '', lastLogin: '', createdAt: '', isEmailVerified: false,
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Apartment state
  const [apartmentId, setApartmentId] = useState('')
  const [apartment, setApartment] = useState({
    apartmentName: '',
    street: '', city: '', state: '', pinCode: '',
    numberOfFlats: '', numberOfFloors: '', totalArea: '',
    registrationDate: '', status: '',
    emergencyContactName: '', emergencyContactPhone: '',
  })
  const [savingApartment, setSavingApartment] = useState(false)

  // Password state
  const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  // Notifications state
  const [notifications, setNotifications] = useState({
    paymentAlerts: true,
    complaintUpdates: true,
    monthlyReports: false,
    dueDateReminders: true,
    announcements: true,
  })

  useEffect(() => {
    adminAPI.getProfile().then((res) => {
      const data = res.data || res
      setProfile({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        phoneNumber: data.phoneNumber || '',
        role: data.role || '',
        status: data.status || '',
        lastLogin: data.lastLogin ? new Date(data.lastLogin).toLocaleString() : '',
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '',
        isEmailVerified: data.isEmailVerified || false,
      })

      const apt = typeof data.apartmentId === 'object' ? data.apartmentId : null
      if (apt) {
        setApartmentId(apt._id || '')
        setApartment({
          apartmentName: apt.apartmentName || '',
          street: apt.address?.street || '',
          city: apt.address?.city || '',
          state: apt.address?.state || '',
          pinCode: apt.address?.pinCode || '',
          numberOfFlats: apt.numberOfFlats != null ? String(apt.numberOfFlats) : '',
          numberOfFloors: apt.numberOfFloors != null ? String(apt.numberOfFloors) : '',
          totalArea: apt.totalArea != null ? String(apt.totalArea) : '',
          registrationDate: apt.registrationDate ? new Date(apt.registrationDate).toLocaleDateString() : '',
          status: apt.status || '',
          emergencyContactName: apt.metadata?.emergencyContactName || '',
          emergencyContactPhone: apt.metadata?.emergencyContactPhone || '',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSaveApartment() {
    if (!apartmentId) return
    setSavingApartment(true)
    try {
      await apartmentAPI.update(apartmentId, {
        apartmentName: apartment.apartmentName,
        address: {
          street: apartment.street,
          city: apartment.city,
          state: apartment.state,
          pinCode: apartment.pinCode,
        },
        metadata: {
          emergencyContactName: apartment.emergencyContactName,
          emergencyContactPhone: apartment.emergencyContactPhone,
        },
      })
      toast({ title: 'Apartment updated', description: 'Apartment details have been saved.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save apartment.', variant: 'destructive' })
    } finally {
      setSavingApartment(false)
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true)
    try {
      await adminAPI.updateProfile({ firstName: profile.firstName, lastName: profile.lastName, phoneNumber: profile.phoneNumber })
      toast({ title: 'Profile saved', description: 'Your profile has been updated.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to save profile.', variant: 'destructive' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'New password and confirmation must match.', variant: 'destructive' })
      return
    }
    if (passwords.newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Password must be at least 6 characters.', variant: 'destructive' })
      return
    }
    setSavingPassword(true)
    try {
      await authAPI.changePassword(passwords.oldPassword, passwords.newPassword)
      setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' })
      toast({ title: 'Password changed', description: 'Your password has been updated successfully.', variant: 'success' })
    } catch (err) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to change password.', variant: 'destructive' })
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = profile.firstName ? `${profile.firstName[0]}${profile.lastName?.[0] ?? ''}`.toUpperCase() : 'A'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="Settings" description="Manage your apartment and account settings" />

      <Tabs defaultValue="apartment">
        <TabsList>
          <TabsTrigger value="apartment"><Building className="mr-1.5 h-3.5 w-3.5" />Apartment</TabsTrigger>
          <TabsTrigger value="profile"><User className="mr-1.5 h-3.5 w-3.5" />Profile</TabsTrigger>
          <TabsTrigger value="security"><Lock className="mr-1.5 h-3.5 w-3.5" />Security</TabsTrigger>
          <TabsTrigger value="billing-config"><CreditCard className="mr-1.5 h-3.5 w-3.5" />Billing</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-3.5 w-3.5" />Notifications</TabsTrigger>
        </TabsList>

        {/* Apartment Settings */}
        <TabsContent value="apartment" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Apartment Details</CardTitle>
              <CardDescription>Basic information about your apartment complex</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Apartment Name</Label>
                  <Input
                    value={apartment.apartmentName}
                    onChange={(e) => setApartment((p) => ({ ...p, apartmentName: e.target.value }))}
                    placeholder="Apartment name"
                  />
                </div>
                <ReadOnlyField label="Number of Flats" value={apartment.numberOfFlats} icon={Info} />
                <ReadOnlyField label="Number of Floors" value={apartment.numberOfFloors} icon={Info} />
                {apartment.totalArea && (
                  <ReadOnlyField label="Total Area (sq ft)" value={apartment.totalArea} icon={Info} />
                )}
                <ReadOnlyField label="Registration Date" value={apartment.registrationDate} icon={Calendar} />
                <div className="space-y-1.5">
                  <Label className="text-slate-500 text-xs">Status</Label>
                  <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 min-h-[38px]">
                    <Badge variant={apartment.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {apartment.status || '—'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Street Address</Label>
                <Textarea
                  rows={2}
                  value={apartment.street}
                  onChange={(e) => setApartment((p) => ({ ...p, street: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={apartment.city} onChange={(e) => setApartment((p) => ({ ...p, city: e.target.value }))} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={apartment.state} onChange={(e) => setApartment((p) => ({ ...p, state: e.target.value }))} placeholder="State" />
                </div>
                <div className="space-y-1.5">
                  <Label>PIN Code</Label>
                  <Input maxLength={6} value={apartment.pinCode} onChange={(e) => setApartment((p) => ({ ...p, pinCode: e.target.value }))} placeholder="560034" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" />Emergency Contact</CardTitle>
              <CardDescription>Contact shown to residents in case of emergency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input
                    value={apartment.emergencyContactName}
                    onChange={(e) => setApartment((p) => ({ ...p, emergencyContactName: e.target.value }))}
                    placeholder="Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input
                    value={apartment.emergencyContactPhone}
                    onChange={(e) => setApartment((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveApartment} disabled={savingApartment}>
                  <Save className="h-4 w-4" />
                  {savingApartment ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-xl font-bold bg-indigo-100 text-indigo-700">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">{profile.firstName} {profile.lastName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="capitalize text-xs">{profile.role}</Badge>
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'} className="capitalize text-xs">{profile.status}</Badge>
                    {profile.isEmailVerified && (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={profile.phoneNumber} onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))} />
                </div>
                <ReadOnlyField label="Email" value={profile.email} icon={Mail} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  <Save className="h-4 w-4" />
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" />Account Info</CardTitle>
              <CardDescription>Read-only account details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Member Since" value={profile.createdAt} icon={Calendar} />
                <ReadOnlyField label="Last Login" value={profile.lastLogin} icon={Calendar} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password regularly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={passwords.oldPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, oldPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Repeat new password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleChangePassword} disabled={savingPassword}>
                  <Lock className="h-4 w-4" />
                  {savingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Config */}
        <TabsContent value="billing-config" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Configuration</CardTitle>
              <CardDescription>Set default billing amounts and rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Monthly Maintenance Amount (₹)</Label>
                  <Input type="number" defaultValue="3000" />
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Select defaultValue="10">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 10, 15, 20].map((d) => <SelectItem key={d} value={String(d)}>{d}th of every month</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Late Payment Penalty (%)</Label>
                  <Input type="number" defaultValue="5" min={0} max={50} />
                </div>
                <div className="space-y-1.5">
                  <Label>Penalty Grace Period (days)</Label>
                  <Input type="number" defaultValue="5" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Auto-billing</Label>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">Generate bills automatically</p>
                    <p className="text-xs text-slate-400">Bills are generated on the 1st of each month</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700">Send payment reminders</p>
                    <p className="text-xs text-slate-400">Remind residents 3 days before due date</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <div className="flex justify-end">
                <Button><Save className="h-4 w-4" />Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { key: 'paymentAlerts', label: 'Payment Alerts', description: 'Get notified when a payment is received' },
                { key: 'complaintUpdates', label: 'Complaint Updates', description: 'Notifications for new and updated complaints' },
                { key: 'dueDateReminders', label: 'Due Date Reminders', description: 'Remind about upcoming payment due dates' },
                { key: 'monthlyReports', label: 'Monthly Reports', description: 'Receive monthly financial summary reports' },
                { key: 'announcements', label: 'Announcements', description: 'General apartment announcements and notices' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.description}</p>
                  </div>
                  <Switch
                    checked={notifications[item.key as keyof typeof notifications]}
                    onCheckedChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))}
                  />
                </div>
              ))}
              <Separator />
              <div className="flex justify-end">
                <Button><Save className="h-4 w-4" />Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
