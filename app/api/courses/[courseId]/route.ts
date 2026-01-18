import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createNotFoundError } from '@/lib/utils/api-errors'
import type { Course } from '@/types/api'

/**
 * GET /api/courses/[courseId]
 * Get a single course by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const courseId = params.courseId

    // Check if it's a fake course first (for demo purposes)
    const fakeCourses: { [key: string]: Course } = {
      'fake-course-1': {
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
      'fake-course-2': {
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
      'fake-course-3': {
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
      'fake-course-4': {
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
      'fake-course-5': {
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
      'fake-course-6': {
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
      'fake-course-7': {
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
      'fake-course-8': {
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
      'fake-course-9': {
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
      'fake-course-10': {
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
      'fake-course-11': {
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
      'fake-course-12': {
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
    }

    if (fakeCourses[courseId]) {
      return NextResponse.json(fakeCourses[courseId])
    }

    // Get course from database
    const supabase = await createClient()
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        name,
        professor_id,
        join_code,
        created_at,
        updated_at,
        profiles!courses_professor_id_fkey (
          name,
          email
        )
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return createNotFoundError('Course')
    }

    const professor = Array.isArray(course.profiles) 
      ? course.profiles[0] 
      : course.profiles

    const response: Course = {
      id: course.id,
      name: course.name,
      professorId: course.professor_id,
      professorName: professor?.name || null,
      professorEmail: professor?.email || null,
      joinCode: course.join_code || null,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
      isEnrolled: false, // Will be set by client based on enrollment status
    }

    return NextResponse.json(response)
  } catch (error) {
    return createErrorResponse(error, 'Failed to fetch course')
  }
}
