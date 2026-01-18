---
name: ProfAI Frontend Plan (Gautam)
overview: "Frontend implementation plan for ProfAI: UI components, pages, and user interfaces that consume the backend APIs built by Abhinav."
todos:
  - id: project-setup
    content: Initialize Next.js project with TypeScript, Tailwind CSS, and Shadcn/UI. Set up folder structure and install dependencies.
    status: pending
  - id: auth-ui
    content: Create login and signup pages (app/(auth)/login/page.tsx, signup/page.tsx) with forms, error handling, and styling.
    status: pending
    dependencies:
      - project-setup
  - id: api-client-setup
    content: Create lib/api/ folder with base API client utility, placeholder functions for endpoints, and TypeScript types.
    status: pending
    dependencies:
      - project-setup
  - id: shared-components
    content: Install Shadcn/UI components, create LoadingSpinner, ErrorBoundary, and other shared components.
    status: pending
    dependencies:
      - project-setup
  - id: phase1-integration
    content: Phase 1 Integration Testing - Test auth flow, Supabase connection, API client, coordinate with backend team.
    status: pending
    dependencies:
      - auth-ui
      - api-client-setup
      - shared-components
  - id: file-upload-component
    content: Create FileUpload component (components/shared/FileUpload.tsx) with drag-and-drop, file preview, and progress indicator.
    status: pending
    dependencies:
      - shared-components
  - id: onboarding-page
    content: Create onboarding page (app/(dashboard)/onboarding/page.tsx) with two-file upload interface and API integration.
    status: pending
    dependencies:
      - file-upload-component
      - api-client-setup
  - id: phase2-integration
    content: Phase 2 Integration Testing - Test file upload with /api/upload, verify chunk counts, coordinate with backend team.
    status: pending
    dependencies:
      - onboarding-page
  - id: chat-api-client
    content: Implement chat API client (lib/api/chat.ts) to send messages and handle responses with citations.
    status: pending
    dependencies:
      - api-client-setup
  - id: chat-components
    content: Create MessageBubble and CitationDisplay components for displaying chat messages and citations.
    status: pending
    dependencies:
      - shared-components
  - id: chat-interface
    content: Create ChatInterface component with useOptimistic, message list, input field, and citation display.
    status: pending
    dependencies:
      - chat-components
      - chat-api-client
  - id: student-chat-page
    content: Create student chat page (app/(dashboard)/student/chat/page.tsx) integrating ChatInterface component.
    status: pending
    dependencies:
      - chat-interface
  - id: phase3-integration
    content: Phase 3 Integration Testing - Test chat interface with /api/chat, verify citations and escalations, coordinate with backend team.
    status: pending
    dependencies:
      - student-chat-page
  - id: dashboard-api-clients
    content: Implement API clients for announcements, escalations, pulse, and conductor endpoints.
    status: pending
    dependencies:
      - api-client-setup
  - id: announcement-widget
    content: Create AnnouncementDrafts widget with list display, approve/edit buttons, and edit dialog.
    status: pending
    dependencies:
      - dashboard-api-clients
  - id: escalation-widget
    content: Create EscalationQueue widget displaying list of pending escalations with student info and queries.
    status: pending
    dependencies:
      - dashboard-api-clients
  - id: pulse-widget
    content: Create PulseReport widget displaying 3-bullet summary of top confusions and statistics.
    status: pending
    dependencies:
      - dashboard-api-clients
  - id: professor-dashboard
    content: Create professor dashboard page with layout, three widgets, manual conductor trigger, and responsive grid.
    status: pending
    dependencies:
      - announcement-widget
      - escalation-widget
      - pulse-widget
  - id: phase4-integration
    content: Phase 4 Integration Testing - Test all dashboard widgets with backend APIs, verify data formats, coordinate with backend team.
    status: pending
    dependencies:
      - professor-dashboard
  - id: demo-mode-ui
    content: Create DemoModeToggle component and integrate demo mode indicator throughout UI.
    status: pending
    dependencies:
      - shared-components
  - id: toast-notifications
    content: Configure Shadcn/UI Toast and add toast notifications for all major actions (upload, chat, dashboard).
    status: pending
    dependencies:
      - shared-components
  - id: loading-states
    content: Add loading spinners and skeleton loaders to all async operations throughout the app.
    status: pending
    dependencies:
      - shared-components
  - id: error-handling
    content: Add error boundaries, user-friendly error messages, and graceful error handling throughout app.
    status: pending
    dependencies:
      - shared-components
  - id: responsive-design
    content: Ensure all pages are responsive, test mobile layouts, and adjust grid layouts for smaller screens.
    status: pending
    dependencies:
      - professor-dashboard
      - student-chat-page
      - onboarding-page
  - id: phase5-integration
    content: Phase 5 Final Integration Testing - Test demo mode, end-to-end flows, coordinate full system integration with backend, fix integration bugs.
    status: pending
    dependencies:
      - responsive-design
      - demo-mode-ui
      - toast-notifications
      - loading-states
      - error-handling
