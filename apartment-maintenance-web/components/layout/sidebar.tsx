'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Receipt, CreditCard,
  TrendingDown, MessageSquareWarning, BarChart3,
  Landmark, Settings, X, Building, Home
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'

const navItems = [
  { label: 'Dashboard',    href: '/dashboard',   icon: LayoutDashboard },
  { label: 'Flats',        href: '/flats',        icon: Building2 },
  { label: 'Committee',    href: '/committee',    icon: Users },
  { label: 'Billing',      href: '/billing',      icon: Receipt },
  { label: 'Collections',  href: '/collections',  icon: CreditCard },
  { label: 'Expenses',     href: '/expenses',     icon: TrendingDown },
  { label: 'Complaints',   href: '/complaints',   icon: MessageSquareWarning },
  { label: 'Reports',      href: '/reports',      icon: BarChart3 },
  { label: 'Bank Details', href: '/bank-details', icon: Landmark },
  { label: 'Settings',     href: '/settings',     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, apartmentName, pendingVerifications } = useAppStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 flex h-full w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <Building className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">MANIVAASAM</p>
            <p className="truncate text-xs text-slate-400">{apartmentName || 'My Apartment'}</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4.5 w-4.5 shrink-0',
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.href === '/collections' && (pendingVerifications?.length || 0) > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {pendingVerifications.length}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Resident Portal Quick Access */}
        <div className="px-3 pb-3">
          <Link
            href="/resident"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm"
          >
            <Home className="h-3.5 w-3.5 text-indigo-600" />
            Resident Portal View
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-400">© 2026 Apartment Mgmt</p>
          <p className="text-xs text-slate-300">v1.0.0</p>
        </div>
      </aside>
    </>
  )
}
