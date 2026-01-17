'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getEscalations, resolveEscalation, updateEscalationResponse } from '@/lib/api/escalations'
import type { Escalation } from '@/types/api'
import { CheckCircle2, Clock, Mail, User, MessageSquare, Send } from 'lucide-react'
import { format } from 'date-fns'

export function EscalationQueue() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({})
  const [submittingResponse, setSubmittingResponse] = useState<string | null>(null)

  useEffect(() => {
    loadEscalations()
  }, [])

  async function loadEscalations() {
    try {
      setLoading(true)
      setError(null)
      const response = await getEscalations()
      // Handle new response format with escalations array
      const escalationsList = response.escalations || []
      // Filter for pending escalations
      const pending = escalationsList.filter(e => e.status === 'pending')
      setEscalations(pending)
      // Store patterns if available (for future use in UI)
      if (response.patterns && response.patterns.length > 0) {
        // Patterns available: response.patterns
        // Example: [{ category: 'Extension Request', count: 3 }]
      }
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

  async function handleSubmitResponse(id: string) {
    const response = responseTexts[id]?.trim()
    if (!response) {
      return
    }

    try {
      setSubmittingResponse(id)
      await updateEscalationResponse(id, response, 'resolved')
      // Clear the response text
      setResponseTexts(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      await loadEscalations()
    } catch (err) {
      console.error('Error submitting response:', err)
      setError('Failed to submit response')
    } finally {
      setSubmittingResponse(null)
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

                    {escalation.response && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium mb-1 text-green-700 dark:text-green-400">Your Response:</p>
                        <p className="text-sm bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-800">
                          {escalation.response}
                        </p>
                        {escalation.respondedAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Responded {format(new Date(escalation.respondedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {!escalation.response ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your response to the student..."
                      value={responseTexts[escalation.id] || ''}
                      onChange={(e) => setResponseTexts(prev => ({
                        ...prev,
                        [escalation.id]: e.target.value
                      }))}
                      className="min-h-[100px]"
                      disabled={submittingResponse === escalation.id}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSubmitResponse(escalation.id)}
                        disabled={submittingResponse === escalation.id || !responseTexts[escalation.id]?.trim()}
                        className="flex-1"
                      >
                        {submittingResponse === escalation.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send Response
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(escalation.id)}
                        disabled={resolvingId === escalation.id || submittingResponse === escalation.id}
                      >
                        {resolvingId === escalation.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Resolved
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