---

# ProfAI Frontend Plan (Gautam)

## Overview

This plan covers all frontend UI/UX work. You'll consume the APIs that Abhinav builds. The backend provides the API contracts defined in the backend plan.

## Project Structure (Frontend Focus)

```javascript
ProfAI/
├── app/                          # Next.js App Router (FRONTEND)
│   ├── (auth)/                   # Auth routes (FRONTEND)
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── onboarding/page.tsx   # Onboarding UI
│   │   ├── student/
│   │   │   └── chat/page.tsx     # Student chat page
│   │   └── professor/
│   │       └── dashboard/page.tsx # Professor dashboard
│   ├── layout.tsx
│   └── page.tsx                  # Landing/home page
├── components/
│   ├── ui/                       # Shadcn/UI components (FRONTEND)
│   ├── auth/                     # Auth UI components
│   ├── student/                  # Student components (FRONTEND)
│   │   ├── ChatInterface.tsx     # Main chat UI
│   │   ├── MessageBubble.tsx     # Individual message
│   │   └── CitationDisplay.tsx   # Citation display
│   ├── professor/                # Professor components (FRONTEND)
│   │   ├── Dashboard.tsx         # Main dashboard layout
│   │   ├── AnnouncementDrafts.tsx # Announcement drafts widget
│   │   ├── EscalationQueue.tsx   # Escalation queue widget
│   │   └── PulseReport.tsx       # Pulse report widget
│   └── shared/                   # Shared components (FRONTEND)
│       ├── FileUpload.tsx        # Drag-and-drop upload
│       ├── LoadingSpinner.tsx    # Loading states
│       └── DemoModeToggle.tsx    # Demo mode toggle
├── lib/
│   ├── api/                      # API client functions (FRONTEND)
│   │   ├── chat.ts               # Chat API calls
│   │   ├── upload.ts             # Upload API calls
│   │   ├── escalations.ts        # Escalations API calls
│   │   ├── announcements.ts      # Announcements API calls
│   │   ├── conductor.ts          # Conductor API calls
│   │   └── pulse.ts              # Pulse API calls
│   └── utils/
└── types/                        # TypeScript types (shared with backend)
```



## API Dependencies (From Backend)

You'll consume these APIs (Abhinav will build them):

- **POST /api/upload** - Upload syllabus PDF and schedule CSV
- **POST /api/chat** - Send chat messages, get AI responses
- **GET /api/escalations** - Get escalation queue
- **GET /api/announcements** - Get announcement drafts
- **POST /api/announcements** - Create announcement
- **PUT /api/announcements/:id** - Update announcement
- **POST /api/conductor** - Trigger Sunday Night Conductor
- **GET /api/pulse** - Get pulse report data

**Note**: Backend will support `MOCK_MODE` environment variable that returns mock responses instead of making LLM API calls. This allows frontend development without API costs. The UI should work the same whether mock mode is on or off.

## Implementation Tasks

### Phase 1: Foundation & Setup

**Task 1.1: Project Setup**

- Initialize Next.js 14+ project with TypeScript
- Set up Tailwind CSS
- Install and configure Shadcn/UI components
- Set up folder structure
- Install dependencies (axios/fetch for API calls)

**Task 1.2: Authentication UI**

- Create login page: `app/(auth)/login/page.tsx`
- Email/password form
- Error handling
- Redirect to dashboard on success
- Create signup page: `app/(auth)/signup/page.tsx`
- Registration form with role selection (student/professor)
- Error handling
- Create auth layout: `app/(auth)/layout.tsx`
- Style with Tailwind and Shadcn/UI components

**Task 1.3: API Client Setup**

- Create `lib/api/` folder structure
- Create base API client utility (handles auth headers, errors)
- Set up environment variables for API base URL
- Create placeholder functions for each API endpoint
- Add TypeScript types for API responses
- Note: Backend will handle mock mode, so frontend can work with mock responses during development

**Task 1.4: Shared Components**

