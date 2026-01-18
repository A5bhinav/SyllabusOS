'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import { format } from 'date-fns'

export interface UpcomingDeadline {
  title: string
  date: Date
  source: 'announcement' | 'schedule'
  weekNumber: number
}

interface UpcomingDeadlinesProps {
  deadlines: UpcomingDeadline[]
}

export function UpcomingDeadlines({ deadlines }: UpcomingDeadlinesProps) {
  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Upcoming Deadlines</CardTitle>
            <CardDescription className="text-base mt-1">
              Important dates and assignments
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No upcoming deadlines</p>
            <p className="text-xs text-muted-foreground">
              Check announcements for important dates
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {deadlines.map((deadline, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 hover:shadow-md transition-shadow space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-foreground mb-1">
                      {deadline.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Week {deadline.weekNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-primary">
                  {format(deadline.date, 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
