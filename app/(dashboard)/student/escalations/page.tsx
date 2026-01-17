'use client'

import { StudentNav } from '@/components/student/StudentNav'
import { StudentEscalations } from '@/components/student/StudentEscalations'

export default function StudentEscalationsPage() {
  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Escalations</h1>
          <p className="text-muted-foreground">
            View your escalated questions and professor responses
          </p>
        </div>
        <StudentEscalations />
      </div>
    </>
  )
}

