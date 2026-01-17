// API Request/Response Types

// Upload API
export interface UploadRequest {
  syllabus: File;
  schedule: File;
  courseId?: string;
}

export interface UploadResponse {
  success: boolean;
  courseId: string;
  chunksCreated: number;
  scheduleEntries: number;
}

// Chat API
export interface ChatRequest {
  message: string;
  courseId: string;
  userId: string;
}

export interface Citation {
  source: string;
  page?: number;
  content: string;
}

export interface ChatResponse {
  response: string;
  agent: 'POLICY' | 'CONCEPT' | 'ESCALATE';
  citations: Citation[];
  escalated?: boolean;
  escalationId?: string;
}

// Escalations API
export interface Escalation {
  id: string;
  studentName: string;
  studentEmail: string;
  query: string;
  status: 'pending' | 'resolved';
  createdAt: string;
}

// Announcements API
export interface Announcement {
  id: string;
  weekNumber: number;
  title: string;
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface CreateAnnouncementRequest {
  weekNumber: number;
  title: string;
  content: string;
}

export interface UpdateAnnouncementRequest {
  title?: string;
  content?: string;
  status?: 'draft' | 'published';
}

// Conductor API
export interface ConductorRequest {
  manual?: boolean;
  weekNumber?: number;
}

export interface ConductorResponse {
  success: boolean;
  announcementId?: string;
  weekNumber: number;
}

// Pulse API
export interface TopConfusion {
  topic: string;
  count: number;
  examples: string[];
}

export interface PulseResponse {
  topConfusions: TopConfusion[];
  totalQueries: number;
  escalationCount: number;
}

// Auth Types (using Supabase)
export interface AuthError {
  message: string;
  status?: number;
}
