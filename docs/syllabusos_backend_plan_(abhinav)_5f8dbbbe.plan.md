---
name: SyllabusOS Backend Plan (Abhinav)
overview: "Backend implementation plan for SyllabusOS: database schema, RAG system, multi-agent router, API endpoints, and Sunday Night Conductor logic."
todos:
  - id: db-setup
    content: Create Supabase project, set up pgvector extension, and create initial schema migration with all tables (profiles, courses, course_content, schedules, escalations, announcements, chat_logs).
    status: pending
  - id: supabase-client
    content: Set up Supabase client (lib/supabase/client.ts and server.ts) with environment variables and RLS policies.
    status: pending
    dependencies:
      - db-setup
  - id: rag-infrastructure
    content: "Implement RAG infrastructure: vector-store.ts, chunking.ts (PDF parsing with metadata), and retrieval.ts with similarity search. Add content type categorization (policy/concept) during chunking using keyword analysis."
    status: pending
    dependencies:
      - supabase-client
  - id: metadata-filtering
    content: "Implement metadata filtering in chunking.ts to categorize chunks as 'policy' or 'concept' based on content analysis. Update syllabus-agent.ts and concept-agent.ts to filter retrieval by contentType metadata."
    status: pending
    dependencies:
      - rag-infrastructure
  - id: upload-api
    content: Create /api/upload route to handle PDF syllabus and CSV schedule parsing, chunking, and storage in database.
    status: pending
    dependencies:
      - rag-infrastructure
  - id: phase1-integration
    content: Phase 1 Integration Testing - Verify Supabase connection, RLS policies, database schema, test /api/upload, coordinate with frontend team.
    status: pending
    dependencies:
      - upload-api
  - id: ai-client
    content: Create Gemini AI client (lib/ai/client.ts) using LangChain. Add MOCK_MODE support to return mock responses instead of making API calls.
    status: pending
  - id: agent-router
    content: Implement AgentRouter (lib/agents/router.ts) with LLM-based classification logic for POLICY/CONCEPT/ESCALATE routes. Add mock mode support for keyword-based classification.
    status: pending
    dependencies:
      - ai-client
      - rag-infrastructure
  - id: agent-handlers
    content: "Create three agent handlers: syllabus-agent.ts (POLICY), concept-agent.ts (CONCEPT), escalation-handler.ts (ESCALATE) with strict I dont know logic. Add mock mode support for all handlers."
    status: pending
    dependencies:
      - agent-router
  - id: chat-api
    content: Build /api/chat route that uses AgentRouter, routes to agents, logs conversations, and returns responses with citations.
    status: pending
    dependencies:
      - agent-handlers
  - id: phase2-integration
    content: Phase 2 Integration Testing - Test /api/chat with various queries, verify agent routing, citations, escalations, coordinate with frontend team.
    status: pending
    dependencies:
      - chat-api
  - id: conductor-logic
    content: Implement Sunday Night Conductor logic (lib/conductor/sunday-conductor.ts) to generate week announcements from schedule data. Add mock mode support for template-based announcements.
    status: pending
    dependencies:
      - db-setup
      - ai-client
  - id: conductor-scheduling
    content: Create Supabase Edge Function for scheduled execution and /api/conductor route for manual trigger with demo mode support.
    status: pending
    dependencies:
      - conductor-logic
  - id: supporting-apis
    content: "Create API routes: /api/escalations (CRUD), /api/announcements (CRUD), /api/pulse (generate report from chat logs)."
    status: pending
    dependencies:
      - db-setup
  - id: phase3-integration
    content: Phase 3 Integration Testing - Test conductor, announcements, escalations, pulse APIs, coordinate dashboard integration with frontend team.
    status: pending
    dependencies:
      - supporting-apis
      - conductor-scheduling
  - id: demo-mode-backend
    content: Add demo mode configuration (environment variables) and update conductor/schedule logic to respect demo week.
    status: pending
    dependencies:
      - conductor-scheduling
  - id: error-handling
    content: Add input validation, error handling, logging, and test all API endpoints.
    status: pending
    dependencies:
      - chat-api
      - supporting-apis
      - upload-api
  - id: phase4-integration
    content: Phase 4 Final Integration Testing - Test demo mode, end-to-end flows, coordinate full system integration with frontend, fix integration bugs.
    status: pending
    dependencies:
      - error-handling
      - demo-mode-backend
---

# SyllabusOS Backend Plan (Abhinav)

## Overview

This plan covers all backend infrastructure, logic, and API endpoints. The frontend (Gautam) will consume these APIs.

## Project Structure (Backend Focus)

