import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // Get user profile to determine redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'professor') {
      // Check if professor has courses - if not, go to onboarding
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user.id)
        .limit(1);

      if (!courses || courses.length === 0) {
        redirect('/onboarding')
      } else {
        redirect('/dashboard')
      }
    } else if (profile?.role === 'student') {
      redirect('/student')
    } else {
      // Profile doesn't exist or role is invalid, stay on home page
      // User can sign up or log in
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">SyllabusOS</h1>
          <p className="text-xl text-muted-foreground">
            AI Professor-in-a-Box - Intelligent course management system
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Sign up to create an account or log in to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Link href="/signup" className="flex-1">
              <Button className="w-full" size="lg">
                Sign Up
              </Button>
            </Link>
            <Link href="/login" className="flex-1">
              <Button className="w-full" variant="outline" size="lg">
                Log In
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">For Students</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ask questions about course policies, concepts, and schedules. Get instant AI-powered answers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">For Professors</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automate syllabus operations, manage escalations, and get insights into student confusions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Multi-agent routing intelligently handles queries and escalates when needed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

