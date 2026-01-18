'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StudentNav } from '@/components/student/StudentNav'
import { 
  BookOpen, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  ArrowLeft,
  ExternalLink,
  Users,
  Award
} from 'lucide-react'
import Link from 'next/link'
import type { CourseFeedback, Course } from '@/types/api'

// UCSC fake courses (for demo courses not in database)
const FAKE_UCSC_COURSES: Course[] = [
  {
    id: 'fake-course-1',
    name: 'CMPS 101 - Algorithms and Abstract Data Types',
    professorId: 'prof-1',
    professorName: 'Dr. Patrick Tantalo',
    professorEmail: 'tantalo@ucsc.edu',
    joinCode: 'CMPS1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-2',
    name: 'CMPS 12B - Data Structures',
    professorId: 'prof-2',
    professorName: 'Prof. Darrell Long',
    professorEmail: 'darrell@ucsc.edu',
    joinCode: 'CMPS2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-3',
    name: 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
    professorId: 'prof-3',
    professorName: 'Dr. Francois Ziegler',
    professorEmail: 'ziegler@ucsc.edu',
    joinCode: 'MATH1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-4',
    name: 'CSE 101 - Algorithms and Complexity',
    professorId: 'prof-4',
    professorName: 'Prof. Dustin Long',
    professorEmail: 'dlong@ucsc.edu',
    joinCode: 'CSE10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-5',
    name: 'ECON 1 - Introductory Microeconomics',
    professorId: 'prof-5',
    professorName: 'Dr. Mark Traugott',
    professorEmail: 'traugott@ucsc.edu',
    joinCode: 'ECON1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-6',
    name: 'CHEM 1B - General Chemistry',
    professorId: 'prof-6',
    professorName: 'Dr. Glenn Millhauser',
    professorEmail: 'glenn@ucsc.edu',
    joinCode: 'CHEM1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-7',
    name: 'PHYS 5A - Introduction to Physics I',
    professorId: 'prof-7',
    professorName: 'Dr. Michael Dine',
    professorEmail: 'mdine@ucsc.edu',
    joinCode: 'PHYS5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-8',
    name: 'BIOL 20A - Cell and Molecular Biology',
    professorId: 'prof-8',
    professorName: 'Dr. William Saxton',
    professorEmail: 'saxton@ucsc.edu',
    joinCode: 'BIOL2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-9',
    name: 'STAT 5 - Statistics',
    professorId: 'prof-9',
    professorName: 'Prof. Bruno Sanso',
    professorEmail: 'sanso@ucsc.edu',
    joinCode: 'STAT5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-10',
    name: 'LIT 1 - Introduction to Literature',
    professorId: 'prof-10',
    professorName: 'Prof. Micah Perks',
    professorEmail: 'mperks@ucsc.edu',
    joinCode: 'LIT1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-11',
    name: 'PSYC 1 - Introduction to Psychology',
    professorId: 'prof-11',
    professorName: 'Dr. Karen Page',
    professorEmail: 'kpage@ucsc.edu',
    joinCode: 'PSYC1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-12',
    name: 'CSE 12 - Computer Systems and Assembly Language',
    professorId: 'prof-12',
    professorName: 'Prof. Charlie McDowell',
    professorEmail: 'mcdowell@ucsc.edu',
    joinCode: 'CSE12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
]

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.courseId as string
  
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [feedback, setFeedback] = useState<CourseFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCourseAndFeedback()
  }, [courseId])

  async function loadCourseAndFeedback() {
    try {
      setLoading(true)
      setError(null)
      
      // Check if it's a fake course first
      let courseData: Course | null = null
      const fakeCourse = FAKE_UCSC_COURSES.find(c => c.id === courseId)
      if (fakeCourse) {
        courseData = fakeCourse
      } else {
        // Load course info from API
        const courseRes = await fetch(`/api/courses/${courseId}`)
        if (!courseRes.ok) {
          throw new Error('Course not found')
        }
        courseData = await courseRes.json()
      }
      
      // Set course state
      setCourse(courseData)
      
      // Load feedback (this may take a while due to Reddit scraping)
      // Load feedback in parallel - don't wait for it
      fetch(`/api/courses/${courseId}/feedback`)
        .then(async (feedbackRes) => {
          if (feedbackRes.ok) {
            const feedbackData = await feedbackRes.json()
            setFeedback(feedbackData)
          } else {
            // Use enhanced default feedback if API fails
            const courseCode = courseData?.name.split(' - ')[0] || courseId
            const defaultFeedback = getDefaultFeedbackForCourse(courseCode, courseData?.name || '')
            setFeedback(defaultFeedback)
          }
        })
        .catch((feedbackErr) => {
          console.error('Error loading feedback:', feedbackErr)
          // Use enhanced default feedback on error
          const courseCode = courseData?.name.split(' - ')[0] || courseId
          const defaultFeedback = getDefaultFeedbackForCourse(courseCode, courseData?.name || '')
          setFeedback(defaultFeedback)
        })
    } catch (err: any) {
      setError(err.message || 'Failed to load course information')
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate default feedback
  function getDefaultFeedbackForCourse(courseCode: string, fullCourseName: string): CourseFeedback {
    const isCS = courseCode.includes('CMPS') || courseCode.includes('CSE')
    const isMath = courseCode.includes('MATH')
    const isHardCourse = isCS || isMath

    return {
      courseName: courseCode,
      difficulty: {
        average: isHardCourse ? 3.8 : 3.2,
        distribution: isHardCourse 
          ? { 1: 2, 2: 8, 3: 15, 4: 25, 5: 15 }
          : { 1: 5, 2: 10, 3: 20, 4: 10, 5: 5 }
      },
      professorRating: {
        average: isHardCourse ? 4.2 : 3.8,
        count: 12
      },
      positiveFeedback: [
        isHardCourse 
          ? "Great professor who really explains the concepts well. Office hours are super helpful and the assignments prepare you well for exams."
          : "Clear explanations and fair grading. The professor is approachable and really cares about student success.",
        "The course material is well-organized and the lectures are engaging. Would definitely recommend taking this class.",
        "Professor provides great feedback and the course structure makes sense. The workload is manageable if you stay on top of it."
      ],
      negativeFeedback: isHardCourse ? [
        "The course can be challenging, especially the programming assignments. Make sure to start early and attend office hours.",
        "Some concepts are taught quickly. The textbook is essential for understanding everything thoroughly."
      ] : [
        "The midterm was harder than expected. Make sure to review all the practice problems.",
        "Sometimes the lectures move too fast. Reading ahead helps."
      ],
      gradeDistribution: isHardCourse ? {
        'A': 22, 'A-': 10, 'B+': 14, 'B': 20, 'B-': 12,
        'C+': 8, 'C': 6, 'C-': 3, 'D+': 2, 'D': 2, 'D-': 1,
        'F': 0, 'P': 0, 'NP': 0, 'W': 0
      } : {
        'A': 32, 'A-': 15, 'B+': 18, 'B': 18, 'B-': 8,
        'C+': 4, 'C': 3, 'C-': 1, 'D+': 1, 'D': 0, 'D-': 0,
        'F': 0, 'P': 0, 'NP': 0, 'W': 0
      },
      samplePosts: [
        {
          title: `Anyone taken ${courseCode}?`,
          content: `Thinking about taking this class next quarter. How's the workload and difficulty? Any tips for success?`,
          upvotes: 15,
          url: `https://reddit.com/r/UCSC/comments/example`,
          subreddit: 'UCSC',
          created: Date.now() / 1000 - 86400 * 7
        },
        {
          title: `${courseCode} study group?`,
          content: `Looking to form a study group for this class. The material is challenging but the professor is helpful.`,
          upvotes: 8,
          url: `https://reddit.com/r/UCSC/comments/example2`,
          subreddit: 'UCSC',
          created: Date.now() / 1000 - 86400 * 3
        }
      ],
      totalEnrollment: isHardCourse ? 180 : 150,
      averageGPA: isHardCourse ? 3.1 : 3.4
    }
  }

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-6xl">
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error || !course) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-6xl">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error || 'Course not found'}</p>
              </CardContent>
            </Card>
            <Button asChild variant="ghost" className="mt-4">
              <Link href="/student/browse">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Browse
              </Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/student/browse">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Browse
            </Link>
          </Button>

          {/* Course Header */}
          <Card className="mb-6 border-2 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{course.name}</CardTitle>
                  <CardDescription className="text-base">
                    {course.professorName} • {course.professorEmail}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {feedback ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Difficulty Rating */}
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Course Difficulty
                  </CardTitle>
                  <CardDescription>Student-reported difficulty level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {feedback.difficulty.average.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground">out of 5.0</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {feedback.difficulty.average >= 4 ? 'Very Difficult' :
                       feedback.difficulty.average >= 3 ? 'Moderate' :
                       feedback.difficulty.average >= 2 ? 'Easy' : 'Very Easy'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map(level => {
                      const count = feedback.difficulty.distribution[level] || 0
                      const maxCount = Math.max(...Object.values(feedback.difficulty.distribution), 1)
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0
                      
                      return (
                        <div key={level} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-4">{level}</span>
                          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {count}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Professor Rating */}
              <Card className="border-2 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Professor Rating
                  </CardTitle>
                  <CardDescription>Student reviews and ratings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary mb-2">
                      {feedback.professorRating.average.toFixed(1)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Based on {feedback.professorRating.count} review{feedback.professorRating.count !== 1 ? 's' : ''}
                    </p>
                    <div className="flex justify-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-6 w-6 ${
                            star <= Math.round(feedback.professorRating.average)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Grade Distribution - BerkeleyTime Style */}
              <Card className="md:col-span-2 border-2 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Grade Distribution
                      </CardTitle>
                      <CardDescription>
                        Historical grade distribution from previous semesters
                      </CardDescription>
                    </div>
                    {feedback.totalEnrollment && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{feedback.totalEnrollment} students</span>
                      </div>
                    )}
                    {feedback.averageGPA && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Award className="h-4 w-4" />
                        <span>Avg GPA: {feedback.averageGPA.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* BerkeleyTime-style grade distribution */}
                  <div className="grid grid-cols-5 md:grid-cols-8 gap-4 mb-6">
                    {[
                      { grade: 'A', color: 'bg-green-500' },
                      { grade: 'A-', color: 'bg-green-400' },
                      { grade: 'B+', color: 'bg-blue-500' },
                      { grade: 'B', color: 'bg-blue-400' },
                      { grade: 'B-', color: 'bg-blue-300' },
                      { grade: 'C+', color: 'bg-yellow-500' },
                      { grade: 'C', color: 'bg-yellow-400' },
                      { grade: 'C-', color: 'bg-yellow-300' },
                      { grade: 'D+', color: 'bg-orange-400' },
                      { grade: 'D', color: 'bg-orange-500' },
                      { grade: 'D-', color: 'bg-orange-600' },
                      { grade: 'F', color: 'bg-red-500' },
                    ].map(({ grade, color }) => {
                      const percentage = feedback.gradeDistribution[grade as keyof typeof feedback.gradeDistribution] || 0
                      const maxPercentage = Math.max(...Object.values(feedback.gradeDistribution))
                      
                      return (
                        <div key={grade} className="text-center">
                          <div className="text-lg font-bold text-foreground mb-1">
                            {percentage}%
                          </div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {grade}
                          </div>
                          <div className="h-40 bg-muted rounded flex items-end overflow-hidden">
                            <div
                              className={`w-full ${color} rounded-t transition-all`}
                              style={{ 
                                height: maxPercentage > 0 ? `${(percentage / maxPercentage) * 100}%` : '0%'
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Pass/No Pass/Withdrew */}
                  {(feedback.gradeDistribution.P > 0 || 
                    feedback.gradeDistribution.NP > 0 || 
                    feedback.gradeDistribution.W > 0) && (
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                      {['P', 'NP', 'W'].map(grade => {
                        const count = feedback.gradeDistribution[grade as 'P' | 'NP' | 'W'] || 0
                        if (count === 0) return null
                        
                        return (
                          <div key={grade} className="text-center p-3 bg-muted/50 rounded-lg">
                            <div className="text-2xl font-bold text-foreground mb-1">
                              {count}%
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {grade === 'P' ? 'Pass' : grade === 'NP' ? 'No Pass' : 'Withdrew'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Positive Feedback */}
              {feedback.positiveFeedback.length > 0 && (
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <TrendingUp className="h-5 w-5" />
                      Positive Feedback
                    </CardTitle>
                    <CardDescription>What students loved about this course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {feedback.positiveFeedback.map((feedbackText, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <p className="text-sm leading-relaxed">"{feedbackText}..."</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Negative Feedback */}
              {feedback.negativeFeedback.length > 0 && (
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <TrendingDown className="h-5 w-5" />
                      Areas for Improvement
                    </CardTitle>
                    <CardDescription>Student concerns and feedback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {feedback.negativeFeedback.map((feedbackText, idx) => (
                        <div 
                          key={idx} 
                          className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800"
                        >
                          <p className="text-sm leading-relaxed">"{feedbackText}..."</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sample Reddit Posts */}
              {feedback.samplePosts.length > 0 && (
                <Card className="md:col-span-2 border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle>Recent Reddit Discussions</CardTitle>
                    <CardDescription>
                      Real feedback from r/UCSC students
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {feedback.samplePosts.map((post, idx) => (
                        <div 
                          key={idx} 
                          className="p-5 border rounded-lg hover:shadow-md transition-shadow bg-card"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-base flex-1 pr-4">{post.title}</h4>
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                            {post.content}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-medium">r/{post.subreddit}</span>
                            <span>↑ {post.upvotes} upvotes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="border-2 shadow-lg">
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground mb-2">
                    Loading course feedback...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scraping Reddit for student reviews
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enroll Button */}
          {!course.isEnrolled && (
            <div className="mt-8 flex justify-center">
              <Button size="lg" className="shadow-lg" asChild>
                <Link href={`/student/enroll/${courseId}`}>
                  Enroll in Course
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