```javascript
SyllabusOS/
├── app/api/                      # API Routes (all backend)
│   ├── chat/route.ts             # Chat endpoint
│   ├── upload/route.ts           # File upload handler
│   ├── conductor/route.ts        # Sunday Night Conductor trigger
│   ├── escalations/route.ts      # Escalation CRUD
│   ├── announcements/route.ts    # Announcement CRUD
│   └── pulse/route.ts            # Pulse report data
├── lib/
│   ├── agents/                   # Multi-agent router (BACKEND)
│   │   ├── router.ts             # AgentRouter (classifies queries)
│   │   ├── syllabus-agent.ts     # POLICY agent
│   │   ├── concept-agent.ts      # CONCEPT agent
│   │   └── escalation-handler.ts # ESCALATE handler
│   ├── rag/                      # RAG implementation (BACKEND)
│   │   ├── vector-store.ts       # Vector store client
│   │   ├── chunking.ts           # Document chunking logic
│   │   └── retrieval.ts          # Retrieval logic
│   ├── conductor/                # Sunday Night Conductor (BACKEND)
│   │   └── sunday-conductor.ts   # Week announcement generator
│   ├── ai/                       # AI client abstraction (BACKEND)
│   │   ├── client.ts             # Gemini AI client
│   │   └── langchain-setup.ts    # LangChain integration
│   ├── supabase/                 # Supabase client setup
│   │   ├── client.ts             # Supabase client
│   │   └── server.ts             # Server-side client
│   └── utils/
├── supabase/
│   ├── migrations/               # Database migrations (BACKEND)
│   └── functions/                # Edge Functions (BACKEND)
│       └── sunday-conductor/     # Scheduled conductor function
└── types/                        # TypeScript types (shared)
```



## Database Schema (Supabase Migrations)

Create migrations for:

- `profiles` - User profiles with role (student/professor)
- `courses` - Course metadata
- `course_content` - Chunked content with `vector` column (pgvector)
- `schedules` - Weekly schedule data (from CSV)
- `escalations` - Student escalation queue
- `announcements` - Weekly announcements (draft + published status)
- `chat_logs` - Chat history for analytics

Key fields:

- `course_content.embedding` - vector type
- `escalations.status` - pending/resolved
- `announcements.status` - draft/published
- Enable pgvector extension

## API Contracts (Define These for Frontend)

### POST /api/upload

**Request:**

```typescript
FormData {
  syllabus: File,    // PDF file
  schedule: File,    // CSV file
  courseId?: string  // Optional, create new course if not provided
}
```

**Response:**

```typescript
{
  success: boolean,
  courseId: string,
  chunksCreated: number,
  scheduleEntries: number
}
```



### POST /api/chat

**Request:**

```typescript
{
  message: string,
  courseId: string,
  userId: string
}
```

**Response:**

```typescript
{
  response: string,
  agent: 'POLICY' | 'CONCEPT' | 'ESCALATE',
  citations: Array<{
    source: string,      // e.g., "Syllabus page 4"
    page?: number,
    content: string
  }>,
  escalated?: boolean,
  escalationId?: string
}
```



### GET /api/escalations

**Response:**

```typescript
Array<{
  id: string,
  studentName: string,
  studentEmail: string,
  query: string,
  status: 'pending' | 'resolved',
  createdAt: string
}>
```



### GET /api/announcements

**Response:**

```typescript
Array<{
  id: string,
  weekNumber: number,
  title: string,
  content: string,
  status: 'draft' | 'published',
  createdAt: string
}>
```



### POST /api/announcements

**Request:**

```typescript
{
  weekNumber: number,
  title: string,
  content: string
}
```



### PUT /api/announcements/:id

**Request:**

```typescript
{
  title?: string,
  content?: string,
  status?: 'draft' | 'published'
}
```



### POST /api/conductor

**Request:**

```typescript
{
  manual?: boolean,    // true for manual trigger
  weekNumber?: number  // optional override
}
```



### GET /api/pulse

**Response:**

```typescript
{
  topConfusions: Array<{
    topic: string,
    count: number,
    examples: string[]
  }>,
  totalQueries: number,
  escalationCount: number
}
```



## Implementation Tasks

### Phase 1: Foundation & Database

**Task 1.1: Database Setup**

- Create Supabase project and get credentials
- Set up pgvector extension
- Create migration file: `supabase/migrations/001_initial_schema.sql`
- Define all tables with proper relationships and indexes
- Add vector column to `course_content` table
- Test migrations locally/in Supabase

**Task 1.2: Supabase Client Setup**

- Create `lib/supabase/client.ts` for client-side
- Create `lib/supabase/server.ts` for server-side
- Set up environment variables
- Configure RLS policies (professors can see escalations, students cannot)

