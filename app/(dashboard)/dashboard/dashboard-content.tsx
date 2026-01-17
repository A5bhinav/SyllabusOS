'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Upload, LogOut } from 'lucide-react'

export default function DashboardContent() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Professor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your course and view student activity
          </p>
        </div>
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

      <div className="grid gap-6 md:grid-cols-3">
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
                <Upload className="mr-2 h-4 w-4" />
                Upload Course Files
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Announcement Drafts</CardTitle>
            <CardDescription>
              Review and publish weekly announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 4
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalation Queue</CardTitle>
            <CardDescription>
              View student escalations requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 4
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Pulse Report</CardTitle>
            <CardDescription>
              Insights into student questions and confusions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in Phase 4
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

