'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { AnnouncementDrafts } from '@/components/professor/AnnouncementDrafts'
import { EscalationQueue } from '@/components/professor/EscalationQueue'
import { PulseReport } from '@/components/professor/PulseReport'
import { triggerConductor } from '@/lib/api/conductor'
import Link from 'next/link'
import { Upload, LogOut, Play } from 'lucide-react'

export default function DashboardContent() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [conductorLoading, setConductorLoading] = useState(false)
  const [conductorError, setConductorError] = useState<string | null>(null)

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
        // Refresh the page after a short delay to show new announcements
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        setConductorError(response.error || 'Failed to trigger conductor')
      }
    } catch (err) {
      console.error('Error triggering conductor:', err)
      setConductorError('Failed to trigger conductor. Please try again.')
    } finally {
      setConductorLoading(false)
    }
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

      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Setup</CardTitle>
            <CardDescription>
              Upload your syllabus and schedule to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/onboarding">
              <Button className="w-full" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Course Files
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <AnnouncementDrafts />
        <EscalationQueue />
        <PulseReport />
      </div>
    </div>
  )
}

