'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api'
import { useAppStore } from '@/store'

export default function SignupPage() {
  const router = useRouter()
  const { setAuthToken } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const data = {
      apartmentName: (form.elements.namedItem('apartmentName') as HTMLInputElement).value,
      address: {
        street: (form.elements.namedItem('address') as HTMLInputElement).value,
        pinCode: (form.elements.namedItem('pincode') as HTMLInputElement).value,
      },
      numberOfFloors: Number((form.elements.namedItem('floors') as HTMLInputElement).value),
      numberOfFlats: Number((form.elements.namedItem('flats') as HTMLInputElement).value),
      firstName: 'Admin',
      lastName: 'User',
      email: (form.elements.namedItem('adminEmail') as HTMLInputElement).value,
      password: (form.elements.namedItem('adminPassword') as HTMLInputElement).value,
      phoneNumber: '0000000000',
    }

    try {
      const response = await authAPI.signup(data)
      const token = response.token || response.data?.token
      if (token) {
        setAuthToken(token)
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <Building className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Apartment Maintenance</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-1 text-slate-500">Set up your apartment management system</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="apartmentName">Apartment Name</Label>
                <Input id="apartmentName" name="apartmentName" placeholder="Greenview Residency" required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" name="pincode" placeholder="560034" maxLength={6} required className="h-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Apartment Address</Label>
              <Input id="address" name="address" placeholder="42, Palm Street, Koramangala, Bengaluru" required className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input id="floors" name="floors" type="number" min={1} max={50} placeholder="6" required className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flats">Number of Flats</Label>
                <Input id="flats" name="flats" type="number" min={1} max={500} placeholder="36" required className="h-10" />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <p className="mb-4 text-sm font-semibold text-slate-700">Admin Account</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input id="adminEmail" name="adminEmail" type="email" placeholder="admin@apartment.com" required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      name="adminPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      minLength={8}
                      required
                      className="h-10 pr-10"
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
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? 'Creating account...' : (
                <span className="flex items-center gap-2">Create Account <ArrowRight className="h-4 w-4" /></span>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
