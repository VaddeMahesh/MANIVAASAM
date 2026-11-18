'use client'
import { useEffect, useState } from 'react'
import { Copy, Check, KeyRound, Link2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

/** Link that opens the login page in Resident mode with the society code filled in. */
export function buildInviteLink(code: string, origin?: string) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/login?society=${encodeURIComponent(code)}&register=1`
}

/** Ready-to-send invite text for WhatsApp / SMS / email. */
export function buildInviteMessage(code: string, apartmentName?: string, flatNumber?: string) {
  const link = buildInviteLink(code)
  return (
    `Hello${flatNumber ? ` (Flat ${flatNumber})` : ''}, please register on the MANIVAASAM resident portal for ` +
    `${apartmentName || 'our society'} to view your maintenance bills, pay online and raise complaints.\n\n` +
    `Society Code: ${code}\n` +
    `Register here: ${link}\n\n` +
    `After registering, sign in with your Society Code + Flat Number, or your email.`
  )
}

/** Opens WhatsApp with the message. If a phone number is given, opens that chat directly. */
export function whatsappUrl(message: string, phone?: string) {
  const digits = (phone || '').replace(/\D/g, '')
  // Indian 10-digit numbers need the country code for wa.me
  const target = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${target}?text=${encodeURIComponent(message)}`
}

/**
 * Shows the society's unique code so the admin can share it with residents.
 * Residents need it to register and to sign in with a flat number, because the same flat number
 * (e.g. A-101) can exist in several societies.
 */
export function SocietyCodeCard({ code, apartmentName }: { code?: string; apartmentName?: string }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState('')

  // window is only available in the browser
  useEffect(() => { if (code) setInviteLink(buildInviteLink(code)) }, [code])

  if (!code) return null

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
      toast({ title: `${label} copied`, variant: 'success' })
    } catch {
      toast({ title: 'Could not copy', description: 'Please copy it manually.', variant: 'destructive' })
    }
  }

  const message = buildInviteMessage(code, apartmentName)

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-indigo-900">Society Code</p>
          <p className="text-2xl font-extrabold font-mono tracking-widest text-indigo-700">{code}</p>
          <p className="text-[11px] text-indigo-800/80 mt-0.5">
            Residents need this code to register and to sign in with their flat number.
            Send them the invite link — the code is filled in automatically.
          </p>
        </div>
      </div>

      {inviteLink && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2">
          <Link2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="truncate text-[11px] font-mono text-slate-600">{inviteLink}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy(code, 'Society Code')} className="bg-white text-xs">
          {copied === 'Society Code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Code
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy(inviteLink, 'Invite link')} className="bg-white text-xs">
          {copied === 'Invite link' ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          Copy Invite Link
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy(message, 'Invite message')} className="bg-white text-xs">
          {copied === 'Invite message' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Message
        </Button>
        <Button size="sm" asChild className="text-xs bg-emerald-600 hover:bg-emerald-700">
          <a href={whatsappUrl(message)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" />
            Share on WhatsApp
          </a>
        </Button>
      </div>
    </div>
  )
}
