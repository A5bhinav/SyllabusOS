'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AnnouncementDrafts } from '@/components/professor/AnnouncementDrafts'
import { EscalationQueue } from '@/components/professor/EscalationQueue'
import { PulseReport } from '@/components/professor/PulseReport'
import { CourseManagement } from '@/components/professor/CourseManagement'
import { EnrolledStudents } from '@/components/professor/EnrolledStudents'
import { triggerConductor } from '@/lib/api/conductor'
import { LogOut, Play, RefreshCw } from 'lucide-react'

export default function DashboardContent() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [conductorLoading, setConductorLoading] = useState(false)
  const [conductorError, setConductorError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  const handleTriggerConductor = async () => {
    try {
      setConductorLoading(true)
      setConductorError(null)
      const response = await triggerConductor({ manual: true })
      
      if (response.success) {
        // Show success message and refresh widgets
        // The widgets will auto-refresh on mount, but we can trigger a page refresh
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setConductorError(response.error || 'Failed to trigger conductor')
      }
    } catch (err: any) {
      console.error('Error triggering conductor:', err)
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to trigger conductor. Please try again.'
      setConductorError(errorMessage)
    } finally {
      setConductorLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.reload()
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Professor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your course and view student activity
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleTriggerConductor}
            disabled={conductorLoading}
            className="flex items-center gap-2"
          >
            {conductorLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run Conductor
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {conductorError && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {conductorError}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <AnnouncementDrafts />
        <EscalationQueue />
        <PulseReport />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <CourseManagement />
        <EnrolledStudents />
      </div>
    </div>
  )
}

