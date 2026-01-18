'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  MessageSquare, 
  Megaphone, 
  Search, 
  LogOut,
  Menu,
  X,
  AlertCircle,
  Calendar,
  LayoutDashboard
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function StudentNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hasEnrollments, setHasEnrollments] = useState<boolean | null>(null)
  const [responsesCount, setResponsesCount] = useState(0)

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

  // Check enrollments and escalation responses on mount
  useEffect(() => {
    async function checkEnrollments() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setHasEnrollments(false)
          return
        }

        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('id')
          .eq('student_id', user.id)
          .limit(1)

        if (enrollmentsError && enrollmentsError.code !== 'PGRST116') {
          console.error('Error checking enrollments:', enrollmentsError)
        }

        setHasEnrollments((enrollments && enrollments.length > 0) || false)
      } catch (err) {
        console.error('Error checking enrollments:', err)
        setHasEnrollments(false)
      }
    }

    async function checkEscalationResponses() {
      try {
        const { getEscalations } = await import('@/lib/api/escalations')
        const data = await getEscalations()
        const escalations = data.escalations || []
        
        // Get viewed responses from localStorage
        const stored = localStorage.getItem('escalation_viewed_responses')
        let viewedSet: Set<string>
        try {
          viewedSet = stored ? new Set(JSON.parse(stored) as string[]) : new Set<string>()
        } catch (parseErr) {
          // If localStorage data is corrupted, reset it
          viewedSet = new Set<string>()
        }
        
        // Only count responses that haven't been viewed
        const unviewedResponses = escalations.filter(e => 
          e && e.response && 
          e.status === 'resolved' && 
          e.id && 
          !viewedSet.has(e.id)
        ).length
        
        // Only update if count actually changed
        setResponsesCount(prevCount => {
          if (prevCount !== unviewedResponses) {
            return unviewedResponses
          }
          return prevCount
        })
      } catch (err) {
        // Silently fail - not critical
        console.error('Error checking escalation responses:', err)
      }
    }

    // Listen for escalation updates from the escalations page
    function handleEscalationsUpdated(event: CustomEvent) {
      try {
        const { escalations: updatedEscalations, viewedResponses: viewedSet } = event.detail
        if (updatedEscalations && Array.isArray(updatedEscalations) && viewedSet) {
          // Ensure viewedSet is a Set object
          const viewedSetObj = viewedSet instanceof Set ? viewedSet : new Set(viewedSet)
          
          const unviewedResponses = updatedEscalations.filter((e: any) => 
            e && e.response && 
            e.status === 'resolved' && 
            e.id && 
            !viewedSetObj.has(e.id)
          ).length
          
          // Only update if the count actually changed to prevent unnecessary re-renders
          setResponsesCount(prevCount => {
            if (prevCount !== unviewedResponses) {
              return unviewedResponses
            }
            return prevCount
          })
        }
      } catch (err) {
        console.error('Error handling escalations update:', err)
      }
    }

    checkEnrollments()
    checkEscalationResponses()
    
    // Listen for updates from escalations page
    window.addEventListener('escalations-updated', handleEscalationsUpdated as EventListener)
    
    // Poll for new responses every 30 seconds when on escalations page
    const interval = setInterval(() => {
      if (pathname === '/student/escalations') {
        checkEscalationResponses()
      }
    }, 30000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('escalations-updated', handleEscalationsUpdated as EventListener)
    }
  }, [pathname])

  const baseNavItems = [
    {
      label: 'My Classes',
      href: '/student',
      icon: BookOpen,
      active: pathname === '/student' || pathname.startsWith('/student/chat'),
    },
    {
      label: 'Dashboard',
      href: '/student/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/student/dashboard',
      requiresEnrollment: true,
    },
    {
      label: 'Browse Courses',
      href: '/student/browse',
      icon: Search,
      active: pathname === '/student/browse',
    },
    {
      label: 'Schedule',
      href: '/student/schedule',
      icon: Calendar,
      active: pathname === '/student/schedule',
      requiresEnrollment: true,
    },
    {
      label: 'Announcements',
      href: '/student/announcements',
      icon: Megaphone,
      active: pathname === '/student/announcements',
      requiresEnrollment: true,
    },
    {
      label: 'My Escalations',
      href: '/student/escalations',
      icon: AlertCircle,
      active: pathname === '/student/escalations',
    },
  ]

  // Filter nav items based on enrollments
  // Show all items while loading (hasEnrollments === null), only filter once we know enrollment status
  const navItems = baseNavItems.filter(item => {
    if (item.requiresEnrollment) {
      // If we haven't checked enrollments yet (null), show the item
      // Once checked, only show if enrolled
      return hasEnrollments === null || hasEnrollments === true
    }
    return true
  })

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/student" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">SyllabusOS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const showBadge = item.href === '/student/escalations' && responsesCount > 0
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.active ? 'secondary' : 'ghost'}
                    className={cn(
                      'flex items-center gap-2 relative',
                      item.active && 'bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {showBadge && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                        {responsesCount}
                      </span>
                    )}
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
              const showBadge = item.href === '/student/escalations' && responsesCount > 0
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.active ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-2 relative',
                      item.active && 'bg-secondary'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {showBadge && (
                      <span className="ml-auto h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                        {responsesCount}
                      </span>
                    )}
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
