# SyllabusOS - AI Professor-in-a-Box

An intelligent course management system that automates syllabus operations, weekly pacing, and student triage using AI-powered multi-agent routing. Think of it as a "TA in a box" that handles routine course questions while intelligently escalating complex issues to the professor.

## 🎯 Project Overview

SyllabusOS is designed to manage course operations rather than just teaching content. It acts as a smart assistant that:

- **Answers student questions** about course policies, concepts, and schedules
- **Automatically triages** queries to determine if they need professor attention
- **Generates weekly announcements** based on course schedules
- **Provides insights** to professors about student confusions and concerns

The system uses a **human-in-the-loop** approach where AI handles routine tasks and escalates complex or sensitive issues to the professor.

## 🏗️ Architecture

### Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Styling**: Tailwind CSS + Shadcn/UI components
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Google Gemini via LangChain
- **Vector DB**: Supabase Vector (pgvector) for RAG
- **State Management**: React Server Components + useOptimistic for chat

### Key Components

1. **Multi-Agent Router**: Classifies student queries into three categories:
   - **POLICY** (Syllabus questions) → Routes to Syllabus Agent
   - **CONCEPT** (Learning questions) → Routes to Concept Agent
   - **ESCALATE** (Personal/Complex issues) → Creates escalation for professor

2. **RAG (Retrieval-Augmented Generation)**: 
   - Chunks syllabus and course content into vector embeddings
   - Retrieves relevant context for accurate responses
   - Provides source citations (e.g., "See Syllabus page 4")

3. **Sunday Night Conductor**: 
   - Automated weekly announcement generator
   - Reads course schedule and generates week-specific announcements
   - Creates drafts for professor review and approval

## 🚀 Core Features

### For Students

#### Chat Interface
- Ask questions about the course in natural language
- Receive instant responses with source citations
- Get answers about:
  - Course policies (deadlines, grading, attendance)
  - Course concepts and materials
  - Weekly schedules and upcoming assignments

#### Smart Escalation
- Personal issues (e.g., "I'm sick, can I have an extension?") automatically create escalation tickets
- Students receive confirmation when their query has been escalated
- All sensitive queries are flagged for professor review

### For Professors

#### Professor Dashboard

**1. Announcement Drafts Widget**
- View automatically generated weekly announcements
- Review and edit before publishing
- Approve announcements to publish them to students

**2. Escalation Queue**
- See all student queries that need personal attention
- View student name, email, query text, and timestamp
- Resolve escalations after addressing student concerns

**3. Pulse Report**
- 3-bullet summary of "Top Student Confusions"
- Based on analysis of chat logs
- Helps professors identify topics that need clarification
- Shows total queries and escalation counts

#### Manual Controls
- Trigger Sunday Night Conductor manually to generate announcements
- View and manage all course content
- Monitor system activity and student engagement

### System Features

#### Intelligent Query Classification
The Agent Router uses AI to classify each student query:
- **POLICY**: Questions about syllabus, deadlines, grading policies
  - Example: "When is the midterm?"
  - Routes to: Syllabus Agent (RAG over syllabus content)

- **CONCEPT**: Questions about course material, lectures, concepts
  - Example: "Can you explain recursion?"
  - Routes to: Concept Agent (RAG over lecture notes/content)

- **ESCALATE**: Personal, complex, or sensitive issues
  - Example: "I'm having personal issues and need an extension"
  - Routes to: Escalation Handler (creates ticket for professor)

#### Source Citations
Every AI response includes citations:
- "See Syllabus page 4, section 2.3"
- "See Lecture Week 5, slide 12"
- Helps students verify information and find original sources

#### Strict "I Don't Know" Policy
- If the AI can't find relevant information in the course materials
- If retrieval confidence is low (< 0.7)
- Automatically escalates to professor rather than hallucinating answers

## 📋 User Flows

### Student Flow

1. **Login/Signup** → Student creates account or logs in
2. **Onboarding** (First-time only) → Professor uploads syllabus PDF and schedule CSV
3. **Chat Interface** → Student asks questions in natural language
4. **Get Response** → Receives answer with citations or escalation confirmation
5. **View Escalations** → Can see status of escalated queries

### Professor Flow

1. **Login/Signup** → Professor creates account with professor role
2. **Course Setup** → Upload syllabus PDF and schedule CSV
3. **Weekly Routine**:
   - Review and approve Sunday Night Conductor announcements
   - Check Escalation Queue for student issues
   - Review Pulse Report for insights
4. **Ongoing Management**:
   - Resolve escalations
   - Edit and publish announcements
   - Monitor student questions and confusion patterns

### Sunday Night Conductor Flow

1. **Automated Trigger** → Runs every Sunday night (or manually triggered)
2. **Schedule Analysis** → Reads course schedule to determine current week
3. **Announcement Generation** → AI generates week-specific announcement in professor's persona
4. **Draft Creation** → Saves announcement as draft in professor dashboard
5. **Professor Review** → Professor reviews, edits, and approves announcement
6. **Publication** → Approved announcement is published to students

## 🔧 Technical Implementation

### Multi-Agent System

```
User Query
    ↓
Agent Router (Classification)
    ↓
┌──────────┬──────────┬──────────┐
│ POLICY   │ CONCEPT  │ ESCALATE │
│ Agent    │ Agent    │ Handler  │
│          │          │          │
│ RAG over │ RAG over │ Creates  │
│ Syllabus │ Lectures │ Ticket   │
└──────────┴──────────┴──────────┘
    ↓
Response with Citations
```

### Database Schema

