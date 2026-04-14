# CoachCRM -- Basketball Coach CRM/LMS Platform

## Project Overview

CoachCRM is a web-based CRM/LMS platform for basketball coaches to manage their players and training sessions. The core workflow is:

1. Coach signs up / logs in
2. Coach adds players to their roster (name, position, jersey number, email)
3. Coach starts a new training session, selects participating players, and records what they say during practice using real-time speech-to-text (AssemblyAI)
4. The transcript is saved to the database
5. Coach clicks "Generate AI Feedback" which sends the transcript to Claude (Anthropic), which returns structured per-player feedback as JSON
6. Each player gets a feedback card showing: summary, strengths, areas to improve, recommended drills, and an overall rating out of 10

Future: a student dashboard where players can log in and see their own feedback over time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (base-ui primitives) |
| Icons | Lucide React |
| Auth | Supabase Auth (email/password, no email confirmation) |
| Database | Supabase (PostgreSQL with Row Level Security) |
| Speech-to-Text | AssemblyAI Streaming API v3 (WebSocket, real-time) |
| AI Feedback | Anthropic Claude API (claude-sonnet-4-20250514) |
| Fonts | Geist Sans + Geist Mono (Google Fonts) |

---

## Architecture

```
Browser (React)
  |
  |-- getUserMedia() -> AudioContext -> ScriptProcessorNode -> PCM 16-bit 16kHz
  |-- WebSocket to wss://streaming.assemblyai.com/v3/ws (real-time STT)
  |
  |-- Supabase client (browser) for auth sign-out
  |-- fetch() to Next.js API routes for all data operations
  |
Next.js Server (API Routes)
  |
  |-- /api/transcribe-token  -> calls AssemblyAI GET /v3/token (returns temp auth token)
  |-- /api/players           -> Supabase CRUD (scoped to auth user)
  |-- /api/sessions          -> Supabase CRUD (scoped to auth user)
  |-- /api/feedback           -> GET: fetch feedback | POST: call Claude API, parse JSON, store in Supabase
  |
  |-- Supabase server client (cookie-based SSR auth)
  |-- Anthropic SDK for Claude API calls
  |
Supabase (PostgreSQL)
  |-- coaches, players, training_sessions, session_players, player_feedback
  |-- Row Level Security: all tables scoped to auth.uid()
  |
AssemblyAI
  |-- Streaming API v3 WebSocket (speech_model: universal-streaming-english)
  |-- Temporary token auth (server generates, browser connects)
  |
Anthropic Claude
  |-- Receives transcript + player names
  |-- Returns structured JSON: per-player summary, strengths, improvements, drills, rating
```

---

## Database Schema (Supabase PostgreSQL)

### Tables

**coaches**
- `id` UUID PRIMARY KEY (= auth.uid(), not auto-generated)
- `name` TEXT NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

**players**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `email` TEXT nullable
- `position` TEXT nullable (Point Guard, Shooting Guard, Small Forward, Power Forward, Center)
- `jersey_number` INT nullable
- `created_at` TIMESTAMPTZ DEFAULT now()

**training_sessions**
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches(id) ON DELETE CASCADE
- `title` TEXT NOT NULL
- `date` DATE DEFAULT CURRENT_DATE
- `transcript` TEXT nullable (full transcript from STT)
- `status` TEXT DEFAULT 'recording' CHECK ('recording', 'transcribed', 'analyzed')
- `created_at` TIMESTAMPTZ DEFAULT now()

**session_players** (many-to-many join)
- `session_id` UUID FK -> training_sessions(id) ON DELETE CASCADE
- `player_id` UUID FK -> players(id) ON DELETE CASCADE
- PRIMARY KEY (session_id, player_id)

