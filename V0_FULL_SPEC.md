# CoachCRM -- Full Platform Spec for v0

A basketball trainer platform for managing clients, recording training sessions with real-time speech-to-text, generating AI-powered per-player feedback, assigning drills/homework, and scheduling sessions. Two user roles: Trainer (coach) and Player (client).

---

## Tech Stack

- Next.js 16 (App Router) / TypeScript / Tailwind CSS v4 / shadcn/ui (base-ui primitives)
- Supabase (PostgreSQL + Auth + RLS)
- AssemblyAI Streaming API v3 (real-time speech-to-text over WebSocket)
- Anthropic Claude API (AI feedback generation)
- Lucide React icons / Geist fonts

---

## MVP: Session Recording + AI Feedback

### User Journey 1: Record a Training Session

**Actor:** Trainer

**Steps:**
1. Trainer logs in at `/login` (email + password via Supabase Auth)
2. Navigates to "New Session" from sidebar
3. Enters session title (e.g. "Tuesday Shooting Drill")
4. Selects participating players from checkbox grid (fetched from `/api/players`)
5. Clicks "Continue to Recording"
6. Clicks "Start Recording" -- microphone permission requested
7. Speaks during the training session -- transcript appears in real-time
8. Clicks "Stop Recording" -- full transcript available
9. Reviews/edits transcript in a textarea
10. Clicks "Save Session" -- redirected to session detail page

**Frontend Pages:**

`/dashboard/sessions/new` -- 3-step wizard:

- **Step 1 (Setup):** Card with title input + player selection grid (checkboxes, 2-col on sm+). Each player shows jersey number, name, position. "Continue to Recording" button disabled until title entered.
- **Step 2 (Record):** TranscribeRecorder component (see below). Back button + conditional "Skip to Review".
- **Step 3 (Review):** Card showing session title + player badges + editable textarea (mono font, 12 rows). "Save Session" button with loading spinner.

`TranscribeRecorder` component:
- Card with "Live Transcription" header (Mic icon)
- Controls: Start Recording (Mic icon, default button) / Stop Recording (Square icon, destructive) / Recording badge (red pulse) / Copy button
- ScrollArea (250px height) showing:
  - Idle: italic placeholder text
  - Recording: "Listening..." pulsing text
  - Finalized segments in normal text + current partial in italic muted
- Segment count footer

**Backend Flow:**

```
Browser                        Server                          External
  |                              |                               |
  |-- GET /api/transcribe-token ->|                               |
  |                              |-- GET /v3/token ------------->| AssemblyAI
  |                              |<-- { token } ----------------| 
  |<-- { token } ----------------|                               |
  |                              |                               |
  |== WebSocket: wss://streaming.assemblyai.com/v3/ws ==========>| AssemblyAI
  |   ?sample_rate=16000                                         |
  |   &speech_model=universal-streaming-english                  |
  |   &token=<temp_token>                                        |
  |                              |                               |
  |-- [audio PCM bytes] ---------------------------------------->|
  |<-- { type: "Turn", transcript: "...", end_of_turn: false } --|
  |<-- { type: "Turn", transcript: "...", end_of_turn: true } ---|
  |                              |                               |
  |-- POST /api/sessions ------->|                               |
  |                              |-- INSERT training_sessions -->| Supabase
  |                              |-- INSERT session_players ---->| Supabase
  |<-- { id, title, ... } ------|                               |
```

**Audio Pipeline (browser-side, `use-transcribe.ts` hook):**
1. `fetch("/api/transcribe-token")` -- gets temporary AssemblyAI token (300s, single-use)
2. `navigator.mediaDevices.getUserMedia({ audio: ... })` -- get microphone
3. `new AudioContext({ sampleRate: 44100 })` -- create audio context
4. `createMediaStreamSource()` + `createScriptProcessor(4096, 1, 1)` -- process audio
5. `new WebSocket(wss://streaming.assemblyai.com/v3/ws?...)` -- connect
6. On `onaudioprocess`: downsample 44100->16000 Hz, convert float32 to 16-bit PCM little-endian, `ws.send(pcmBuffer)`
7. On `ws.onmessage`: parse JSON, update state for partial/final transcripts
8. On stop: `ws.send(JSON.stringify({ type: "Terminate" }))`, close WebSocket, stop audio