- **profiles**: User accounts (students/professors)
- **courses**: Course metadata
- **course_content**: Chunked syllabus/lecture content with vector embeddings
- **schedules**: Weekly schedule data (from CSV)
- **escalations**: Student escalation queue
- **announcements**: Weekly announcements (drafts + published)
- **chat_logs**: Chat history for analytics

### API Endpoints

#### For Students
- `POST /api/chat` - Send chat message, receive AI response
- `GET /api/announcements` - Get published announcements

#### For Professors
- `GET /api/escalations` - Get escalation queue
- `GET /api/announcements` - Get all announcements (drafts + published)
- `POST /api/announcements` - Create announcement
- `PUT /api/announcements/:id` - Update/publish announcement
- `POST /api/conductor` - Trigger Sunday Night Conductor
- `GET /api/pulse` - Get pulse report data

#### Shared
- `POST /api/upload` - Upload syllabus PDF and schedule CSV

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Google Cloud account (for Gemini API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/A5bhinav/SyllabusOS.git
   cd SyllabusOS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google Gemini AI Configuration
   GOOGLE_GENAI_API_KEY=your_google_gemini_api_key

   # Application Configuration
   MOCK_MODE=false  # Set to true for development (saves API costs)
   DEMO_MODE=false  # Set to true to mock system time to Week 4
   DEMO_WEEK=4
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run database migrations (see `supabase/migrations/`)
   - Enable pgvector extension

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Development Modes

### Mock Mode
Set `MOCK_MODE=true` in your `.env` file to:
- Skip actual API calls to Gemini
- Return mock responses for testing
- Save costs during development
- Test UI without API dependencies

### Demo Mode
Set `DEMO_MODE=true` and `DEMO_WEEK=4` to:
- Mock system time to a specific week
- Test Sunday Night Conductor logic
- Demo the app without waiting for real time

## 📁 Project Structure

```
SyllabusOS/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── chat/            # Chat endpoint
│   │   ├── upload/          # File upload handler
│   │   ├── conductor/       # Sunday Night Conductor trigger
│   │   ├── escalations/     # Escalation CRUD
│   │   ├── announcements/   # Announcement CRUD
│   │   └── pulse/           # Pulse report data
│   ├── (auth)/              # Auth routes
│   ├── (dashboard)/         # Dashboard routes
│   │   ├── student/         # Student dashboard
│   │   └── professor/       # Professor dashboard
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Shadcn/UI components
│   ├── student/             # Student-specific components
│   ├── professor/           # Professor-specific components
│   └── shared/              # Shared components
├── lib/
│   ├── agents/              # Multi-agent router
│   │   ├── router.ts        # AgentRouter (classifies queries)
│   │   ├── syllabus-agent.ts    # POLICY agent
│   │   ├── concept-agent.ts     # CONCEPT agent
│   │   └── escalation-handler.ts # ESCALATE handler
│   ├── rag/                 # RAG implementation
│   │   ├── vector-store.ts  # Vector store client
│   │   ├── chunking.ts      # Document chunking logic
│   │   └── retrieval.ts     # Retrieval logic
│   ├── conductor/           # Sunday Night Conductor
│   │   └── sunday-conductor.ts
│   ├── ai/                  # AI client abstraction
│   │   ├── client.ts        # Gemini AI client
│   │   └── langchain-setup.ts
│   ├── supabase/            # Supabase client setup
│   │   ├── client.ts        # Client-side client
│   │   └── server.ts        # Server-side client
│   └── utils/               # Utility functions
├── supabase/
│   ├── migrations/          # Database migrations
│   └── functions/           # Edge Functions
│       └── sunday-conductor/
├── types/                   # TypeScript types
└── docs/                    # Project documentation
```

## 🎓 Use Cases

### Example 1: Policy Question
**Student asks**: "When is the midterm exam?"

**System response**:
- Agent Router classifies as **POLICY**
- Routes to Syllabus Agent
- Retrieves relevant syllabus section via RAG
- Returns: "The midterm exam is scheduled for October 15th, 2024. See Syllabus page 8, section 4.2."

### Example 2: Concept Question
**Student asks**: "Can you explain how binary search works?"

**System response**:
- Agent Router classifies as **CONCEPT**
- Routes to Concept Agent
- Retrieves relevant lecture content via RAG
- Returns: "Binary search is a divide-and-conquer algorithm... See Lecture Week 6, slide 15."

### Example 3: Escalation
**Student asks**: "I'm experiencing a family emergency and won't be able to submit the assignment on time."

**System response**:
- Agent Router classifies as **ESCALATE**
- Routes to Escalation Handler
- Creates escalation ticket in database
- Returns: "I understand your situation. Your request has been escalated to the professor for review. You'll receive a response within 24-48 hours."

### Example 4: Sunday Night Conductor
**Every Sunday at 11 PM**:
- System checks course schedule
- Determines it's Week 5
- Generates announcement: "Welcome to Week 5! This week we'll be covering recursion and data structures. Don't forget the assignment is due Friday at 11:59 PM..."
- Saves as draft for professor review
- Professor approves and publishes Monday morning

## 🤝 Team Workflow

This project is designed for a 2-person team:

- **Lead Architect (Backend)**: Multi-Agent Router, RAG implementation, Sunday Night Conductor logic
- **UI/UX Specialist (Frontend)**: Student/Professor Dashboards, Escalation Queue UI, component design

The architecture allows parallel development with clear API contracts.

## 📝 License

ISC

## 🙏 Acknowledgments

Built with Next.js, Supabase, Google Gemini, and LangChain.

