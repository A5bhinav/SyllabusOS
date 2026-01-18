'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StudentNav } from '@/components/student/StudentNav'
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  ExternalLink, 
  Star,
  BarChart3,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react'
import Link from 'next/link'
import type { CourseFeedback } from '@/app/api/courses/feedback/[courseCode]/route'

export default function CourseFeedbackPage() {
  const params = useParams()
  const router = useRouter()
  const courseCode = params.courseCode as string
  const [feedback, setFeedback] = useState<CourseFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFeedback() {
      if (!courseCode) {
        setError('Course code is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Ensure course code is properly encoded
        const encodedCode = encodeURIComponent(courseCode)
        const response = await fetch(`/api/courses/feedback/${encodedCode}`)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.error || 'Failed to load course feedback'
          setError(errorMessage)
          return
        }

        const data = await response.json()
        setFeedback(data)
      } catch (err: any) {
        console.error('Error loading feedback:', err)
        setError(err.message || 'Failed to load course feedback')
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [courseCode])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-600 bg-green-50'
      case 'Moderate':
        return 'text-yellow-600 bg-yellow-50'
      case 'Hard':
        return 'text-orange-600 bg-orange-50'
      case 'Very Hard':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </>
    )
  }

  if (error || !feedback) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error || 'Course feedback not available'}</p>
              <Button onClick={() => router.back()} className="mt-4" variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Button 
          onClick={() => router.back()} 
          variant="ghost" 
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Browse
        </Button>

        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{feedback.courseName}</h1>
              <p className="text-muted-foreground text-lg">{feedback.courseCode}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Difficulty</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(feedback.difficulty)}`}>
                {feedback.difficulty}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Grade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{feedback.averageGrade}</div>
            </CardContent>
          </Card>

          {feedback.professorRating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Professor Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-2xl font-bold">{feedback.professorRating}/5.0</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Grade Distribution */}
        {feedback.gradeDistribution && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Grade Distribution (Past Semesters)</CardTitle>
              </div>
              <CardDescription>Historical grade distribution for this course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(feedback.gradeDistribution).map(([grade, percentage]) => (
                  <div key={grade} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Grade {grade}</span>
                      <span className="text-muted-foreground">{percentage}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          grade === 'A' ? 'bg-green-500' :
                          grade === 'B' ? 'bg-blue-500' :
                          grade === 'C' ? 'bg-yellow-500' :
                          grade === 'D' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positive and Negative Feedback */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Positive Feedback */}
          {feedback.positiveFeedback && feedback.positiveFeedback.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                  <CardTitle>What Students Like</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.positiveFeedback.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Negative Feedback */}
          {feedback.negativeFeedback && feedback.negativeFeedback.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ThumbsDown className="h-5 w-5 text-red-600" />
                  <CardTitle>Common Challenges</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.negativeFeedback.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{item}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reddit Posts - Based on Reddit Reviews */}
        {feedback.redditPosts && feedback.redditPosts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle>Based on Reddit Reviews</CardTitle>
              </div>
              <CardDescription>Student discussions about this course from r/UCSC</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedback.redditPosts.map((post, idx) => (
                  <a
                    key={idx}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-sm flex-1">{post.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        <span>↑ {post.score}</span>
                        <span>•</span>
                        <span>{post.date}</span>
                      </div>
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-primary mt-2">
                      <span>View on Reddit</span>
                      <ExternalLink className="h-3 w-3" />
                    </div>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Data sourced from r/UCSC and public course information</p>
        </div>
      </div>
    </>
  )
}
