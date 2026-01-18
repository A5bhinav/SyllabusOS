'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageSquare, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export interface RecentQuestion {
  id: string
  question: string
  timestamp: Date
  status: 'answered' | 'escalated' | 'pending'
  escalationId?: string
}

interface QuestionHistoryProps {
  questions: RecentQuestion[]
  courseId: string
}

export function QuestionHistory({ questions, courseId }: QuestionHistoryProps) {
  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Recent Questions</CardTitle>
            <CardDescription className="text-base mt-1">
              Your recent questions and their status
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {questions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No questions yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Start asking questions about your course
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href={`/student/chat?courseId=${courseId}`}>
                Ask a Question
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                className="rounded-lg border p-4 hover:shadow-md transition-shadow space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-foreground flex-1 line-clamp-2">
                    {question.question}
                  </p>
                  <div className="flex-shrink-0">
                    {question.status === 'answered' && (
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    )}
                    {question.status === 'escalated' && (
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                    {question.status === 'pending' && (
                      <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize font-medium">{question.status}</span>
                  <span>{format(question.timestamp, 'MMM d, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