**API Routes:**

`GET /api/transcribe-token`
- Auth: requires coach login
- Calls `GET https://streaming.assemblyai.com/v3/token?expires_in_seconds=300` with `Authorization: ASSEMBLYAI_API_KEY`
- Returns `{ token: string }`

`POST /api/sessions`
- Auth: requires coach login, uses `auth.getUser().id` as `coach_id`
- Body: `{ title, transcript, status: "transcribed", playerIds: string[] }`
- Inserts into `training_sessions` then `session_players` join table
- Returns created session

`GET /api/sessions`
- Returns all sessions for coach with nested `session_players(player_id, players(id, name, position, jersey_number))`

**Supabase Tables:**

```sql
training_sessions: id, coach_id, title, date, transcript, status, created_at
session_players: session_id, player_id (composite PK)
```

---

### User Journey 2: Generate AI Feedback

**Actor:** Trainer

**Steps:**
1. Opens a saved session at `/dashboard/sessions/[id]`
2. Sees transcript in a scrollable card
3. Sees player badges showing who was in the session
4. Clicks "Generate AI Feedback" button
5. Loading state: spinner + "Analyzing transcript with AI..."
6. Feedback cards appear in a 2-col grid, one per player
7. Each card shows: name, rating (X/10 with star, color-coded), summary, strengths badges, improvements badges, recommended drills with "+" assign buttons

**Frontend Page:**

`/dashboard/sessions/[id]`:
- Back arrow to sessions list
- Title + status badge (analyzed/transcribed/recording) + date + player count
- Player badges row
- Transcript card with ScrollArea (250px)
- Separator
- "Player Feedback" section header with "Generate AI Feedback" button
- Feedback cards in `grid gap-4 md:grid-cols-2`

`FeedbackCard` component:
- Card header: player name + position, Star icon + rating/10 (green >=7, yellow >=4, red <4)
- Summary paragraph
- Separator
- Strengths: ThumbsUp icon (green) + secondary badges
- Areas to Improve: TrendingUp icon (yellow) + outline badges
- Recommended Drills: Dumbbell icon (blue) + list with "+" assign buttons per drill
  - Each drill shows: title, category, sets/reps, duration (from structured AI response)
  - "+" opens AssignDrillDialog

**Backend Flow:**

```
Browser                        Server                          External
  |                              |                               |
  |-- POST /api/feedback ------->|                               |
  |   { sessionId,               |                               |
  |     transcript,              |                               |
  |     playerNames: [{id,name}] |                               |
  |   }                          |                               |
  |                              |-- messages.create() --------->| Claude API
  |                              |   model: claude-sonnet-4-20250514  |
  |                              |   prompt: see below            |
  |                              |<-- JSON array of feedback ----|
  |                              |                               |
  |                              |-- INSERT player_feedback ---->| Supabase
  |                              |   (one row per player)        |
  |                              |-- UPDATE training_sessions -->| Supabase
  |                              |   status = "analyzed"         |
  |                              |                               |
  |<-- { feedback: [...] } ------|                               |
```

**Claude Prompt:**