**player_feedback** (AI-generated)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `session_id` UUID FK -> training_sessions(id) ON DELETE CASCADE
- `player_id` UUID FK -> players(id) ON DELETE CASCADE
- `summary` TEXT NOT NULL
- `strengths` JSONB DEFAULT '[]'
- `improvements` JSONB DEFAULT '[]'
- `drills_recommended` JSONB DEFAULT '[]'
- `overall_rating` INT CHECK (1-10)
- `raw_ai_response` JSONB nullable
- `created_at` TIMESTAMPTZ DEFAULT now()

### Row Level Security

All tables have RLS enabled. Policies scope all operations to `auth.uid()`:
- coaches: `auth.uid() = id`
- players: `coach_id = auth.uid()`
- training_sessions: `coach_id = auth.uid()`
- session_players: EXISTS subquery checking session's coach_id = auth.uid()
- player_feedback: EXISTS subquery checking session's coach_id = auth.uid()

---

## File Structure

```
coach-crm/
├── src/
│   ├── app/
│   │   ├── layout.tsx                          # Root layout (Geist fonts, global CSS)
│   │   ├── page.tsx                            # Redirects to /dashboard
│   │   ├── globals.css                         # Tailwind v4 + shadcn theme (oklch colors)
│   │   ├── login/
│   │   │   ├── page.tsx                        # Login/signup form
│   │   │   └── actions.ts                      # Server actions: login(), signup()
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                      # Dashboard shell (sidebar + header + main)
│   │   │   ├── page.tsx                        # Overview: stat cards + recent sessions + roster
│   │   │   ├── players/
│   │   │   │   └── page.tsx                    # Player CRUD: table + add/edit dialog
│   │   │   └── sessions/
│   │   │       ├── page.tsx                    # Session history list table
│   │   │       ├── new/
│   │   │       │   └── page.tsx                # New session: 3-step wizard
│   │   │       └── [id]/
│   │   │           └── page.tsx                # Session detail: transcript + feedback cards
│   │   └── api/
│   │       ├── transcribe-token/route.ts       # GET: AssemblyAI temp token
│   │       ├── players/route.ts                # GET/POST/PUT/DELETE players
│   │       ├── sessions/route.ts               # GET/POST/PUT sessions
│   │       └── feedback/route.ts               # GET feedback | POST generate via Claude
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                     # Desktop sidebar nav
│   │   │   ├── header.tsx                      # Top bar with sign-out
│   │   │   └── mobile-nav.tsx                  # Mobile sheet nav
│   │   ├── transcribe-recorder.tsx             # Recording UI with live transcript
│   │   ├── feedback-card.tsx                   # Per-player feedback card
│   │   └── ui/                                 # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── hooks/
│   │   └── use-transcribe.ts                   # AssemblyAI WebSocket hook
│   ├── lib/
│   │   ├── types.ts                            # TypeScript interfaces
│   │   ├── utils.ts                            # cn() utility
│   │   └── supabase/
│   │       ├── client.ts                       # Browser Supabase client
│   │       ├── server.ts                       # Server Supabase client (cookies)
│   │       └── middleware.ts                   # Session refresh + auth redirect
│   └── middleware.ts                           # Next.js middleware entry point
├── supabase-schema.sql                         # Full DB schema with RLS
├── .env.local                                  # Environment variables
├── .env.example                                # Template for env vars
├── package.json
└── tsconfig.json
```

---

## Pages & UI Design

### Login Page (`/login`)

- Centered card layout, full-screen vertically centered
- Trophy icon + "CoachCRM" branding at top
- Toggle between "Sign In" and "Sign Up" modes via text link at bottom
- Sign Up mode adds a "Name" field above email
- Fields: Name (signup only), Email, Password (min 6 chars)
- Single submit button: "Sign In" or "Create Account"
- Error alert shows below the button on failure
- Loading spinner on submit button while processing

### Dashboard Overview (`/dashboard`)

- **4 stat cards** in a responsive grid (sm:2cols, lg:4cols):
  - Total Players (Users icon)
  - Training Sessions (ClipboardList icon)
  - Analyzed (Sparkles icon)
  - Pending (TrendingUp icon)
