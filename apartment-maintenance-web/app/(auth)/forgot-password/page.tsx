'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Building, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
            <Building className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">Apartment Maintenance</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Mail className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
              <p className="mt-2 text-slate-500">We&apos;ve sent password reset instructions to your email address.</p>
              <Link href="/login">
                <Button className="mt-6 w-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
                <p className="mt-1 text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>
              </div>
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input id="email" name="email" type="email" placeholder="admin@apartment.com" required className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>

        <Link href="/login" className="mt-4 flex items-center justify-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
      </div>
    </div>
  )
}