```
You are an expert basketball coaching analyst. Below is a transcript from a
basketball training session. The following players were present: {playerList}.

Analyze the transcript and extract specific feedback for EACH player.

Return JSON array:
[
  {
    "playerName": "Player Name",
    "summary": "2-3 sentence summary",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["improvement 1", "improvement 2"],
    "drillsRecommended": [
      {
        "title": "Free Throw Practice",
        "description": "Practice free throws focusing on form",
        "category": "shooting",          // shooting|dribbling|passing|defense|conditioning|footwork|other
        "difficulty": "intermediate",    // beginner|intermediate|advanced
        "sets": 5,
        "reps": 10,
        "estimated_minutes": 15,
        "target_metric": "make 40 out of 50"
      }
    ],
    "overallRating": 7                   // 1-10
  }
]

Return ONLY the JSON array.
```

**Supabase Tables:**

```sql
player_feedback: id, session_id, player_id, summary, strengths (JSONB), improvements (JSONB),
                 drills_recommended (JSONB), overall_rating, raw_ai_response (JSONB), created_at
```

---

## MVP+: Drill Library + Homework Assignment

### User Journey 3: Manage Drill Library

**Actor:** Trainer

**Steps:**
1. Opens "Drills" from sidebar -> `/dashboard/drills`
2. Sees card grid of existing drills with category/difficulty badges
3. Can filter by category dropdown + difficulty dropdown
4. Clicks "Create Drill" -> dialog opens with full form
5. Fills in: title, description, category, difficulty, sets, reps, minutes, target metric, video URL
6. Saves -> drill appears in the grid
7. Clicks a drill card -> `/dashboard/drills/[id]` detail page
8. Can edit, delete, or see which players it's assigned to

**Frontend Pages:**

`/dashboard/drills`:
- Title + "Create Drill" button opening dialog
- Filter bar: category Select + difficulty Select
- Card grid (3-col lg, 2-col md, 1-col sm)
- Each card: title, description (line-clamp-2), category badge, difficulty badge (color-coded: green/yellow/red), duration, sets/reps, target metric

`/dashboard/drills/[id]`:
- Back arrow, title, category + difficulty badges
- Drill Details card: description, duration, sets, reps, target metric, video link
- "Assigned To" card: list of players with status badges + "Assign to Player" button

`DrillForm` component (used in create + edit dialogs):
- Title (required), Description (textarea), Category (select), Difficulty (select)
- Sets / Reps / Minutes (3-col number inputs)
- Target Metric (text), Video URL (text)

**API Routes:**

`GET /api/drills` -- list coach's drills, optional `?category=&difficulty=` filters
`POST /api/drills` -- create drill with all fields
`GET /api/drills/[id]` -- get single drill
`PUT /api/drills/[id]` -- update drill
`DELETE /api/drills/[id]` -- delete drill

**Supabase Table:**

```sql
drills: id, coach_id, title, description, category, difficulty, estimated_minutes,
        video_url, sets, reps, target_metric, created_at
```

---

### User Journey 4: Assign Drills from AI Feedback

**Actor:** Trainer

**Steps:**
1. On session detail page, after AI feedback is generated
2. Each feedback card shows recommended drills with "+" buttons
3. Clicks "+" on a recommended drill
4. AssignDrillDialog opens with "Create New" tab active
5. Form is **pre-filled with AI values**: title, description, category, difficulty, sets, reps, minutes, target metric
6. Trainer reviews, optionally adjusts values
7. Sets due date and coach notes (optional)
8. Clicks "Create & Assign" -> drill created in library AND assigned to the player
9. Alternative: switch to "From Library" tab to select an existing drill

**Frontend Component:**

`AssignDrillDialog`:
- Dialog with two tabs: "Create New" (PlusCircle icon) | "From Library" (Library icon)
- Player select (if not pre-set via prop)
- **Create New tab**: full drill form (title, description, category select, difficulty select, sets, reps, minutes, target metric, video URL) -- all pre-filled from AI `RecommendedDrill` object
- **From Library tab**: drill select dropdown
- Due Date (date input) + Coach Notes (text input) -- shared across tabs
- "Create & Assign" / "Assign" button

**Backend Flow (Create & Assign):**
1. `POST /api/drills` -- create the drill in library
2. `POST /api/player-drills` -- assign it to the player with session link

