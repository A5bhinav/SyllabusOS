'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getPulseReport } from '@/lib/api/pulse'
import type { PulseResponse } from '@/types/api'
import { TrendingUp, AlertCircle, MessageSquare } from 'lucide-react'

export function PulseReport() {
  const [pulseData, setPulseData] = useState<PulseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPulseData()
  }, [])

  async function loadPulseData() {
    try {
      setLoading(true)
      setError(null)
      const data = await getPulseReport()
      setPulseData(data)
    } catch (err) {
      console.error('Error loading pulse data:', err)
      setError('Failed to load pulse report')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pulse Report</CardTitle>
          <CardDescription>Insights into student questions and confusions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !pulseData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pulse Report</CardTitle>
          <CardDescription>Insights into student questions and confusions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error || 'Failed to load pulse report'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pulse Report</CardTitle>
        <CardDescription>Insights into student questions and confusions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Queries</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.totalQueries}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Escalations</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.escalationCount}</p>
            </div>
          </div>

          {/* Top Confusions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">Top Student Confusions</h4>
            </div>
            
            {pulseData.topConfusions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No data available yet. Student questions will appear here once they start asking.
              </p>
            ) : (
              <ul className="space-y-3">
                {pulseData.topConfusions.slice(0, 3).map((confusion, index) => (
                  <li key={index} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{confusion.topic}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {confusion.count} {confusion.count === 1 ? 'question' : 'questions'}
                        </p>
                        {confusion.examples.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {confusion.examples.slice(0, 2).map((example, i) => (
                              <p key={i} className="text-xs text-muted-foreground italic">
                                • "{example}"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
