'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, Eye, EyeOff, ArrowRight, Shield, User, Home, Sparkles, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/store'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const router = useRouter()
  const { login, residentLogin, residentSignup } = useAppStore()
  const { toast } = useToast()

  const [roleMode, setRoleMode] = useState<'admin' | 'resident'>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Admin credentials
  const [email, setEmail] = useState('admin@greenviewresidency.com')
  const [password, setPassword] = useState('password')

  // Resident credentials
  const [residentInput, setResidentInput] = useState('A-104')
  const [residentPassword, setResidentPassword] = useState('password123')

  // Resident Registration state
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regName, setRegName] = useState('')
  const [regFlat, setRegFlat] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regRole, setRegRole] = useState<'owner' | 'tenant'>('owner')
  const [regPassword, setRegPassword] = useState('password123')
  const [registering, setRegistering] = useState(false)

  const [errorMsg, setErrorMsg] = useState('')

  // Handle Admin or Resident submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      if (roleMode === 'admin') {
        await login(email, password)
        router.push('/dashboard')
      } else {
        await residentLogin(residentInput, residentPassword)
        toast({
          title: 'Welcome to Resident Portal',
          description: `Logged in for Flat ${residentInput.toUpperCase()}`,
          variant: 'success',
        })
        router.push('/resident')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setErrorMsg('Unable to connect to authentication server. Please check your network connection or verify the backend service is running.')
      } else {
        setErrorMsg(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Quick Resident Demo Sign-in
  async function handleQuickResidentLogin(flatNumber: string) {
    setRoleMode('resident')
    setResidentInput(flatNumber)
    setResidentPassword('password123')
    setLoading(true)
    setErrorMsg('')
    try {
      await residentLogin(flatNumber, 'password123')
      toast({
        title: 'Logged In Successfully',
        description: `Welcome to Flat ${flatNumber} Resident Portal`,
        variant: 'success',
      })
      router.push('/resident')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not log in as resident.'
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setErrorMsg('Unable to connect to authentication server. Please verify the backend service is running.')
      } else {
        setErrorMsg(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle Resident Registration
  async function handleRegisterResident(e: React.FormEvent) {
    e.preventDefault()
    setRegistering(true)
    try {
      await residentSignup({
        name: regName,
        flatNumber: regFlat,
        email: regEmail,
        phoneNumber: regPhone,
        role: regRole,
        password: regPassword,
      })
      toast({
        title: 'Resident Registered!',
        description: `Account created for Flat ${regFlat}. Redirecting to your portal...`,
        variant: 'success',
      })
      setRegisterOpen(false)
      router.push('/resident')
    } catch (err) {
      toast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Could not register resident account.',
        variant: 'destructive',
      })
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Building className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wide text-white">MANIVAASAM</span>
          </div>
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Transparent Maintenance<br />&amp; Resident Portal
          </h2>
          <p className="mt-4 text-indigo-200 text-base max-w-md">
            Individual water meter readings, instant PDF generation, online payment verification, and dedicated owner/tenant accounts.
          </p>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -right-10 bottom-20 h-64 w-64 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-3.5">
            {[
              { label: 'Society Flats', value: '35 Flats' },
              { label: 'Water Meter Accuracy', value: '10x Mult' },
              { label: 'Verified Collections', value: '100% Track' },
              { label: 'Resident Self-Service', value: 'UPI & Proof' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-indigo-200 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-md space-y-6">
          {/* Logo Header */}
          <div>
            <div className="flex items-center gap-2 mb-4 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Building className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-slate-900">Apartment Maintenance</span>
            </div>

            <h1 className="text-2xl font-extrabold text-slate-900">Welcome back</h1>
            <p className="text-xs text-slate-500 mt-1">
              Select your portal role below to sign in to your dashboard
            </p>
          </div>

          {/* Role Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setRoleMode('admin')
                setErrorMsg('')
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                roleMode === 'admin'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleMode('resident')
                setErrorMsg('')
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                roleMode === 'resident'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="h-4 w-4" />
              Resident (Owner/Tenant)
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* FORM: ADMIN LOGIN */}
          {roleMode === 'admin' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Admin Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@greenviewresidency.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Link href="/forgot-password" className="text-[11px] text-indigo-600 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="font-normal text-xs text-slate-600">
                  Remember me on this browser
                </Label>
              </div>

              <Button type="submit" className="w-full h-10 text-xs font-bold bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In as Society Admin'}
              </Button>
            </form>
          ) : (
            /* FORM: RESIDENT (OWNER / TENANT) LOGIN */
            <div className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="residentInput" className="text-xs">
                    Flat Number or Registered Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="residentInput"
                    placeholder="e.g. A-104 or owner@apartment.com"
                    value={residentInput}
                    onChange={(e) => setResidentInput(e.target.value)}
                    required
                    className="h-10 text-xs"
                  />
                  <span className="text-[11px] text-slate-400">
                    Enter your Flat number (e.g. A-104, A-106, G1)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="residentPassword" className="text-xs">Password</Label>
                    <span className="text-[11px] text-slate-400">Default: password123</span>
                  </div>
                  <div className="relative">
                    <Input
                      id="residentPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={residentPassword}
                      onChange={(e) => setResidentPassword(e.target.value)}
                      required
                      className="h-10 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In to Resident Portal'}
                </Button>
              </form>

              {/* Quick 1-Click Resident Sign-in Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  Quick Resident Demo Login:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResidentLogin('A-104')}
                    className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                  >
                    Flat A-104 (₹3,220)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResidentLogin('A-106')}
                    className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                  >
                    Flat A-106 (₹4,955)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickResidentLogin('G1')}
                    className="h-8 text-[11px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                  >
                    Flat G1 (₹1,924)
                  </Button>
                </div>
              </div>

              {/* Register Flat Link */}
              <div className="text-center pt-2 text-xs text-slate-500">
                First time logging in?{' '}
                <button
                  type="button"
                  onClick={() => setRegisterOpen(true)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Register Flat Resident Account
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400">
            {roleMode === 'admin' ? (
              <>
                Society Admin?{' '}
                <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
                  Create new society account
                </Link>
              </>
            ) : (
              'Residents can view water usage, bills, and submit UPI payment screenshots.'
            )}
          </p>
        </div>
      </div>

      {/* MODAL: RESIDENT REGISTRATION */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Home className="h-5 w-5 text-indigo-600" />
              Register Flat Resident Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              Link your owner or tenant account to your apartment flat.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterResident} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Flat Number <span className="text-red-500">*</span></Label>
                <Input
                  required
                  placeholder="e.g. A-104"
                  value={regFlat}
                  onChange={(e) => setRegFlat(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role <span className="text-red-500">*</span></Label>
                <Select value={regRole} onValueChange={(v: any) => setRegRole(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Flat Owner</SelectItem>
                    <SelectItem value="tenant">Tenant / Renter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
              <Input
                required
                placeholder="e.g. Rajesh Kumar"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  required
                  placeholder="owner@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  placeholder="9876543210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Password <span className="text-red-500">*</span></Label>
              <Input
                type="password"
                required
                minLength={6}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={registering} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                {registering ? 'Creating Account...' : 'Register & Enter Portal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
