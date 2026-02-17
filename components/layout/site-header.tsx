
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCustomer } from "@/components/providers/customer-provider"
import {
  Building2,
  ChevronDown,
  PlusCircle,
  LogOut,
  User,
  LayoutDashboard,
  BookOpen,
  ScrollText,
  AlertCircle
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useQueryClient } from "@tanstack/react-query"
import { ProfileDialog } from "@/components/features/auth/profile-dialog"

export function SiteHeader() {
  const { selectedCustomer, customers, selectCustomer } = useCustomer()
  const [user, setUser] = useState<any>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    queryClient.removeQueries()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-14 items-center px-4 md:px-8">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              ActiviaBook
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/ledger"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Ledger
            </Link>
            <Link
              href="/accounts"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Accounts
            </Link>
            <Link
              href="/reports/profit-and-loss"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Profit & Loss
            </Link>
            <Link
              href="/tools"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Tools
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center gap-2">
            {selectedCustomer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2 h-9 px-3">
                    <Building2 className="h-4 w-4" />
                    <span className="max-w-[120px] truncate">{selectedCustomer.name}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>Switch Customer</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {customers.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className={selectedCustomer.id === c.id ? "bg-accent" : ""}
                    >
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/customers')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Manage Accounts
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">User</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setIsProfileOpen(false)
                    router.push('/settings/security')
                  }}>
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>Security</span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => {
                    setIsProfileOpen(false)
                    router.push('/settings/close-account')
                  }} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    <span>Close Account</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </div>
      <ProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
    </header>
  )
}
