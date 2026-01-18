'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getEscalations } from '@/lib/api/escalations'
import type { Escalation } from '@/types/api'
import { Clock, CheckCircle2, MessageSquare, AlertCircle, Filter, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type FilterStatus = 'pending' | 'resolved'

export function StudentEscalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('resolved')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewedResponses, setViewedResponses] = useState<Set<string>>(new Set())

  // Filter escalations by status
  const filteredEscalations = escalations.filter(escalation => {
    return escalation.status === filterStatus
  })

  // Calculate current escalation early (needed for useEffect dependency)
  const currentEscalation = filteredEscalations[currentIndex] || null

  // Load viewed responses from localStorage on mount, then load escalations
  useEffect(() => {
    const stored = localStorage.getItem('escalation_viewed_responses')
    if (stored) {
      try {
        const viewed = JSON.parse(stored) as string[]
        setViewedResponses(new Set(viewed))
        // Load escalations after viewed responses are loaded
        loadEscalations(new Set(viewed))
      } catch (err) {
        console.error('Error loading viewed responses:', err)
        loadEscalations(new Set())
      }
    } else {
      loadEscalations(new Set())
    }
  }, [])

  // Reset to first escalation when filter changes
  useEffect(() => {
    setCurrentIndex(0)
  }, [filterStatus, filteredEscalations.length])

  async function loadEscalations(viewedSet?: Set<string>) {
    try {
      setLoading(true)
      setError(null)
      const data = await getEscalations()
      // Get escalations array from response
      const escalationsList = data.escalations || []
      // Sort: resolved first, then pending. Within each group, sort by created date (newest first)
      const sorted = escalationsList.sort((a, b) => {
        // Resolved comes before pending
        if (a.status === 'resolved' && b.status === 'pending') return -1
        if (a.status === 'pending' && b.status === 'resolved') return 1
        // Within same status, sort by date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      setEscalations(sorted)
      
      // Use provided viewedSet or current state, but ensure it's available
      const currentViewed = viewedSet || viewedResponses
      
      // Only dispatch event if we have valid data
      if (sorted && currentViewed) {
        // Trigger notification update in parent (via custom event)
        window.dispatchEvent(new CustomEvent('escalations-updated', { 
          detail: { escalations: sorted, viewedResponses: currentViewed } 
        }))
      }
    } catch (err) {
      console.error('Error loading escalations:', err)
      setError('Failed to load escalations')
    } finally {
      setLoading(false)
    }
  }

  // Mark response as viewed when user sees it
  useEffect(() => {
    if (currentEscalation?.response && currentEscalation.id) {
      // Check if already viewed using current state
      setViewedResponses(prevViewed => {
        // Mark as viewed when escalation with response is displayed
        if (!prevViewed.has(currentEscalation.id!)) {
          const newViewed = new Set(prevViewed)
          newViewed.add(currentEscalation.id!)
          
          // Save to localStorage
          localStorage.setItem('escalation_viewed_responses', JSON.stringify(Array.from(newViewed)))
          
          // Trigger notification update - use current escalations state via closure
          // Delay slightly to ensure state updates are processed
          requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('escalations-updated', { 
              detail: { 
                escalations: escalations, 
                viewedResponses: newViewed 
              } 
            }))
          })
          
          return newViewed
        }
        return prevViewed
      })
    }
  }, [currentEscalation?.id, currentEscalation?.response])

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

  const pendingCount = escalations.filter(e => e.status === 'pending').length
  const resolvedCount = escalations.filter(e => e.status === 'resolved').length
  // Only count responses that haven't been viewed
  const unviewedResponsesCount = escalations.filter(e => 
    e.response && 
    e.status === 'resolved' && 
    !viewedResponses.has(e.id)
  ).length

  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < filteredEscalations.length - 1

  function handlePrevious() {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  function handleNext() {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Escalations</CardTitle>
            <CardDescription>Questions that have been escalated to your professor</CardDescription>
          </div>
          {escalations.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                <Clock className="h-3 w-3 mr-1" />
                Pending ({pendingCount})
              </Button>
              <Button
                variant={filterStatus === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('resolved')}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolved ({resolvedCount})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {filteredEscalations.length === 0 ? (
          <div className="text-center py-12">
            {escalations.length === 0 ? (
              <>
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No escalations yet
                </p>
                <p className="text-xs text-muted-foreground">
                  Questions that need personal attention are automatically escalated to your professor.
                </p>
              </>
            ) : (
              <>
                <Filter className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  No {filterStatus} escalations found
                </p>
                <p className="text-xs text-muted-foreground">
                  Try selecting a different filter.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Navigation Arrows */}
            {filteredEscalations.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="h-10 w-10"
                  aria-label="Previous escalation"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">
                    {currentIndex + 1} of {filteredEscalations.length}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="h-10 w-10"
                  aria-label="Next escalation"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Current Escalation Card */}
            {currentEscalation && (
              <Card
                className={cn(
                  'transition-shadow hover:shadow-md',
                  currentEscalation.status === 'resolved' 
                    ? 'border-green-200 dark:border-green-800' 
                    : 'border-yellow-200 dark:border-yellow-800'
                )}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Status and Date Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {currentEscalation.status === 'resolved' ? (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                              Resolved
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700">
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                              Pending
                            </span>
                          </div>
                        )}
                        {currentEscalation.response && !viewedResponses.has(currentEscalation.id) && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                            <Bell className="h-3 w-3 text-primary" />
                            <span className="text-xs font-semibold text-primary">
                              New Response
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(currentEscalation.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    
                    {/* Question Section */}
                    <div className="pt-2 pb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Your Question
                      </p>
                      <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary">
                        <p className="text-sm text-foreground leading-relaxed">
                          {currentEscalation.query}
                        </p>
                      </div>
                    </div>

                    {/* Response Section */}
                    {currentEscalation.response ? (
                      <div className="pt-3 border-t space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          <p className="text-sm font-semibold text-primary">Professor's Response</p>
                        </div>
                        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-4">
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {currentEscalation.response}
                          </p>
                        </div>
                        {currentEscalation.respondedAt && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Responded {format(new Date(currentEscalation.respondedAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        )}
                      </div>
                    ) : currentEscalation.status === 'pending' ? (
                      <div className="pt-3 border-t">
                        <div className="flex items-start gap-3 bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                              Pending Review
                            </p>
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              Your question is pending review. The professor will respond soon.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Dots (optional indicator) */}
            {filteredEscalations.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {filteredEscalations.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'h-2 w-2 rounded-full transition-all',
                      index === currentIndex
                        ? 'bg-primary w-8'
                        : 'bg-muted hover:bg-muted-foreground/50'
                    )}
                    aria-label={`Go to escalation ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

