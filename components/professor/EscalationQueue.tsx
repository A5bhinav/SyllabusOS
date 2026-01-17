'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getEscalations, resolveEscalation } from '@/lib/api/escalations'
import type { Escalation } from '@/types/api'
import { CheckCircle2, Clock, Mail, User } from 'lucide-react'
import { format } from 'date-fns'

export function EscalationQueue() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    loadEscalations()
  }, [])

  async function loadEscalations() {
    try {
      setLoading(true)
      setError(null)
      const data = await getEscalations()
      // Filter for pending escalations
      const pending = data.filter(e => e.status === 'pending')
      setEscalations(pending)
    } catch (err) {
      console.error('Error loading escalations:', err)
      setError('Failed to load escalations')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve(id: string) {
    try {
      setResolvingId(id)
      await resolveEscalation(id)
      await loadEscalations()
    } catch (err) {
      console.error('Error resolving escalation:', err)
      setError('Failed to resolve escalation')
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Escalation Queue</CardTitle>
          <CardDescription>View student escalations requiring your attention</CardDescription>
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
        <CardTitle>Escalation Queue</CardTitle>
        <CardDescription>View student escalations requiring your attention</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {escalations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No pending escalations. All clear!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(escalation.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    {escalation.studentName && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {escalation.studentName}
                        </span>
                      </div>
                    )}
                    
                    {escalation.studentEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {escalation.studentEmail}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <p className="text-sm font-medium mb-1">Query:</p>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        "{escalation.query}"
                      </p>
                    </div>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolve(escalation.id)}
                  disabled={resolvingId === escalation.id}
                  className="w-full"
                >
                  {resolvingId === escalation.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark as Resolved
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
