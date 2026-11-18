'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { Menu, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { useAppStore } from '@/store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function Header() {
  const { toggleSidebar, fetchProfile, apartmentName } = useAppStore()

  useEffect(() => {
    fetchProfile()
  }, [])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Hamburger */}
      <button
        onClick={toggleSidebar}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop toggle */}
      <button
        onClick={toggleSidebar}
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:flex"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <div className="hidden sm:flex flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">AU</AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">{apartmentName || 'Admin'}</p>
                <p className="text-xs text-slate-500 leading-tight">Admin</p>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{apartmentName || 'Admin'}</p>
              <p className="text-xs text-slate-500 font-normal">Administrator</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/login" className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => typeof window !== 'undefined' && window.location.replace('/login')}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
