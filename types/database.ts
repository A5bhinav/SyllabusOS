// Database types matching Supabase schema

export type UserRole = 'student' | 'professor'

export interface Profile {
  id: string
  email: string
  name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  name: string
  professor_id: string
  created_at: string
  updated_at: string
}

export interface CourseContent {
  id: string
  course_id: string
  content: string
  page_number: number | null
  week_number: number | null
  topic: string | null
  content_type: 'policy' | 'concept'
  embedding: number[] | null
  metadata: Record<string, any>
  created_at: string
}

export interface Schedule {
  id: string
  course_id: string
  week_number: number
  topic: string
  assignments: string | null
  readings: string | null
  due_date: string | null
  created_at: string
}

export interface Escalation {
  id: string
  course_id: string
  student_id: string
  query: string
  status: 'pending' | 'resolved'
  category: string | null
  created_at: string
  resolved_at: string | null
}

export interface Announcement {
  id: string
  course_id: string
  week_number: number
  title: string
  content: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ChatLog {
  id: string
  course_id: string
  user_id: string
  message: string
  response: string | null
  agent: 'POLICY' | 'CONCEPT' | 'ESCALATE' | null
  citations: string[] | null
  escalation_id: string | null
  created_at: string
}

