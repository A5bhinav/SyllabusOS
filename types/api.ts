// API request/response types

export interface UploadRequest {
  syllabus: File
  schedule: File
  courseId?: string
}

export interface UploadResponse {
  success: boolean
  courseId: string
  chunksCreated: number
  scheduleEntries: number
  warnings?: string[] // Optional warnings from schedule parsing
  error?: string // Error message if success is false
}

export interface ChatRequest {
  message: string
  courseId: string
  userId: string
}

export interface ChatResponse {
  response: string
  agent: 'POLICY' | 'CONCEPT' | 'ESCALATE'
  citations: Array<{
    source: string
    page?: number
    content: string
  }>
  escalated?: boolean
  escalationId?: string
}

export interface ScheduleEntry {
  weekNumber: number
  topic: string
  assignments?: string | null
  readings?: string | null
  dueDate?: string | null
}

export interface Announcement {
  id: string
  courseId: string
  weekNumber: number
  title: string
  content: string
  status: 'draft' | 'published'
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface CreateAnnouncementRequest {
  courseId?: string // Optional: will use professor's first course if not provided
  weekNumber: number
  title: string
  content: string
}

export interface UpdateAnnouncementRequest {
  title?: string
  content?: string
  status?: 'draft' | 'published'
}

export interface Escalation {
  id: string
  courseId: string
  studentId: string
  studentName?: string
  studentEmail?: string
  query: string
  status: 'pending' | 'resolved'
  category?: string | null
  createdAt: string
  resolvedAt?: string | null
}

export interface ConductorRequest {
  manual?: boolean
  weekNumber?: number
}

export interface ConductorResponse {
  success: boolean
  message?: string
  announcementId?: string
  weekNumber?: number
  announcement?: {
    id: string
    weekNumber: number
    title: string
    content: string
    status: 'draft' | 'published'
  }
  results?: Array<{
    announcementId: string
    weekNumber: number
    title: string
    status: 'draft' | 'published'
  }>
  demoMode?: {
    enabled: boolean
    currentWeek?: number
  }
  error?: string
}

export interface PulseResponse {
  topConfusions: Array<{
    topic: string
    count: number
    examples: string[]
  }>
  totalQueries: number
  escalationCount: number
  dailyTrends?: Array<{
    date: string
    count: number
  }>
  queryDistribution?: {
    POLICY: number
    CONCEPT: number
    ESCALATE: number
  }
  metrics?: {
    totalQueriesToday: number
    escalationsPending: number
    avgResponseTime: number
  }
}

export interface Course {
  id: string
  name: string
  professorId: string
  professorName: string | null
  professorEmail: string | null
  createdAt: string
  updatedAt: string
  isEnrolled: boolean // For students: indicates if they're enrolled in this course
}

