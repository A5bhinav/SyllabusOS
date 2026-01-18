'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard,
  Users, 
  BookOpen,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function ProfessorNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error signing out:', error)
      }
      
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/login')
    } finally {
      setSigningOut(false)
    }
  }

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'Onboarding',
      href: '/onboarding',
      icon: BookOpen,
      active: pathname === '/onboarding',
    },
  ]

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">ProfAI</span>
            <span className="text-sm text-muted-foreground ml-2">Professor</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.active ? 'secondary' : 'ghost'}
                    className={cn(
                      'flex items-center gap-2',
                      item.active && 'bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="hidden md:flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.active ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-2',
                      item.active && 'bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              )
            })}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 mt-2"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}