**API Routes:**

`POST /api/player-drills` -- body: `{ player_id, drill_id, session_id?, due_date?, notes? }`
`GET /api/player-drills` -- list assignments, optional `?playerId=&drillId=` filters
`PUT /api/player-drills/[id]` -- update status/notes/due_date
`DELETE /api/player-drills/[id]` -- remove assignment

**Supabase Table:**

```sql
player_drills: id, player_id, drill_id, session_id, assigned_at, due_date,
               status (assigned|in_progress|completed), notes, player_notes, completed_at
```

---

### User Journey 5: View Player Drill Assignments

**Actor:** Trainer

**Steps:**
1. Opens "Players" from sidebar -> `/dashboard/players`
2. Sees table with columns: #, Name, Position, Drills (count with expand arrow), Status, Actions
3. Clicks drill count -> expands inline to show all assigned drills with title, category, difficulty, sets/reps, due date, status badge
4. Clicks arrow on player row -> `/dashboard/players/[id]` detail page
5. Detail page has 3 tabs: Homework | Feedback History | Schedule
6. Homework tab: list of assigned drills with "Assign Drill" button

**Frontend Pages:**

`/dashboard/players`:
- Table with expandable drill rows per player
- Drill count column: "3 (1 done, 2 pending) ▼" -- clickable to expand
- Expanded section: bg-muted/30 area with drill cards showing title, category badge, difficulty, sets/reps, due date, status badge
- Actions column: copy invite link, edit, delete, view detail (arrow)

`/dashboard/players/[id]`:
- Header: player name, jersey number, position badge, invite status badge
- Tabs component:
  - Homework: list of assigned drills with "Assign Drill" button
  - Feedback History: grid of FeedbackCards from all sessions
  - Schedule: list of upcoming/past scheduled sessions

---

## MVP++: Calendar + Client Onboarding

### User Journey 6: Schedule Training Sessions

**Actor:** Trainer

**Steps:**
1. Opens "Calendar" from sidebar -> `/dashboard/calendar`
2. Sees week view (Mon-Sun) with prev/next/today navigation
3. Each day column shows scheduled sessions as cards (title, time, player count)
4. Clicks "+" on a day cell or "Schedule Session" button
5. Dialog opens: title, date (pre-filled if clicked on a day), start time, end time, location, description, player selection (checkboxes)
6. Submits -> session appears on calendar
7. Supports multiple sessions per day (stacked in same column)

**Frontend Page:**

`/dashboard/calendar`:
- Header: title + "Schedule Session" button
- Navigation bar: prev arrow, "Today" button, next arrow, week date range text
- 7-column grid (Mon-Sun):
  - Day header: day name + date number, "+" button
  - Today column: highlighted border + tinted background
  - Session cards: title, time (Clock icon), player count (Users icon)
- Schedule dialog: title, date/start/end (3-col), location, description textarea, player checkbox grid (2-col, scrollable 150px)

**API Routes:**

`GET /api/calendar` -- list scheduled sessions, `?startDate=&endDate=` filters, includes nested `scheduled_session_players(player_id, players(...))`
`POST /api/calendar` -- body: `{ title, scheduled_date, start_time, end_time, description?, location?, playerIds[] }`
`PUT /api/calendar/[id]` -- update fields including status and training_session_id link
`DELETE /api/calendar/[id]` -- delete

**Supabase Tables:**

```sql
scheduled_sessions: id, coach_id, title, description, scheduled_date, start_time, end_time,
                    location, status (scheduled|completed|cancelled), training_session_id, created_at
scheduled_session_players: scheduled_session_id, player_id (composite PK)
```

---

### User Journey 7: Onboard a Player (Invite Link)

**Actor:** Trainer, then Player

