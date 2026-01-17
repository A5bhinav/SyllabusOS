'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getPulseReport } from '@/lib/api/pulse'
import type { PulseResponse } from '@/types/api'
import { TrendingUp, AlertCircle, MessageSquare, Clock, PieChart } from 'lucide-react'

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
          {/* Key Metrics - Number Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Queries Today</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.metrics?.totalQueriesToday || 0}</p>
            </div>
            
            <div className={`rounded-lg border p-4 ${
              (pulseData.metrics?.escalationsPending || 0) > 0 
                ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' 
                : 'bg-background'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className={`h-4 w-4 ${
                  (pulseData.metrics?.escalationsPending || 0) > 0 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-muted-foreground'
                }`} />
                <span className="text-xs text-muted-foreground">Escalations Pending</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.metrics?.escalationsPending || 0}</p>
            </div>
            
            <div className="rounded-lg border p-4 bg-background">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Avg Response Time</span>
              </div>
              <p className="text-2xl font-bold">
                {pulseData.metrics?.avgResponseTime ? `${pulseData.metrics.avgResponseTime}ms` : 'N/A'}
              </p>
            </div>
            
            <div className="rounded-lg border p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Most Confused Topic</span>
              </div>
              <p className="text-sm font-medium line-clamp-2">
                {pulseData.metrics?.mostConfusedTopic || 'N/A'}
              </p>
            </div>
          </div>

          {/* Overall Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Queries (All Time)</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.totalQueries}</p>
            </div>
            
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Escalations</span>
              </div>
              <p className="text-2xl font-bold">{pulseData.escalationCount}</p>
            </div>
          </div>

          {/* Query Distribution */}
          {pulseData.queryDistribution && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Query Distribution</h4>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-xs text-muted-foreground mb-1">POLICY</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {pulseData.queryDistribution.POLICY}
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950/20">
                  <p className="text-xs text-muted-foreground mb-1">CONCEPT</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    {pulseData.queryDistribution.CONCEPT}
                  </p>
                </div>
                <div className="rounded-lg border p-3 bg-orange-50 dark:bg-orange-950/20">
                  <p className="text-xs text-muted-foreground mb-1">ESCALATE</p>
                  <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                    {pulseData.queryDistribution.ESCALATE}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Trends Info */}
          {pulseData.dailyTrends && pulseData.dailyTrends.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Questions Over Time (Last 14 Days)</h4>
              </div>
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  Data available for visualization. Total queries across 14 days: {' '}
                  <span className="font-semibold">
                    {pulseData.dailyTrends.reduce((sum, day) => sum + day.count, 0)}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Average per day: {' '}
                  <span className="font-semibold">
                    {Math.round(pulseData.dailyTrends.reduce((sum, day) => sum + day.count, 0) / pulseData.dailyTrends.length)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
