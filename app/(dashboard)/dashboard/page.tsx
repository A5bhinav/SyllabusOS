'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Upload, ArrowRight } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Check if professor has courses - redirect to onboarding if not
    const checkCourses = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('professor_id', user.id)
          .limit(1)

        if (!courses || courses.length === 0) {
          router.push('/onboarding')
        }
      }
    }

    checkCourses()
  }, [router])

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Professor Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your course and view student activity
        </p>
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

