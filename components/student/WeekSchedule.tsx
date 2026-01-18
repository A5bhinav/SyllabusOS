'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'
import { format } from 'date-fns'

export interface WeekScheduleData {
  weekNumber: number
  topic: string
  assignments: string | null
  readings: string | null
  dueDate: string | null
}

interface WeekScheduleProps {
  schedule: WeekScheduleData | null
}

export function WeekSchedule({ schedule }: WeekScheduleProps) {
  if (!schedule) {
    return null
  }

  return (
    <Card className="border-2 shadow-lg lg:col-span-2">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Week {schedule.weekNumber} Schedule</CardTitle>
            <CardDescription className="text-base mt-1">
              What&apos;s happening this week
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Topic</h3>
          <p className="text-base text-foreground">{schedule.topic}</p>
        </div>
        
        {schedule.assignments && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Assignments</h3>
            <p className="text-base text-foreground">{schedule.assignments}</p>
          </div>
        )}

        {schedule.readings && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Readings</h3>
            <p className="text-base text-foreground">{schedule.readings}</p>
          </div>
        )}

        {schedule.dueDate && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Due Date</h3>
            <p className="text-base text-foreground">
              {format(new Date(schedule.dueDate), 'MMMM d, yyyy')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
