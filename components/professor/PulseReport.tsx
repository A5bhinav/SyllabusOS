'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getPulseReport } from '@/lib/api/pulse'
import type { PulseResponse } from '@/types/api'
import { TrendingUp, AlertCircle, MessageSquare, Clock, Zap } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format } from 'date-fns'

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
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Queries</span>
              </div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{pulseData.totalQueries}</p>
              {metrics.totalQueriesToday > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {metrics.totalQueriesToday} today
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Escalations</span>
              </div>
              <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                {pulseData.escalationCount}
              </p>
              {metrics.escalationsPending > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {metrics.escalationsPending} pending
                </p>
              )}
            </div>

            <div className="rounded-lg border bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Queries Today</span>
              </div>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {metrics.totalQueriesToday}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Last 24 hours</p>
            </div>

            <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Avg Response</span>
              </div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {metrics.avgResponseTime > 0 ? `${metrics.avgResponseTime}s` : 'N/A'}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Response time</p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart - Top 5 Most Asked Topics */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Top 5 Most Asked Topics</h4>
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

          {/* Line Chart - Questions Over Time */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-semibold text-sm">Questions Over Time (Last 7 Days)</h4>
            </div>
            {lineChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] rounded-lg border bg-muted/50">
                <p className="text-sm text-muted-foreground">No trend data available yet.</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'currentColor' }}
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
                        const data = lineChartData.find((d) => d.date === label)
                        return data?.fullDate ? format(new Date(data.fullDate), 'MMMM d, yyyy') : label
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="queries"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Queries"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top Confusions List (Fallback/Documentation) */}
          {pulseData.topConfusions.length > 0 && (
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">Top Confusions Details</h4>
              </div>
              <ul className="space-y-2">
                {pulseData.topConfusions.slice(0, 5).map((confusion, index) => (
                  <li key={index} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{confusion.topic}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {confusion.count} {confusion.count === 1 ? 'question' : 'questions'}
                        </p>
                        {confusion.examples.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {confusion.examples.slice(0, 2).map((example, i) => (
                              <p key={i} className="text-xs text-muted-foreground italic truncate">
                                • &quot;{example}&quot;
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
