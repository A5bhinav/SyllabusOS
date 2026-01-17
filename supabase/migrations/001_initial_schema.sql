-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table - User accounts
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'professor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table - Course metadata
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  professor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course content table - Chunked syllabus/lecture content with vector embeddings
CREATE TABLE course_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  page_number INTEGER,
  week_number INTEGER,
  topic TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('policy', 'concept')),
  embedding vector(768), -- Using 768 dimensions for common embedding models (adjust if needed)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table - Weekly schedule data
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  topic TEXT NOT NULL,
  assignments TEXT,
  readings TEXT,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, week_number)
);

-- Escalations table - Student escalation queue
CREATE TABLE escalations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Announcements table - Weekly announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Chat logs table - Chat history for analytics
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT,
  agent TEXT CHECK (agent IN ('POLICY', 'CONCEPT', 'ESCALATE')),
  citations JSONB,
  escalation_id UUID REFERENCES escalations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_course_content_course_id ON course_content(course_id);
CREATE INDEX idx_course_content_embedding ON course_content USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_course_content_content_type ON course_content(content_type);
CREATE INDEX idx_course_content_week_number ON course_content(week_number);
CREATE INDEX idx_schedules_course_id ON schedules(course_id);
CREATE INDEX idx_schedules_week_number ON schedules(course_id, week_number);
CREATE INDEX idx_escalations_course_id ON escalations(course_id);
CREATE INDEX idx_escalations_status ON escalations(status);
CREATE INDEX idx_escalations_category ON escalations(category);
CREATE INDEX idx_announcements_course_id ON announcements(course_id);
CREATE INDEX idx_announcements_status ON announcements(course_id, status);
CREATE INDEX idx_chat_logs_course_id ON chat_logs(course_id);
CREATE INDEX idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX idx_chat_logs_created_at ON chat_logs(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies - users can read their own profile
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Courses policies - professors can manage their courses, students can view enrolled courses
CREATE POLICY "Professors can view their courses" ON courses
  FOR SELECT USING (professor_id = auth.uid());

CREATE POLICY "Professors can create courses" ON courses
  FOR INSERT WITH CHECK (professor_id = auth.uid());

CREATE POLICY "Professors can update their courses" ON courses
  FOR UPDATE USING (professor_id = auth.uid());

-- Course content policies - students can read, professors can manage
CREATE POLICY "Users can view course content" ON course_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_content.course_id 
      AND (courses.professor_id = auth.uid() OR true) -- Allow all authenticated users for now
    )
  );

CREATE POLICY "Professors can manage course content" ON course_content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = course_content.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Schedules policies - students can read, professors can manage
CREATE POLICY "Users can view schedules" ON schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = schedules.course_id 
      AND (courses.professor_id = auth.uid() OR true) -- Allow all authenticated users
    )
  );

CREATE POLICY "Professors can manage schedules" ON schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = schedules.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Escalations policies - professors can view all, students can view only their own
CREATE POLICY "Professors can view all escalations" ON escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = escalations.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own escalations" ON escalations
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can create escalations" ON escalations
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Professors can update escalations" ON escalations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = escalations.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Announcements policies - students can view published, professors can manage all
CREATE POLICY "Students can view published announcements" ON announcements
  FOR SELECT USING (status = 'published');

CREATE POLICY "Professors can view all announcements" ON announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = announcements.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

CREATE POLICY "Professors can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = announcements.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Chat logs policies - users can view their own, professors can view all for their courses
CREATE POLICY "Users can view their own chat logs" ON chat_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create chat logs" ON chat_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Professors can view chat logs for their courses" ON chat_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = chat_logs.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count INT DEFAULT 5,
  filter_course_id UUID DEFAULT NULL,
  filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  page_number INTEGER,
  week_number INTEGER,
  topic TEXT,
  content_type TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    course_content.id,
    course_content.content,
    course_content.page_number,
    course_content.week_number,
    course_content.topic,
    course_content.content_type,
    course_content.metadata,
    1 - (course_content.embedding <=> query_embedding) AS similarity
  FROM course_content
  WHERE
    (filter_course_id IS NULL OR course_content.course_id = filter_course_id)
    AND (filter_content_type IS NULL OR course_content.content_type = filter_content_type)
    AND course_content.embedding IS NOT NULL
  ORDER BY course_content.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

