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
import { ProfessorNav } from '@/components/professor/ProfessorNav'
import { triggerConductor } from '@/lib/api/conductor'
import { Play, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DashboardContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [conductorLoading, setConductorLoading] = useState(false)
  const [conductorError, setConductorError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleTriggerConductor = async () => {
    try {
      setConductorLoading(true)
      setConductorError(null)
      const response = await triggerConductor({ manual: true })
      
      if (response.success) {
        toast({
          title: 'Conductor Triggered',
          description: 'Sunday Night Conductor has been executed successfully.',
        })
        // Show success message and refresh widgets
        // The widgets will auto-refresh on mount, but we can trigger a page refresh
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        const errorMsg = response.error || 'Failed to trigger conductor'
        setConductorError(errorMsg)
        toast({
          title: 'Conductor Failed',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Error triggering conductor:', err)
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to trigger conductor. Please try again.'
      setConductorError(errorMessage)
      toast({
        title: 'Conductor Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setConductorLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Professor Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Manage your courses and view student activity
          </p>
        </div>
          <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleTriggerConductor}
            disabled={conductorLoading}
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              size="lg"
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
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              size="lg"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
              className="flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
              size="lg"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {conductorError && (
          <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-2">
            <svg
              className="w-5 h-5 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{conductorError}</span>
        </div>
      )}

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-3 mb-6">
        <AnnouncementDrafts />
        <EscalationQueue />
        <PulseReport />
      </div>

        {/* Secondary Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-2">
        <CourseManagement />
        <EnrolledStudents />
        </div>
      </div>
    </div>
    </>
  )
}

