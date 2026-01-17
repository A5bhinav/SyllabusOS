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

