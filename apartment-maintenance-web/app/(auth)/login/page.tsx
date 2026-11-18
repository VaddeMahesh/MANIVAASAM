'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
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
import { authAPI } from '@/lib/api'

const LEGACY_SOCIETY_CODE_KEY = 'manivaasam:societyCode'

export default function LoginPage() {
  const router = useRouter()
  const { login, residentLogin, residentSignup } = useAppStore()
  const { toast } = useToast()

  const [roleMode, setRoleMode] = useState<'admin' | 'resident'>('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Admin credentials
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Resident credentials. Flat-number login needs the Society Code, because the same
  // flat number (e.g. A-101) exists in many societies. Email login does not.
  const [residentInput, setResidentInput] = useState('')
  const [residentPassword, setResidentPassword] = useState('')
  const [loginSocietyCode, setLoginSocietyCode] = useState('')
  const [residentLoginMethod, setResidentLoginMethod] = useState<'flat' | 'email'>('flat')
  const residentUsesEmail = residentLoginMethod === 'email'

  // Resident Registration state
  const [registerOpen, setRegisterOpen] = useState(false)
  const [regName, setRegName] = useState('')
  const [regFlat, setRegFlat] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regRole, setRegRole] = useState<'owner' | 'tenant'>('owner')
  const [regPassword, setRegPassword] = useState('')
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [regSocietyCode, setRegSocietyCode] = useState('')
  // Result of looking up the typed society code: shows the society name so residents can confirm it
  const [societyLookup, setSocietyLookup] = useState<
    { state: 'idle' | 'checking' | 'found' | 'missing'; name?: string }
  >({ state: 'idle' })

  const normalizeCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')

  // Pre-fill the society code only when the resident opens an admin's invite link:
  // /login?society=SRI6817&register=1. Otherwise the field starts empty.
  useEffect(() => {
    // Remove the code saved by an earlier version of this page, so it no longer appears as a default
    try { localStorage.removeItem(LEGACY_SOCIETY_CODE_KEY) } catch {}

    const params = new URLSearchParams(window.location.search)
    const fromLink = normalizeCode(params.get('society') || '')
    if (fromLink) {
      setLoginSocietyCode(fromLink)
      setRegSocietyCode(fromLink)
      setRoleMode('resident')
      if (params.get('register') === '1') setRegisterOpen(true)
    }
  }, [])

  // Look up the society name shortly after the resident stops typing the code
  useEffect(() => {
    const code = normalizeCode(regSocietyCode)
    if (code.length < 5) {
      setSocietyLookup({ state: 'idle' })
      return
    }
    setSocietyLookup({ state: 'checking' })
    let cancelled = false
    const timer = setTimeout(() => {
      authAPI.lookupSociety(code)
        .then((res) => { if (!cancelled) setSocietyLookup({ state: 'found', name: res?.data?.apartmentName }) })
        .catch(() => { if (!cancelled) setSocietyLookup({ state: 'missing' }) })
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [regSocietyCode])

  const [errorMsg, setErrorMsg] = useState('')

  // Handle Admin or Resident submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (roleMode === 'resident' && !residentUsesEmail && !normalizeCode(loginSocietyCode)) {
      setErrorMsg('Please enter your Society Code along with your flat number, or sign in with your email.')
      return
    }

    setLoading(true)
    try {
      if (roleMode === 'admin') {
        await login(email, password)
        router.push('/dashboard')
      } else {
        await residentLogin(
          residentInput,
          residentPassword,
          residentUsesEmail ? undefined : normalizeCode(loginSocietyCode)
        )
        toast({
          title: 'Welcome to Resident Portal',
          description: residentUsesEmail ? 'Logged in successfully' : `Logged in for Flat ${residentInput.toUpperCase()}`,
          variant: 'success',
        })
        router.push('/resident')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.'
      if (msg.includes('404') || msg.toLowerCase().includes('route not found')) {
        setErrorMsg('Unable to connect to authentication server. Please check your network connection or verify the backend service is running.')
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
    if (societyLookup.state !== 'found') {
      toast({
        title: 'Check your Society Code',
        description: 'Enter the Society Code shared by your society admin (e.g. SRI6817).',
        variant: 'destructive',
      })
      return
    }
    setRegistering(true)
    try {
      await residentSignup({
        societyCode: normalizeCode(regSocietyCode),
        name: regName,
        flatNumber: regFlat,
        email: regEmail,
        phoneNumber: regPhone,
        role: regRole,
        password: regPassword,
      })
      toast({
        title: 'Resident Registered!',
        description: `Account created for Flat ${regFlat.toUpperCase()}. Redirecting to your portal...`,
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
                  placeholder="Enter your admin email"
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
                    placeholder="Enter your password"
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
                {/* Login method switch */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500 mr-1">Sign in with:</span>
                  {(['flat', 'email'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setResidentLoginMethod(m); setResidentInput(''); setErrorMsg('') }}
                      className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                        residentLoginMethod === m ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {m === 'flat' ? 'Flat Number' : 'Email'}
                    </button>
                  ))}
                </div>

                {residentUsesEmail ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="residentInput" className="text-xs">
                      Registered Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="residentInput"
                      type="email"
                      placeholder="e.g. owner@gmail.com"
                      value={residentInput}
                      onChange={(e) => setResidentInput(e.target.value)}
                      required
                      className="h-10 text-xs"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="loginSocietyCode" className="text-xs">
                        Society Code <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="loginSocietyCode"
                        placeholder="Enter society code"
                        value={loginSocietyCode}
                        onChange={(e) => setLoginSocietyCode(e.target.value.toUpperCase())}
                        autoComplete="off"
                        required
                        className="h-10 text-xs font-mono tracking-wider uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="residentInput" className="text-xs">
                        Flat Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="residentInput"
                        placeholder="e.g. A-104"
                        value={residentInput}
                        onChange={(e) => setResidentInput(e.target.value)}
                        required
                        className="h-10 text-xs"
                      />
                    </div>
                    <span className="col-span-2 -mt-1 text-[11px] text-slate-400">
                      Don&apos;t know your Society Code? Ask your society admin, or sign in with Email.
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="residentPassword" className="text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      id="residentPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={residentPassword}
                      onChange={(e) => setResidentPassword(e.target.value)}
                      required
                      className="h-10 pr-10 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            <div className="space-y-1">
              <Label className="text-xs">Society Code <span className="text-red-500">*</span></Label>
              <Input
                required
                placeholder="Enter society code (ask your society admin)"
                value={regSocietyCode}
                onChange={(e) => setRegSocietyCode(e.target.value.toUpperCase())}
                autoComplete="off"
                className="h-9 text-xs font-mono tracking-wider uppercase"
              />
              {societyLookup.state === 'checking' && (
                <span className="text-[11px] text-slate-400">Checking code...</span>
              )}
              {societyLookup.state === 'found' && (
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {societyLookup.name}
                </span>
              )}
              {societyLookup.state === 'missing' && (
                <span className="text-[11px] text-red-600">No society found with this code.</span>
              )}
            </div>

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
              <div className="relative">
                <Input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="h-9 pr-10 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
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
