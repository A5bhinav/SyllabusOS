import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from './dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check user role and redirect if needed
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // If student, redirect to student dashboard
  if (profile.role === 'student') {
    redirect('/student')
  }

  // If professor, check if they have courses - redirect to onboarding if not
  if (profile.role === 'professor') {
    const { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('professor_id', user.id)
      .limit(1)

    if (!courses || courses.length === 0) {
      redirect('/onboarding')
    }
  }

  return <DashboardContent />
}
