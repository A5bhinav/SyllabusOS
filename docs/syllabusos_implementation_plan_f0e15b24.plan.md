---
name: ProfAI Implementation Plan
overview: Build an AI Professor-in-a-Box system with Next.js, Supabase, and multi-agent routing for course management, student triage, and professor oversight.
todos:
  - id: setup-project
    content: Initialize Next.js project with TypeScript, Tailwind CSS, and Shadcn/UI. Set up Supabase client and environment configuration.
    status: pending
  - id: database-schema
    content: "Create Supabase migrations: profiles, courses, course_content (with vector), escalations, announcements, chat_logs, schedules tables. Enable pgvector extension."
    status: pending
    dependencies:
      - setup-project
  - id: vector-store
    content: Implement vector store client (lib/rag/vector-store.ts) and chunking logic (lib/rag/chunking.ts) for PDF parsing with metadata extraction.
    status: pending
    dependencies:
      - database-schema
  - id: onboarding-ui
    content: Build onboarding page with drag-and-drop file upload for PDF syllabus and CSV schedule. Create upload API route.
    status: pending
    dependencies:
      - vector-store
  - id: agent-router
    content: Implement AgentRouter (lib/agents/router.ts) with classification logic for POLICY/CONCEPT/ESCALATE routes.
    status: pending
    dependencies:
      - vector-store
  - id: agent-handlers
    content: "Create three agent handlers: syllabus-agent.ts (POLICY), concept-agent.ts (CONCEPT), escalation-handler.ts (ESCALATE) with strict I dont know logic."
    status: pending
    dependencies:
      - agent-router
  - id: chat-api
    content: Build chat API route (app/api/chat/route.ts) that uses AgentRouter and returns responses with source citations.
    status: pending
    dependencies:
      - agent-handlers
  - id: student-chat-ui
    content: Create ChatInterface component with useOptimistic, source citations display, and escalation confirmations.
    status: pending
    dependencies:
      - chat-api
  - id: conductor-logic
    content: Implement Sunday Night Conductor (lib/conductor/sunday-conductor.ts) to generate week announcements from schedule data.
    status: pending
    dependencies:
      - database-schema
  - id: conductor-scheduling
    content: Create Supabase Edge Function for scheduled conductor execution and manual trigger API route.
    status: pending
    dependencies:
      - conductor-logic
  - id: professor-dashboard
    content: "Build Professor Dashboard page with three widgets: AnnouncementDrafts, EscalationQueue, PulseReport."
    status: pending
    dependencies:
      - conductor-scheduling
  - id: demo-mode
    content: Implement demo mode toggle that mocks system time to Week 4 for testing Sunday Conductor and schedule logic.
    status: pending
    dependencies:
      - professor-dashboard
  - id: ux-polish
    content: Add toast notifications, loading states, error boundaries, and performance optimizations throughout the app.
    status: pending
    dependencies:
      - demo-mode
---

# ProfAI Implementation Plan

## Architecture Overview

The system will be built as a Next.js application (App Router) with:

- **Frontend**: Next.js 14+ with Tailwind CSS and Shadcn/UI components
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI Layer**: Configurable OpenAI/Gemini integration via LangChain
- **Vector Store**: Supabase pgvector for RAG
- **State Management**: React Server Components + useOptimistic for chat

## Project Structure

```javascript
ProfAI/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login/signup)
│   ├── (dashboard)/
│   │   ├── student/              # Student dashboard
│   │   └── professor/            # Professor dashboard
│   ├── api/                      # API routes
│   │   ├── chat/                 # Chat endpoint
│   │   ├── upload/               # File upload handler
│   │   └── conductor/            # Sunday Night Conductor trigger
│   └── layout.tsx
├── components/
│   ├── ui/                       # Shadcn/UI components
│   ├── student/                  # Student-specific components
│   ├── professor/                # Professor-specific components
│   └── shared/                   # Shared components
├── lib/
│   ├── agents/                   # Multi-agent router
│   │   ├── router.ts             # AgentRouter (classifies queries)
│   │   ├── syllabus-agent.ts     # POLICY agent
│   │   ├── concept-agent.ts      # CONCEPT agent
│   │   └── escalation-handler.ts # ESCALATE handler
│   ├── rag/                      # RAG implementation
│   │   ├── vector-store.ts       # Vector store client
│   │   ├── chunking.ts           # Document chunking logic
│   │   └── retrieval.ts          # Retrieval logic
│   ├── conductor/                # Sunday Night Conductor
│   │   └── sunday-conductor.ts   # Week announcement generator
│   ├── ai/                       # AI client abstraction
│   │   ├── client.ts             # Configurable OpenAI/Gemini client
│   │   └── langchain-setup.ts    # LangChain integration
│   └── utils/
├── supabase/
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge Functions
│       └── sunday-conductor/     # Scheduled conductor function
└── types/                        # TypeScript types
```