- Create `components/ui/` - Install core Shadcn/UI components:
- Button, Input, Card, Dialog, Toast, etc.
- Create `components/shared/LoadingSpinner.tsx` - Reusable loading component
- Create `components/shared/ErrorBoundary.tsx` - Error boundary component
- Create layout wrapper components

**Integration Task 1.5: Phase 1 Integration Testing**

- Test authentication flow with backend (login/signup)
- Verify Supabase client connection works
- Test API client setup and error handling
- Coordinate with backend team to verify RLS policies
- Test user role-based access (student vs professor)
- Verify TypeScript types match backend API contracts
- Test error handling for API failures
- Verify shared components render correctly

### Phase 2: Onboarding UI

**Task 2.1: File Upload Component**

- Create `components/shared/FileUpload.tsx`
- Drag-and-drop zone for files
- Support PDF and CSV file types
- File preview/display
- Progress indicator during upload
- Error handling for invalid files
- Style with Tailwind and Shadcn/UI

**Task 2.2: Onboarding Page**

- Create `app/(dashboard)/onboarding/page.tsx`
- Two-file upload interface:
- Syllabus PDF upload
- Schedule CSV upload
- Upload button that calls `/api/upload`
- Loading states during upload
- Success message with chunk counts
- Error handling and display
- Redirect to appropriate dashboard after success

**Task 2.3: Upload API Integration**

- Implement `lib/api/upload.ts`
- Use FormData to send files
- Handle upload progress
- Display success/error messages
- Update onboarding page to use API client

**Integration Task 2.4: Phase 2 Integration Testing**

- Test file upload with /api/upload endpoint
- Verify PDF and CSV files upload successfully
- Test upload progress indicator
- Verify success message displays chunk counts
- Test error handling for invalid files
- Test error handling for API failures
- Coordinate with backend team to verify files are stored correctly
- Test redirect to appropriate dashboard after upload
- Verify course ID is received and stored correctly

### Phase 3: Student Chat Interface

**Task 3.1: Chat API Client**

- Implement `lib/api/chat.ts`
- Function to send chat message
- Handle response with citations
- Error handling

**Task 3.2: Chat Message Components**

- Create `components/student/MessageBubble.tsx`
- Display user messages and AI responses
- Different styling for user vs AI
- Timestamp display
- Create `components/student/CitationDisplay.tsx`
- Display citations (e.g., "See Syllabus page 4")
- List format for multiple citations
- Link-style formatting

**Task 3.3: Chat Interface Component**

- Create `components/student/ChatInterface.tsx`
- Message list with scroll-to-bottom
- Input field for typing messages
- Send button
- Use `useOptimistic` hook for fast message updates
- Display citations for every AI response
- Show loading state while AI is responding
- Handle escalation confirmation (when agent type is ESCALATE)
- Auto-scroll to new messages
- Style with Tailwind and Shadcn/UI

**Task 3.4: Student Chat Page**

- Create `app/(dashboard)/student/chat/page.tsx`
- Integrate ChatInterface component
- Fetch and display chat history (if backend provides)
- Handle authentication/authorization
- Responsive layout

**Integration Task 3.5: Phase 3 Integration Testing**

- Test chat interface with /api/chat endpoint
- Verify messages send and receive correctly
- Test citation display matches backend format
- Verify useOptimistic updates work correctly
- Test escalation confirmation display (when agent type is ESCALATE)
- Test loading states during AI response
- Test error handling for chat API failures
- Coordinate with backend team to verify chat logging
- Test different query types (POLICY, CONCEPT, ESCALATE)
- Verify chat history displays correctly (if implemented)

### Phase 4: Professor Dashboard

**Task 4.1: Dashboard API Clients**

- Implement `lib/api/announcements.ts` - CRUD operations
- Implement `lib/api/escalations.ts` - Fetch escalations
- Implement `lib/api/pulse.ts` - Fetch pulse report
- Implement `lib/api/conductor.ts` - Trigger conductor

**Task 4.2: Announcement Drafts Widget**

- Create `components/professor/AnnouncementDrafts.tsx`
- Fetch announcements from `/api/announcements`
- Display list of draft announcements
- Show week number, title, preview
- "Approve" button - updates status to published
- "Edit" button - opens edit dialog
- Edit dialog with title and content fields
- Loading states
- Error handling

**Task 4.3: Escalation Queue Widget**

- Create `components/professor/EscalationQueue.tsx`
- Fetch escalations from `/api/escalations`
- Display list of pending escalations
- Show student name, email, query text, timestamp
- Mark as resolved functionality (if backend supports)
- Loading states
- Empty state when no escalations

