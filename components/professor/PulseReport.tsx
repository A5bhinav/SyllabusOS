'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getPulseReport } from '@/lib/api/pulse'
import type { PulseResponse } from '@/types/api'
import { TrendingUp, AlertCircle, MessageSquare, Clock, PieChart as PieChartIcon, RefreshCw } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

export function PulseReport() {
  const [pulseData, setPulseData] = useState<PulseResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPulseData = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    loadPulseData()
  }, [loadPulseData])

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

  const metrics = pulseData.metrics || {
    totalQueriesToday: 0,
    escalationsPending: 0,
    avgResponseTime: 0,
  }

  // Chart data - removed useMemo to avoid infinite re-render loops
  // The computation is cheap (small arrays), and memoization was causing React error #310
  const lineChartData = pulseData.dailyTrends?.map((trend) => ({
    date: format(new Date(trend.date), 'MMM d'),
    fullDate: trend.date,
    queries: trend.count,
  })) || []

  const pieChartData = pulseData.queryDistribution
    ? [
        { name: 'Policy', value: pulseData.queryDistribution.POLICY, color: '#3b82f6' },
        { name: 'Concept', value: pulseData.queryDistribution.CONCEPT, color: '#10b981' },
        { name: 'Escalated', value: pulseData.queryDistribution.ESCALATE, color: '#f59e0b', description: 'Personal issues or complex problems requiring professor review' },
      ].filter((item) => item.value > 0)
    : []

  return (
    <Card className="overflow-hidden h-full flex flex-col hover:shadow-lg transition-all duration-200 border-2 hover:border-purple-500/20">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle className="break-words text-xl">Pulse Report</CardTitle>
                <CardDescription className="break-words text-wrap mt-1">Visual analytics dashboard for student questions and activity</CardDescription>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPulseData}
            disabled={loading}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-w-full overflow-visible">
        <div className="space-y-8">
          {/* Main Statistics - Large Colored Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border-2 p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Queries</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
              </div>
              <p className="text-4xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                {pulseData.totalQueries}
              </p>
              {metrics.totalQueriesToday > 0 && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">{metrics.totalQueriesToday}</span> today
                </p>
              )}
            </div>
            
            <div className="rounded-lg border-2 p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Escalations</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </div>
                </div>
              </div>
              <p className="text-4xl font-bold text-orange-900 dark:text-orange-100 mb-2">
                {pulseData.escalationCount}
              </p>
              {metrics.escalationsPending > 0 && (
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <span className="font-semibold">{metrics.escalationsPending}</span> pending
                </p>
              )}
            </div>
          </div>

          {/* Charts Section - Stacked */}
          <div className="space-y-6">
            {/* Query Distribution - Pie Chart */}
            {pulseData.queryDistribution && (
              <div className="rounded-lg border p-6 bg-background w-full max-w-full overflow-visible">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <PieChartIcon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold break-words text-wrap">Query Distribution</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-8 max-w-2xl break-words text-wrap">
                  Shows how student questions are categorized. <span className="font-medium text-foreground">Escalated</span> queries are personal issues, emergencies, or complex problems that require your direct attention.
                </p>
                {pieChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] rounded-lg border bg-muted/50">
                    <p className="text-sm text-muted-foreground">No query data available.</p>
                  </div>
                ) : (
                  <div className="w-full max-w-full mt-4">
                    <div className="h-[300px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 10, right: 20, bottom: 60, left: 20 }}>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="45%"
                          labelLine={false}
                          label={false}
                          outerRadius={70}
                          innerRadius={25}
                          fill="#8884d8"
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                          paddingAngle={2}
                        >
                            {pieChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.color}
                                stroke={entry.color}
                                strokeWidth={2}
                                style={{ 
                                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                  cursor: 'pointer',
                                  transition: 'opacity 0.2s'
                                }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              padding: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              maxWidth: '200px',
                              wordWrap: 'break-word',
                            }}
                            formatter={(value: number | undefined, name: string | undefined) => [
                              `${value ?? 0} ${value === 1 ? 'query' : 'queries'}`,
                              name === 'Escalated' 
                                ? 'Needs Professor Review' 
                                : name || ''
                            ]}
                            labelStyle={{ 
                              fontWeight: 600, 
                              marginBottom: '4px',
                              wordBreak: 'break-word'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom"
                            height={50}
                            iconType="circle"
                            wrapperStyle={{ 
                              paddingTop: '10px',
                              fontSize: '12px',
                              width: '100%',
                              maxWidth: '100%',
                            }}
                            formatter={(value: string) => {
                              // Better labels for legend with percentage
                              const entry = pieChartData.find(d => d.name === value)
                              const total = pieChartData.reduce((sum, d) => sum + d.value, 0)
                              const percentage = entry && total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0'
                              if (value === 'Escalated') {
                                return `Needs Professor (${percentage}%)`
                              }
                              return `${value} (${percentage}%)`
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily Trends - Line Chart */}
            {pulseData.dailyTrends && pulseData.dailyTrends.length > 0 && (
              <div className="rounded-lg border p-6 bg-background overflow-hidden w-full max-w-full">
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold break-words text-wrap">Questions Over Time (Last 14 Days)</h3>
                </div>
                {lineChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] rounded-lg border bg-muted/50">
                    <p className="text-sm text-muted-foreground">No trend data available.</p>
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-hidden">
                    <div className="h-[250px] min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart 
                          data={lineChartData}
                          margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
                        >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="hsl(var(--muted))"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          width={50}
                          label={{ 
                            value: 'Queries', 
                            angle: -90, 
                            position: 'insideLeft',
                            style: { textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))' }
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            maxWidth: '250px',
                            wordWrap: 'break-word',
                          }}
                          formatter={(value: number | undefined) => [`${value ?? 0} queries`, 'Queries']}
                          labelStyle={{ 
                            fontWeight: 600, 
                            marginBottom: '4px', 
                            color: 'hsl(var(--foreground))',
                            wordBreak: 'break-word'
                          }}
                          labelFormatter={(label) => {
                            const data = lineChartData.find((d) => d.date === label)
                            return data?.fullDate ? format(new Date(data.fullDate), 'EEEE, MMM d, yyyy') : label
                          }}
                          cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="queries"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ 
                            fill: '#3b82f6', 
                            r: 5,
                            strokeWidth: 2,
                            stroke: '#fff'
                          }}
                          activeDot={{ 
                            r: 8, 
                            stroke: '#3b82f6',
                            strokeWidth: 2,
                            fill: '#fff'
                          }}
                          animationDuration={800}
                          animationBegin={0}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
