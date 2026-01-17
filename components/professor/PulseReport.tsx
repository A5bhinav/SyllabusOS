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

  // Prepare data for charts
  const barChartData = pulseData.topConfusions.slice(0, 5).map((confusion) => ({
    name: confusion.topic.length > 20 ? confusion.topic.substring(0, 20) + '...' : confusion.topic,
    fullName: confusion.topic,
    queries: confusion.count,
  }))

  const lineChartData =
    pulseData.dailyTrends?.map((trend) => ({
      date: format(new Date(trend.date), 'MMM d'),
      fullDate: trend.date,
      queries: trend.count,
    })) || []

  const pieChartData = pulseData.queryDistribution
    ? [
        { name: 'Policy', value: pulseData.queryDistribution.POLICY, color: '#3b82f6' },
        { name: 'Concept', value: pulseData.queryDistribution.CONCEPT, color: '#10b981' },
        { name: 'Escalated', value: pulseData.queryDistribution.ESCALATE, color: '#f59e0b' },
      ].filter((item) => item.value > 0)
    : []

  const metrics = pulseData.metrics || {
    totalQueriesToday: 0,
    escalationsPending: 0,
    avgResponseTime: 0,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pulse Report</CardTitle>
        <CardDescription>Visual analytics dashboard for student questions and activity</CardDescription>
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
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{pulseData.totalQueries}</p>
              {metrics.totalQueriesToday > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {metrics.totalQueriesToday} today
                </p>
              )}
            </div>
            
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Escalations</span>
              </div>
              {barChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    No data available yet. Student questions will appear here once they start asking.
                  </p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="name"
                        className="text-xs"
                        tick={{ fill: 'currentColor' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: number | undefined) => [`${value ?? 0} queries`, 'Queries']}
                        labelFormatter={(label) => {
                          const data = barChartData.find((d) => d.name === label)
                          return data?.fullName || label
                        }}
                      />
                      <Bar dataKey="queries" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Pie Chart - Query Distribution */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Query Distribution</h4>
              </div>
              {pieChartData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] rounded-lg border bg-muted/50">
                  <p className="text-sm text-muted-foreground">No query data available.</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px',
                        }}
                        formatter={(value: number | undefined) => [`${value ?? 0} queries`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
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