**Task 4.4: Pulse Report Widget**

- Create `components/professor/PulseReport.tsx`
- Fetch pulse data from `/api/pulse`
- Display 3-bullet summary of top confusions
- Show total queries and escalation count
- Visual formatting (cards, lists)
- Loading states

**Task 4.5: Professor Dashboard Page**

- Create `app/(dashboard)/professor/dashboard/page.tsx`
- Layout with three widgets:
- Announcement Drafts (left column)
- Escalation Queue (middle column)
- Pulse Report (right column)
- Responsive grid layout
- Manual trigger button for Sunday Night Conductor
- Refresh functionality
- Loading states for initial load

**Integration Task 4.6: Phase 4 Integration Testing**

- Test announcement drafts widget with /api/announcements
- Test escalation queue widget with /api/escalations
- Test pulse report widget with /api/pulse
- Test conductor trigger with /api/conductor
- Verify all three widgets display data correctly
- Test approve/edit workflow for announcements
- Test manual conductor trigger
- Verify data refresh functionality
- Coordinate with backend team to verify data formats
- Test error handling for all dashboard API calls
- Verify empty states display correctly

### Phase 5: Polish & Demo Mode

**Task 5.1: Demo Mode Toggle (UI)**

- Create `components/shared/DemoModeToggle.tsx`
- Toggle switch component
- Store demo mode state (localStorage or context)
- Display demo mode indicator in UI
- Style to match app design

**Task 5.2: Toast Notifications**

- Install/configure Shadcn/UI Toast component
- Add toast notifications for:
- File upload success/error
- Chat message errors
- Announcement approve/edit actions
- Conductor trigger success
- General error states
- Consistent styling throughout app

**Task 5.3: Loading States**

- Add loading spinners to all async operations:
- File upload
- Chat messages
- Dashboard data fetching
- API calls
- Use skeleton loaders for better UX
- Disable buttons during loading

**Task 5.4: Error Handling**

- Add error boundaries to major pages
- Display user-friendly error messages
- Handle network errors gracefully
- Retry functionality where appropriate
- Error logging (optional)

**Task 5.5: Responsive Design**

- Ensure all pages work on mobile
- Test responsive layouts
- Adjust grid layouts for smaller screens
- Mobile-friendly navigation

**Integration Task 5.6: Phase 5 Integration Testing & Final Integration**

- Test demo mode toggle with backend demo mode
- Verify demo mode affects all components correctly
- Test toast notifications for all major actions
- Test loading states across all pages
- Test error boundaries and error handling
- Coordinate with backend team for end-to-end testing
- Test complete user flows: auth → upload → chat → dashboard
- Verify responsive design on different screen sizes
- Perform full system integration test with backend
- Fix any integration bugs discovered during testing
- Verify all features work together smoothly

## Design Guidelines

1. **Styling**: Use Tailwind CSS utility classes
2. **Components**: Use Shadcn/UI components as base, customize as needed
3. **Colors**: Use Tailwind color palette, maintain consistency
4. **Typography**: Use Tailwind typography classes
5. **Spacing**: Use consistent spacing scale (Tailwind spacing)
6. **Icons**: Use Lucide React icons (commonly used with Shadcn/UI)

## Key Technical Decisions

1. **State Management**: React Server Components + useOptimistic for chat
2. **API Calls**: Fetch API or axios (choose one consistently)
3. **Error Handling**: Toast notifications + error boundaries
4. **Loading States**: Shadcn/UI Skeleton components + LoadingSpinner
5. **Demo Mode**: localStorage or React Context for state
6. **Responsive**: Mobile-first approach with Tailwind breakpoints

## Dependencies to Install

- `next` (14+)
- `react` (18+)
- `typescript`
- `tailwindcss`
- `@radix-ui/*` (for Shadcn/UI)
- `lucide-react` (icons)
- `clsx` / `tailwind-merge` (utility functions)
- `axios` or use native `fetch` (for API calls)

## Success Criteria

- Phase 1: Login/signup pages work, basic layout established
- Phase 2: File upload works, files can be uploaded successfully
- Phase 3: Chat interface is responsive, messages appear with citations
- Phase 4: Professor dashboard displays all three widgets with data
- Phase 5: App feels polished with loading states, toasts, and error handling

## Coordination with Backend

1. **Wait for API Contracts**: Abhinav will provide API endpoint documentation
2. **TypeScript Types**: Share types between frontend and backend (in `types/` folder)
3. **Testing**: Test with mock data first, then integrate with real APIs
4. **Error Formats**: Coordinate error response formats with backend