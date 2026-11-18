import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MANIVAASAM | Smart Apartment Maintenance & Utility Management',
  description: 'MANIVAASAM (మణినివాసం) - Modern apartment maintenance & water utility management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full bg-slate-50">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