## Database Schema (Supabase)

Key tables:

- `profiles` - User profiles (students/professors)
- `courses` - Course metadata
- `course_content` - Chunked syllabus/lecture content with embeddings
- `escalations` - Student escalation queue
- `announcements` - Weekly announcements (drafts + published)
- `chat_logs` - Chat history for analytics
- `schedules` - Weekly schedule data (from CSV)

## Implementation Phases

### Phase 1: Foundation & Data Ingestion

**Task 1.1 - Database Setup & RAG Infrastructure**

- Create Supabase migrations for all tables
- Set up pgvector extension
- Create `course_content` table with vector column
- Initialize vector store client in `lib/rag/vector-store.ts`
- Implement chunking logic in `lib/rag/chunking.ts` (PDF parsing + metadata extraction)

**Task 1.2 - Onboarding UI**

- Build file upload component (`components/shared/FileUpload.tsx`)
- Create onboarding page (`app/(dashboard)/onboarding/page.tsx`)
- Implement upload API route (`app/api/upload/route.ts`)
- Handle PDF syllabus parsing and CSV schedule parsing
- Store chunks in database with week/topic metadata

### Phase 2: Multi-Agent Router

**Task 2.1 - Agent Router System**

- Implement `AgentRouter` in `lib/agents/router.ts` with classification logic
- Create three agent handlers:
- `lib/agents/syllabus-agent.ts` (POLICY - RAG over syllabus)
- `lib/agents/concept-agent.ts` (CONCEPT - RAG over lecture notes)
- `lib/agents/escalation-handler.ts` (ESCALATE - creates escalation entry)
- Implement strict "I don't know" logic - if RAG retrieval confidence is low, escalate
- Add source citation generation (syllabus page numbers, lecture references)

**Task 2.2 - Student Chat Interface**

- Build chat UI component (`components/student/ChatInterface.tsx`)
- Create chat API route (`app/api/chat/route.ts`)
- Implement useOptimistic for fast message updates
- Display source citations for every AI response
- Show escalation confirmation when sensitive queries trigger escalation

### Phase 3: Professor Command Center

**Task 3.1 - Sunday Night Conductor**

- Implement conductor logic (`lib/conductor/sunday-conductor.ts`)
- Create Supabase Edge Function for scheduled execution
- Build manual trigger API route (`app/api/conductor/route.ts`)
- Generate week announcements based on schedule CSV
- Store drafts in `announcements` table

**Task 3.2 - Professor Dashboard**

- Create dashboard page (`app/(dashboard)/professor/page.tsx`)
- Build three widgets:
- `components/professor/AnnouncementDrafts.tsx` - Draft list with approve/edit
- `components/professor/EscalationQueue.tsx` - Student escalations list
- `components/professor/PulseReport.tsx` - 3-bullet confusion summary from chat logs

### Phase 4: Polish & Demo

**Task 4.1 - Demo Mode**

- Add demo mode toggle in environment/config
- Mock system time to "Week 4" when enabled
- Update conductor and schedule logic to respect demo mode

**Task 4.2 - UX Polish**

- Add toast notifications (using Shadcn/UI toast)
- Implement loading states throughout
- Add error boundaries
- Optimize chat performance

## Technical Decisions

1. **AI Provider**: Configurable via environment variables, defaults to OpenAI, supports Gemini
2. **RAG Implementation**: Use LangChain's Supabase vector store integration
3. **Chunking Strategy**: Semantic chunking with overlap, preserve page numbers for citations
4. **Classification**: Use LLM-based classification in AgentRouter (fast, accurate)
5. **Authentication**: Supabase Auth with role-based access (professor vs student)
6. **Scheduling**: Supabase Edge Function with cron trigger + manual API endpoint

## Key Files to Create

- `lib/agents/router.ts` - Core routing logic
- `lib/rag/vector-store.ts` - Vector store client
- `lib/conductor/sunday-conductor.ts` - Week announcement generator
- `app/api/chat/route.ts` - Chat endpoint
- `components/student/ChatInterface.tsx` - Chat UI
- `components/professor/Dashboard.tsx` - Professor dashboard
- `supabase/migrations/001_initial_schema.sql` - Database schema

## Success Metrics

- Phase 1: File upload → chunks stored with metadata
- Phase 2: "When is the midterm?" → Syllabus Agent; "I'm sick" → Escalation
- Phase 3: Professor sees pending announcement + escalation queue