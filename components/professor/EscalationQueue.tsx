'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getEscalations, resolveEscalation, updateEscalationResponse } from '@/lib/api/escalations'
import type { Escalation } from '@/types/api'
import { CheckCircle2, Clock, Mail, User, MessageSquare, Send, Sparkles, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { getCategoryColor, type EscalationCategory } from '@/lib/utils/escalation-categorizer'

export function EscalationQueue() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [responseTexts, setResponseTexts] = useState<Record<string, string>>({})
  const [submittingResponse, setSubmittingResponse] = useState<string | null>(null)
  const [suggestedResponses, setSuggestedResponses] = useState<Record<string, string>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({})
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, boolean>>({})

  const loadEscalations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getEscalations()
      // Handle new response format with escalations array
      const escalationsList = response.escalations || []
      // Filter for pending escalations
      const pending = escalationsList.filter(e => e.status === 'pending')
      setEscalations(pending)
    } catch (err) {
      console.error('Error loading escalations:', err)
      setError('Failed to load escalations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEscalations()
  }, [loadEscalations])

  const handleResolve = useCallback(async (id: string) => {
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
  }, [loadEscalations])

  const handleGetSuggestion = useCallback(async (escalationId: string, query: string, category: string) => {
    try {
      setLoadingSuggestions(prev => ({ ...prev, [escalationId]: true }))
      // Find the escalation to get courseId
      const escalation = escalations.find(e => e.id === escalationId)
      const response = await fetch('/api/escalations/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          category,
          courseId: escalation?.courseId,
          escalationId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to get suggestion')
      }
      
      const data = await response.json()
      setSuggestedResponses(prev => ({
        ...prev,
        [escalationId]: data.suggestion,
      }))
    } catch (err) {
      console.error('Error getting suggestion:', err)
      setError('Failed to generate AI suggestion')
    } finally {
      setLoadingSuggestions(prev => {
        const next = { ...prev }
        delete next[escalationId]
        return next
      })
    }
  }, [escalations])

  const handleSubmitResponse = useCallback(async (id: string) => {
    const response = responseTexts[id]?.trim()
    if (!response) {
      return
    }

    try {
      setSubmittingResponse(id)
      await updateEscalationResponse(id, response, 'resolved')
      // Clear the response text and suggestion
      setResponseTexts(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setSuggestedResponses(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setDismissedSuggestions(prev => {
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
  }, [responseTexts, loadEscalations])

  if (loading) {
    return (
      <Card className="h-full flex flex-col border-2 hover:border-orange-500/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Escalation Queue</CardTitle>
              <CardDescription className="mt-1">View student escalations requiring your attention</CardDescription>
            </div>
          </div>
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
    <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-200 border-2 hover:border-orange-500/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Escalation Queue</CardTitle>
            <CardDescription className="mt-1">View student escalations requiring your attention</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {escalations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              No pending escalations
            </p>
            <p className="text-xs text-muted-foreground">
              All clear! Check back later for new escalations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {escalations.map((escalation) => (
              <div
                key={escalation.id}
                className="rounded-lg border-2 p-4 space-y-3 hover:border-orange-500/30 hover:shadow-md transition-all duration-200 bg-card"
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
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">Query:</p>
                        {escalation.category && (
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              getCategoryColor(escalation.category as EscalationCategory) === 'blue'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : getCategoryColor(escalation.category as EscalationCategory) === 'red'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                : getCategoryColor(escalation.category as EscalationCategory) === 'yellow'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : getCategoryColor(escalation.category as EscalationCategory) === 'green'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}
                          >
                            {escalation.category}
                          </span>
                        )}
                      </div>
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
                    {suggestedResponses[escalation.id] && !dismissedSuggestions[escalation.id] && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">AI Suggested Response:</p>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 bg-white dark:bg-gray-900 p-2 rounded border border-blue-200 dark:border-blue-700">
                          {suggestedResponses[escalation.id]}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResponseTexts(prev => ({
                                ...prev,
                                [escalation.id]: suggestedResponses[escalation.id]
                              }))
                              // Auto-dismiss when using the suggestion
                              setDismissedSuggestions(prev => ({
                                ...prev,
                                [escalation.id]: true
                              }))
                            }}
                            className="text-xs"
                          >
                            Use This
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDismissedSuggestions(prev => ({
                                ...prev,
                                [escalation.id]: true
                              }))
                            }}
                            className="text-xs"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Your Response:</label>
                      {(!suggestedResponses[escalation.id] || dismissedSuggestions[escalation.id]) && !loadingSuggestions[escalation.id] && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleGetSuggestion(escalation.id, escalation.query, escalation.category || 'Other')
                            // Reset dismissal when getting a new suggestion
                            setDismissedSuggestions(prev => {
                              const next = { ...prev }
                              delete next[escalation.id]
                              return next
                            })
                          }}
                          className="text-xs h-7"
                          disabled={loadingSuggestions[escalation.id]}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Get AI Suggestion
                        </Button>
                      )}
                      {loadingSuggestions[escalation.id] && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <LoadingSpinner size="sm" />
                          Generating...
                        </span>
                      )}
                    </div>
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
