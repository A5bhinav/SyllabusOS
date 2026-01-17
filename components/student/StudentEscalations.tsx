'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getEscalations } from '@/lib/api/escalations'
import type { Escalation } from '@/types/api'
import { Clock, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'

export function StudentEscalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEscalations()
  }, [])

  async function loadEscalations() {
    try {
      setLoading(true)
      setError(null)
      const data = await getEscalations()
      // Sort by created date, newest first
      const sorted = data.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setEscalations(sorted)
    } catch (err) {
      console.error('Error loading escalations:', err)
      setError('Failed to load escalations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Escalations</CardTitle>
          <CardDescription>Questions that have been escalated to your professor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Escalations</CardTitle>
        <CardDescription>Questions that have been escalated to your professor</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {escalations.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              You haven't escalated any questions yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Questions that need personal attention are automatically escalated to your professor.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className={`rounded-lg border p-4 space-y-3 ${
                  escalation.status === 'resolved' 
                    ? 'bg-muted/30 border-green-200 dark:border-green-800' 
                    : 'bg-background'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {escalation.status === 'resolved' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      )}
                      <span className={`text-xs font-medium ${
                        escalation.status === 'resolved' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {escalation.status === 'resolved' ? 'Resolved' : 'Pending'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {format(new Date(escalation.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-1">Your Question:</p>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        "{escalation.query}"
                      </p>
                    </div>

                    {escalation.response ? (
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium text-primary">Professor's Response:</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 p-3 rounded">
                          <p className="text-sm whitespace-pre-wrap">{escalation.response}</p>
                        </div>
                        {escalation.respondedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Responded {format(new Date(escalation.respondedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    ) : escalation.status === 'pending' ? (
                      <div className="pt-2 border-t">
                        <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            Your question is pending review. The professor will respond soon.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