**Task 1.3: RAG Infrastructure**

- Install dependencies (langchain, @langchain/google-genai, pdf-parse, etc.)
- Create `lib/rag/vector-store.ts` - Supabase vector store client
- Create `lib/rag/chunking.ts` - PDF parsing and chunking logic
- Extract page numbers for citations
- Preserve metadata (week, topic)
- **Implement Content Type Categorization**: Add `categorizeChunk()` function that analyzes chunk content to determine if it's 'policy' or 'concept' based on keyword matching (policy keywords: 'deadline', 'grading', 'late', 'attendance', 'policy', 'exam date'; concept keywords: 'explain', 'algorithm', 'data structure', 'recursion', 'how does')
- Store `contentType` metadata field ('policy' | 'concept') with each chunk
- Create embeddings
- Create `lib/rag/retrieval.ts` - Retrieval logic with similarity search
- Test chunking and storage with metadata

**Task 1.4: Upload API Route**

- Create `app/api/upload/route.ts`
- Handle PDF syllabus parsing (use pdf-parse)
- Handle CSV schedule parsing
- Chunk PDF and store in `course_content` table
- Store schedule in `schedules` table
- Return course ID and chunk counts

**Integration Task 1.5: Phase 1 Integration Testing**

- Verify Supabase client connection from frontend (test auth flow)
- Test RLS policies with different user roles (student/professor)
- Verify database schema matches API contracts
- Share API documentation and TypeScript types with frontend team
- Test /api/upload endpoint with sample PDF and CSV files
- Verify chunks are stored correctly with metadata (including contentType field)
- **Test content type categorization**: Upload sample syllabus and verify chunks are categorized as 'policy' or 'concept'
- Coordinate with frontend team to test file upload integration

### Phase 2: Multi-Agent Router

**Task 2.1: Gemini AI Client Setup**

- Create `lib/ai/client.ts` - Gemini AI client using LangChain
- Set up Google Gemini API key configuration
- Create `lib/ai/langchain-setup.ts` - LangChain integration with Gemini
- **Implement Mock Mode**: Add `MOCK_MODE` environment variable support
- When `MOCK_MODE=true`, return mock responses instead of making API calls
- Create mock response generator for testing (mock chat responses, classifications, etc.)
- Mock responses should match real API response format
- This prevents unnecessary API costs during development
- Test basic LLM calls with Gemini

**Task 2.2: Agent Router**

- Create `lib/agents/router.ts` - AgentRouter class
- Implement classification logic (LLM-based prompt)
- Classify queries into: POLICY, CONCEPT, ESCALATE
- **Support Mock Mode**: When `MOCK_MODE=true`, use mock classification logic
- Return mock routing decisions based on query keywords (e.g., "midterm" → POLICY, "explain" → CONCEPT, "sick" → ESCALATE)
- Return routing decision with confidence

**Task 2.3: Agent Handlers**

- Create `lib/agents/syllabus-agent.ts` - POLICY agent
- RAG over syllabus content with metadata filter: `metadata.contentType = 'policy'`
- Filter retrieval to only search chunks with `contentType: 'policy'` metadata
- Generate citations with page numbers
- **Support Mock Mode**: When `MOCK_MODE=true`, return mock responses with sample citations
- Skip RAG retrieval, return predefined mock responses
- Mock responses should include citations format: "See Syllabus page X"
- Strict "I don't know" if confidence low → escalate
- Create `lib/agents/concept-agent.ts` - CONCEPT agent
- RAG over course content with metadata filter: `metadata.contentType = 'concept'`
- Filter retrieval to only search chunks with `contentType: 'concept'` metadata
- This ensures CONCEPT queries search concept-heavy sections from syllabus PDF
- Generate citations with page numbers or week references
- **Support Mock Mode**: When `MOCK_MODE=true`, return mock concept explanations with citations
- Strict "I don't know" if confidence low → escalate
- Create `lib/agents/escalation-handler.ts` - ESCALATE handler
- Create entry in `escalations` table
- Return escalation confirmation message
- **Support Mock Mode**: When `MOCK_MODE=true`, still create escalation entries (needed for testing), but skip LLM calls
- Link to original query in `chat_logs`

**Task 2.4: Chat API Route**

- Create `app/api/chat/route.ts`
- Authenticate user
- Use AgentRouter to classify query
- Route to appropriate agent handler
- Log conversation to `chat_logs` table
- Return response with citations and agent type
- Handle escalation creation

**Integration Task 2.5: Phase 2 Integration Testing**