**Trainer Steps:**
1. Opens Players page, clicks "Add Player", fills name + position + jersey number
2. Player appears in table with "Invited" status badge
3. Clicks link icon on the player row -> invite URL copied to clipboard (`/invite/{token}`)
4. Sends the link to the player via text/email

**Player Steps:**
5. Opens invite link -> `/invite/[token]`
6. Sees "You've been invited by [Coach Name]" card with their name pre-filled
7. Enters email + password, clicks "Create Account"
8. Redirected to `/player/login` to sign in
9. Logs in -> redirected to `/player/dashboard`

**Frontend Pages:**

`/invite/[token]`:
- Centered card with Trophy icon
- "You've been invited by {coachName}" subtitle
- Player name displayed in a muted box
- Email + Password inputs
- "Create Account" button
- Handles: invalid token (error), already accepted (link to player login)

`/player/login`:
- Centered card, "Player Login" title
- Email + Password inputs, "Sign In" button
- "Don't have an account? Ask your trainer for an invite link."
- "I'm a trainer" link to `/login`

**Backend Flow:**

```
GET /api/invite/[token]
  -> looks up player by invite_token
  -> returns { playerName, coachName, playerId }
  -> 404 if invalid, 400 if already accepted

POST /api/invite/[token]
  -> body: { email, password }
  -> supabase.auth.signUp({ email, password })
  -> UPDATE players SET user_id = auth_user.id, email, invite_accepted = true
  -> returns { success: true }
```

**Supabase Columns (on players table):**

```sql
ALTER TABLE players ADD COLUMN user_id UUID UNIQUE;
ALTER TABLE players ADD COLUMN invite_token UUID DEFAULT gen_random_uuid() UNIQUE;
ALTER TABLE players ADD COLUMN invite_accepted BOOLEAN DEFAULT false;
```

---

### User Journey 8: Player Views Feedback

**Actor:** Player

**Steps:**
1. Logs in at `/player/login`
2. Dashboard shows: stat cards (sessions, pending homework, completed), recent feedback list, pending homework list
3. Clicks "My Sessions" -> list of training sessions they participated in
4. Clicks a session -> sees their own feedback card (read-only): rating, summary, strengths, improvements, recommended drills
5. Transcript is NOT shown (coach-only)

**Frontend Pages:**

`/player/dashboard`:
- 3 stat cards: Sessions (ClipboardList), Homework Pending (BookOpen), Completed (CheckCircle)
- 2-col grid: Recent Feedback card (ratings, summaries), Homework card (pending drills with links)

`/player/sessions`:
- List of sessions: title, date, status badge, arrow link

`/player/sessions/[id]`:
- Read-only feedback card: rating with star, summary, strengths badges, improvements badges, recommended drills list

**API Routes (player-scoped):**

`GET /api/player/sessions` -- player's sessions via session_players join
`GET /api/player/feedback?sessionId=uuid` -- player's own feedback

---

### User Journey 9: Player Completes Homework

**Actor:** Player

**Steps:**
1. Opens "Homework" from sidebar -> `/player/homework`
2. Sees drill list with filter tabs: All / Assigned / In Progress / Completed
3. Each drill shows: title, category badge, duration, due date, status badge
4. Clicks a drill -> `/player/homework/[id]`
5. Sees full drill details: description, sets/reps, target metric, video link, coach notes
6. Adds their own notes in a textarea
7. Clicks "Mark as In Progress" or "Mark as Complete"
8. Completed drills show completion timestamp

**Frontend Pages:**

`/player/homework`:
- Tabs: All (count) | Assigned (count) | In Progress (count) | Completed (count)
- Drill cards: title, category badge, duration, due date, status badge, arrow link

`/player/homework/[id]`:
- Back arrow, title, category + difficulty + status badges
- Drill Details card: description, sets, reps, duration, target metric, video link
- Coach Notes card (read-only)
- Your Notes card: editable textarea + "Save Notes" button
- Status action buttons: "Mark as In Progress" / "Mark as Complete"
- Completed timestamp