- **2-column grid** below (lg:2cols):
  - **Recent Sessions** card: list of up to 5 sessions, each as a clickable row with title, date, player count, status badge, arrow icon. "View All" link in header.
  - **Team Roster** card: list of up to 8 players, each with a circular avatar showing jersey number, name, position. "Manage" link in header.
- Empty states: "No sessions yet" with "Record First Session" button, "No players yet" with "Add Players" button

### Players Page (`/dashboard/players`)

- Page title "Players" with "Add Player" button (PlusCircle icon)
- Card containing a data table:
  - Columns: # (jersey), Name (bold), Position (badge), Email, Actions (edit/delete icons)
  - Edit opens a dialog with the same form pre-filled
  - Delete shows a confirmation dialog
- "Add Player" opens a dialog with form:
  - Name (required), Email, Position (dropdown select: Point Guard, Shooting Guard, Small Forward, Power Forward, Center), Jersey Number (0-99)
  - Cancel + Submit buttons
- Empty state: "No players yet. Add your first player to get started."

### Sessions List (`/dashboard/sessions`)

- Page title "Sessions" with "New Session" link button
- Card with data table:
  - Columns: Title, Date (Calendar icon), Players count (Users icon), Status (badge: Analyzed/Transcribed/Recording), Arrow link
  - Each row links to `/dashboard/sessions/[id]`
- Empty state with "Create New Session" button

### New Session Wizard (`/dashboard/sessions/new`)

- **3-step progress indicator** at top: Setup -> Record -> Review (badges with arrows)
- **Step 1 - Setup**:
  - Session Title input (required)
  - Player selection card: grid of checkboxes (2 cols on sm+), each player shown as a label with checkbox, jersey number, name, position
  - "Continue to Recording" button (disabled if no title)
- **Step 2 - Record**:
  - TranscribeRecorder component (see below)
  - "Back" button + conditional "Skip to Review" button
- **Step 3 - Review**:
  - Card showing session title + selected player badges
  - Full-width textarea with transcript (editable, mono font)
  - "Back to Recording" + "Save Session" buttons
  - Save navigates to session detail page

### TranscribeRecorder Component

- Card with "Live Transcription" title (Mic icon)
- Description: "Record your training session. Speech is transcribed in real-time via AssemblyAI."
- Controls row: Start Recording button (Mic icon) OR Stop Recording button (Square icon, destructive variant) + "Recording" pulse badge + Copy button (when transcript exists)
- Error alert (destructive) when connection fails
- ScrollArea (250px height) with transcript:
  - Idle: italic placeholder "Click Start Recording..."
  - Recording with no speech: "Listening... Start speaking." (pulsing)
  - Finalized segments in normal text
  - Current partial in italic muted text
- Segment count text below when transcript exists

### Session Detail (`/dashboard/sessions/[id]`)

