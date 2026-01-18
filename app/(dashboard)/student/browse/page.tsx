'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import type { Course } from '@/types/api'
import { StudentNav } from '@/components/student/StudentNav'

// UC Santa Cruz courses for SlugHacks
const FAKE_COURSES: Course[] = [
  {
    id: 'fake-course-1',
    name: 'CMPS 101 - Algorithms and Abstract Data Types',
    professorId: 'prof-1',
    professorName: 'Dr. Patrick Tantalo',
    professorEmail: 'tantalo@ucsc.edu',
    joinCode: 'CMPS10',
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
    joinCode: 'CMPS12',
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
    joinCode: 'MATH19',
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
    joinCode: 'CSE101',
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
    joinCode: 'ECON01',
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
    joinCode: 'CHEM1B',
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
    joinCode: 'PHYS5A',
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
    joinCode: 'BIOL20',
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
    joinCode: 'STAT05',
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
    joinCode: 'LIT001',
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
    joinCode: 'PSYC01',
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
    joinCode: 'CSE012',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
]

export default function BrowseCoursesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load courses')
        }

        const data = await response.json()
        const apiCourses = data || []
        
        // Combine API courses with fake courses
        // Filter out any duplicates if a fake course ID matches a real one
        const fakeCoursesFiltered = FAKE_COURSES.filter(
          fake => !apiCourses.some((api: Course) => api.id === fake.id)
        )
        
        // Merge: real courses first, then fake courses
        setCourses([...apiCourses, ...fakeCoursesFiltered])
      } catch (err: any) {
        // If API fails, still show fake courses
        console.error('Error loading courses:', err)
        setCourses(FAKE_COURSES)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  // Generate slug from course name (e.g., "CMPS 101" -> "cmps-101")
  function getCourseSlug(course: Course): string {
    const courseCode = course.name.split(' - ')[0] // e.g., "CMPS 101"
    return courseCode.toLowerCase().replace(/\s+/g, '-') // e.g., "cmps-101"
  }

  function handleCourseClick(course: Course) {
    if (course.isEnrolled) {
      // If already enrolled, go directly to chat
      router.push(`/student/chat?courseId=${course.id}`)
      return
    }
    
    // Navigate to course detail page using slug (e.g., /student/courses/cmps-101)
    const slug = getCourseSlug(course)
    router.push(`/student/courses/${slug}`)
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

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Courses</h1>
        <p className="text-muted-foreground">
          Explore available courses and join the ones you&apos;re interested in
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No courses available</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              There are no courses available at the moment. Please check back later or contact your professor.
            </p>
            <Button asChild variant="outline">
              <Link href="/student">
                Go Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                onClick={() => handleCourseClick(course)}
                className={`hover:shadow-lg transition-shadow h-full flex flex-col cursor-pointer ${
                  course.isEnrolled ? 'border-green-500' : ''
                }`}
              >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  {course.isEnrolled && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <CardTitle className="text-xl mb-1 line-clamp-2">{course.name}</CardTitle>
                <CardDescription>
                  {course.professorName || 'Professor'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto space-y-2">
                {course.professorEmail && (
                  <p className="text-sm text-muted-foreground">
                    {course.professorEmail}
                  </p>
                )}
                {course.isEnrolled ? (
                  <Button variant="default" className="w-full" asChild onClick={(e) => e.stopPropagation()}>
                    <Link href={`/student/chat?courseId=${course.id}`}>
                      Open Chat
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCourseClick(course)
                    }}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Enroll in Course
                  </Button>
                )}
              </CardContent>
            </Card>
            ))}
          </div>
        </>
      )}
      </div>
    </>
  )
}