**API Routes:**

`GET /api/player/homework` -- player's assigned drills with drill details
`PUT /api/player/homework` -- body: `{ id, status?, player_notes? }`, auto-sets completed_at

---

## Navigation Structure

### Trainer Sidebar

| Item | Icon | Route |
|------|------|-------|
| Dashboard | LayoutDashboard | /dashboard |
| Players | Users | /dashboard/players |
| Drills | Dumbbell | /dashboard/drills |
| Sessions | ClipboardList | /dashboard/sessions |
| Calendar | CalendarDays | /dashboard/calendar |
| New Session | PlusCircle | /dashboard/sessions/new |

### Player Sidebar

| Item | Icon | Route |
|------|------|-------|
| Dashboard | LayoutDashboard | /player/dashboard |
| My Sessions | ClipboardList | /player/sessions |
| Homework | BookOpen | /player/homework |

---

## Auth & Middleware

- `/dashboard/*` -- requires Supabase Auth session (coach)
- `/player/*` (except `/player/login`) -- requires Supabase Auth session (player)
- `/login`, `/player/login`, `/invite/*` -- public
- Middleware refreshes auth session on every request via `supabase.auth.getUser()`
- Coach sign-out: `supabase.auth.signOut()` -> redirect to `/login`
- Player sign-out: `supabase.auth.signOut()` -> redirect to `/player/login`

---

## Database Schema Summary

```sql
-- Core
coaches(id PK, name, email, created_at)
players(id PK, coach_id FK, user_id, invite_token, invite_accepted, name, email, position, jersey_number, created_at)

-- Sessions
training_sessions(id PK, coach_id FK, title, date, transcript, status, created_at)
session_players(session_id FK, player_id FK, composite PK)

-- Feedback
player_feedback(id PK, session_id FK, player_id FK, summary, strengths JSONB, improvements JSONB, drills_recommended JSONB, overall_rating, raw_ai_response JSONB, created_at)

-- Drills
drills(id PK, coach_id FK, title, description, category, difficulty, estimated_minutes, video_url, sets, reps, target_metric, created_at)
player_drills(id PK, player_id FK, drill_id FK, session_id FK nullable, assigned_at, due_date, status, notes, player_notes, completed_at)

-- Calendar
scheduled_sessions(id PK, coach_id FK, title, description, scheduled_date, start_time, end_time, location, status, training_session_id FK nullable, created_at)
scheduled_session_players(scheduled_session_id FK, player_id FK, composite PK)
```

All tables have RLS enabled. Coach tables scoped to `coach_id = auth.uid()`. Player tables scoped via `user_id = auth.uid()` or through join tables. Join tables routed through `players.coach_id` to avoid RLS recursion.

---

## Design System

- **Colors:** oklch-based, light mode default, dark mode supported. Primary: near-black. Destructive: red. Background: white. Cards: white.
- **Status badges:** analyzed=default, transcribed=secondary, recording=outline, completed=green, in_progress=blue, assigned=gray, active=green, invited=yellow
- **Rating colors:** >=7 green, >=4 yellow, <4 red
- **Difficulty colors:** beginner=green, intermediate=yellow, advanced=red
- **Layout:** sidebar (64px) + main content (header + scrollable body with p-4 md:p-6)
- **Components:** Cards for everything, Dialogs for forms, Tables for lists, Tabs for detail pages, Badges for status/categories, ScrollArea for transcripts, Checkboxes for player selection
- **Typography:** Geist Sans (headings: text-2xl font-bold tracking-tight, body: text-sm, muted: text-muted-foreground)
- **Spacing:** space-y-6 between sections, space-y-4 within cards, gap-4 for grids
- **Responsive:** mobile sheet nav, single column on small screens, 2-col md, 3-col lg for drill grids, 4-col lg for stat cards

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-key
ASSEMBLYAI_API_KEY=your-assemblyai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```