- Back arrow link to sessions list
- Title + status badge + date + player count
- Player badges row (showing jersey # + name)
- **Transcript card**: ScrollArea (250px) with the full transcript
- **Separator**
- **Player Feedback section**:
  - Title "Player Feedback" with Sparkles icon
  - "Generate AI Feedback" button (if status != analyzed)
  - Loading state: spinner + "Analyzing transcript with AI..."
  - Empty state: Sparkles icon + "No feedback generated yet" + hint text
  - **Feedback cards** in a 2-column grid (md:2cols)

### FeedbackCard Component

- Card per player with:
  - Header: player name + position, rating badge (Star icon + X/10, color-coded: green >=7, yellow >=4, red <4)
  - Summary paragraph
  - Separator
  - **Strengths** section: ThumbsUp icon (green), badges (secondary variant)
  - **Areas to Improve** section: TrendingUp icon (yellow), badges (outline variant)
  - **Recommended Drills** section: Dumbbell icon (blue), bulleted list

### Sidebar (Desktop)

- 64px wide, left-side, full height, border-right
- Trophy icon + "CoachCRM" brand text in top header
- Nav items with icons, rounded-lg, active state = primary bg + primary-foreground text:
  - Dashboard (LayoutDashboard)
  - Players (Users)
  - Sessions (ClipboardList)
  - New Session (PlusCircle)
- Active detection: exact match for /dashboard, startsWith for others

### Header

- Sticky top, h-16, border-bottom
- Mobile: hamburger menu (Sheet) + Trophy brand
- Desktop: "Basketball Coach Dashboard" text
- Right side: "Sign Out" button with LogOut icon (ghost variant)

### Mobile Nav

- Sheet sliding from left, 264px wide
- Same nav items as sidebar
- Closes on nav item click

---

## Design System & Aesthetics

### Color Theme (oklch-based, light mode)

- Background: pure white `oklch(1 0 0)`
- Foreground: near-black `oklch(0.145 0 0)`
- Primary: very dark `oklch(0.205 0 0)` (black buttons/active states)
- Primary foreground: near-white `oklch(0.985 0 0)`
- Muted: light gray `oklch(0.97 0 0)`
- Muted foreground: medium gray `oklch(0.556 0 0)`
- Destructive: red `oklch(0.577 0.245 27.325)` (recording badge, delete actions)
- Border: light gray `oklch(0.922 0 0)`
- Card: white (same as background)
- Radius: 0.625rem base

### Dark mode supported

- Background: `oklch(0.145 0 0)`
- Card: `oklch(0.205 0 0)`
- Borders: `oklch(1 0 0 / 10%)` (transparent white)
- All colors inverted appropriately

### Typography

- Font: Geist Sans (variable, --font-geist-sans)
- Mono: Geist Mono (for transcript textarea)
- Headings: text-2xl font-bold tracking-tight
- Body: text-sm
- Labels: text-sm font-medium
- Muted text: text-xs or text-sm text-muted-foreground

### Component Patterns

- All cards use shadcn Card with CardHeader (CardTitle + CardDescription) + CardContent
- Buttons: default (primary), outline, ghost, destructive variants
- Badges: default (dark), secondary (light gray), outline, destructive (red pulse for recording)
- Tables: shadcn Table with TableHeader/TableRow/TableHead/TableBody/TableCell
- Dialogs: shadcn Dialog with DialogContent/DialogHeader/DialogTitle
- Forms: Label + Input pairs with space-y-2, wrapped in space-y-4
- Loading: Loader2 icon with animate-spin
- Empty states: centered text-muted-foreground with action button
- Status badges: "Analyzed" = default, "Transcribed" = secondary, "Recording" = outline
- Feedback rating colors: green (>=7), yellow (>=4), red (<4) using Tailwind text-green-600/text-yellow-600/text-red-600
- ScrollArea: 250px height, rounded-lg border, bg-muted/50 background

### Layout Structure

- Root: full height html/body
- Dashboard: flex row (sidebar | flex-1 col (header | scrollable main with p-4 md:p-6))
- Login: min-h-screen flex items-center justify-center
- Max widths: session forms use max-w-4xl, login uses max-w-md, player dialog uses default dialog width

### Responsive Breakpoints

- Mobile: single column, hamburger sheet nav, sidebar hidden
- md (768px+): sidebar visible, 2-col grids
- lg (1024px+): 4-col stat grid, 2-col dashboard cards
- sm (640px+): 2-col player selection grid

---

## API Routes

### GET /api/transcribe-token
- Auth required
- Calls AssemblyAI `GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=300`
- Returns `{ token: string }`

### GET /api/players
- Auth required
- Returns all players where `coach_id = auth user id`, ordered by created_at desc

### POST /api/players
- Auth required
- Body: `{ name, email?, position?, jersey_number? }`
- Inserts with `coach_id = auth user id`
- Returns created player (201)

### PUT /api/players
- Body: `{ id, name, email?, position?, jersey_number? }`
- Updates where `id = body.id AND coach_id = auth user id`

### DELETE /api/players?id=uuid
- Deletes where `id AND coach_id = auth user id`

### GET /api/sessions
- Auth required
- Returns all sessions with nested `session_players(player_id, players(id, name, position, jersey_number))`
- Filtered by `coach_id = auth user id`

### POST /api/sessions
- Body: `{ title, transcript?, status?, playerIds: string[] }`
- Creates session + session_players join rows

### PUT /api/sessions
- Body: `{ id, transcript?, status?, title? }`
- Updates where `id AND coach_id`

### GET /api/feedback?sessionId=uuid
- Returns all player_feedback rows for that session

### POST /api/feedback
- Body: `{ sessionId, transcript, playerNames: [{id, name}] }`
- Calls Claude API with structured prompt
- Claude returns JSON array of per-player feedback
- Inserts into player_feedback table
- Updates session status to "analyzed"
- Returns `{ feedback: [...] }`

---

## Auth Flow

1. User visits any page -> middleware checks for Supabase session
2. No session -> redirect to `/login`
3. User submits login form -> server action calls `supabase.auth.signInWithPassword()`
4. User submits signup form -> server action calls `supabase.auth.signUp()` then inserts coaches row with `id = user.id`
5. Success -> redirect to `/dashboard`
6. All API routes call `supabase.auth.getUser()` and use `user.id` as coach_id
7. Sign out -> `supabase.auth.signOut()` client-side, redirect to `/login`
8. Already logged in + visits `/login` -> redirect to `/dashboard`

---

## Real-Time Transcription Flow (AssemblyAI)

1. Browser calls `GET /api/transcribe-token` (server-side, uses ASSEMBLYAI_API_KEY)
2. Server returns temporary token (valid 300 seconds, single-use)
3. Browser calls `getUserMedia()` for microphone access
4. Browser creates `AudioContext` (44100 Hz) + `ScriptProcessorNode` (4096 buffer, mono)
5. Browser opens `WebSocket` to `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&speech_model=universal-streaming-english&token=<token>`
6. On `ws.onopen`: connect audio nodes, set `isRecording = true`
7. On each `onaudioprocess`: downsample 44100->16000 Hz, convert float32 to 16-bit PCM, send raw bytes via `ws.send()`
8. Server sends JSON messages:
   - `{ type: "Begin" }` -- session started
   - `{ type: "Turn", transcript: "...", end_of_turn: false }` -- partial (in progress)
   - `{ type: "Turn", transcript: "...", end_of_turn: true }` -- finalized segment
   - `{ type: "Termination" }` -- session ended
9. On stop: send `{ type: "Terminate" }`, close WebSocket, stop audio, stop mic tracks

---

## Claude AI Feedback Prompt

The prompt sent to Claude:

```
You are an expert basketball coaching analyst. Below is a transcript from a basketball training session. The following players were present: {playerList}.

Analyze the transcript and extract specific feedback for EACH player mentioned or discussed. If a player's name is not directly mentioned in the transcript, provide general feedback based on the session content.

Return your response as a JSON array with the following structure for each player:

[
  {
    "playerName": "Player Name",
    "summary": "2-3 sentence summary of the coach's feedback for this player",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["area for improvement 1", "area for improvement 2"],
    "drillsRecommended": ["drill 1", "drill 2"],
    "overallRating": 7
  }
]

overallRating should be 1-10 based on the coach's tone and feedback.

IMPORTANT: Return ONLY the JSON array, no other text.

Transcript:
{transcript}
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

---

## Dependencies

```json
{
  "@anthropic-ai/sdk": "^0.88.0",
  "@base-ui/react": "^1.4.0",
  "@supabase/ssr": "^0.10.2",
  "@supabase/supabase-js": "^2.103.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.8.0",
  "next": "16.2.3",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "shadcn": "^4.2.0",
  "tailwind-merge": "^3.5.0",
  "tw-animate-css": "^1.4.0"
}
```

---

## Future (Not Built Yet)

- Student dashboard: players log in and see their own feedback per session
- Progress tracking: rating trends over time per player
- Supabase Auth for students (separate role)
- RLS policies for student-scoped read-only access to their own feedback