- Test /api/chat endpoint with various query types (POLICY, CONCEPT, ESCALATE)
- Verify agent routing works correctly for different query categories
- **Test metadata filtering**: Verify POLICY queries retrieve policy chunks, CONCEPT queries retrieve concept chunks
- **Test content type categorization**: Verify chunks are properly categorized during upload (test with sample syllabus)
- Test citation format matches frontend expectations
- Verify escalation entries are created in database when triggered
- Test chat logging to chat_logs table
- Coordinate with frontend team to test chat interface integration
- Verify "I don't know" responses properly escalate
- Test agent responses with and without citations

### Phase 3: Sunday Night Conductor

**Task 3.1: Conductor Logic**

- Create `lib/conductor/sunday-conductor.ts`
- Read schedule from `schedules` table
- Determine current week (or use demo mode week)
- Generate announcement in Professor persona using LLM
- **Support Mock Mode**: When `MOCK_MODE=true`, return mock announcement text instead of calling LLM
- Use template-based mock announcements for testing
- Store draft in `announcements` table
- Return generated announcement

**Task 3.2: Conductor Scheduling**

- Create Supabase Edge Function: `supabase/functions/sunday-conductor/index.ts`
- Set up cron trigger for Sunday nights
- Create `app/api/conductor/route.ts` for manual trigger
- Support demo mode (mock week number)
- Handle errors gracefully

**Task 3.3: Supporting APIs**

- Create `app/api/escalations/route.ts` - CRUD for escalations
- Create `app/api/announcements/route.ts` - CRUD for announcements
- Create `app/api/pulse/route.ts` - Generate pulse report from chat logs
- Analyze `chat_logs` table
- Extract top confusions
- Return 3-bullet summary format

**Integration Task 3.4: Phase 3 Integration Testing**

- Test /api/conductor endpoint (manual trigger)
- Verify announcement drafts are created correctly
- Test /api/announcements CRUD endpoints
- Test /api/escalations GET endpoint returns correct data
- Test /api/pulse endpoint returns correct format
- Verify announcement approve/edit workflow
- Coordinate with frontend team to test dashboard integration
- Test all three dashboard widgets receive correct data format
- Verify conductor generates announcements in correct format

### Phase 4: Demo Mode & Polish

**Task 4.1: Demo Mode Backend**

- Add demo mode configuration (environment variable)
- Update conductor logic to respect demo mode
- Update schedule queries to use demo week when enabled
- Add demo mode flag to API responses if needed

**Task 4.2: Error Handling & Validation**

- Add input validation to all API routes
- Implement proper error responses
- Add logging for debugging
- Test all API endpoints

**Integration Task 4.3: Phase 4 Integration Testing & Final Integration**

- Test demo mode configuration and verify it affects all endpoints
- Coordinate with frontend team for end-to-end testing
- Verify all API error responses are consistent and user-friendly
- Test complete user flows: upload → chat → escalation → dashboard
- Verify demo mode integration with frontend toggle
- Test authentication/authorization across all endpoints
- Perform full system integration test with frontend
- Fix any integration bugs discovered during testing
- Verify all API contracts match frontend expectations

## Key Technical Decisions

1. **AI Provider**: Google Gemini (via LangChain) - Chosen for free tier availability and cost-effectiveness
2. **RAG Implementation**: Use LangChain's Supabase vector store integration
3. **Chunking Strategy**: Semantic chunking with 200-300 token chunks, 50 token overlap
4. **Content Type Categorization**: Automatic categorization during chunking using keyword analysis to tag chunks as 'policy' or 'concept'. POLICY agent filters to `contentType: 'policy'` chunks, CONCEPT agent filters to `contentType: 'concept'` chunks. This allows CONCEPT questions to search concept-heavy sections from the syllabus PDF without requiring separate lecture uploads.
5. **Citation Format**: "See Syllabus page X" or "See Lecture Week Y"
6. **Classification**: LLM-based classification prompt using Gemini (fast, accurate)
7. **Escalation Threshold**: If retrieval confidence < 0.7 or "I don't know" response, escalate
8. **Demo Mode**: Environment variable `DEMO_MODE=true` and `DEMO_WEEK=4`
9. **Mock Mode**: Environment variable `MOCK_MODE=true` - Returns mock responses instead of making LLM API calls (saves costs during development)

## Dependencies to Install

- `@supabase/supabase-js` - Supabase client
- `langchain` - LangChain framework
- `@langchain/google-genai` - Gemini integration
- `pdf-parse` - PDF parsing
- `csv-parse` - CSV parsing
- `@supabase/ssr` - Supabase SSR support

## Testing Strategy

- Test database migrations in Supabase dashboard
- Test API routes with Postman/curl
- Test RAG retrieval accuracy