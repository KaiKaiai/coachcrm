# CoachCRM MVP+ -- Basketball Trainer Platform

## Product Overview

CoachCRM is a CRM/LMS platform for basketball trainers (personal training / small-group coaching, not team-based). Trainers manage clients (players), run multiple sessions per day, record sessions with real-time speech-to-text, get AI-generated per-player feedback, manage a drill library, assign homework/drills to players, and schedule sessions via a calendar. Players have their own dashboard to view feedback, complete homework, and see upcoming sessions.

---

## User Roles

### Trainer (Coach)
- Signs up with email/password
- Manages a roster of players (clients)
- Creates and manages a drill library (shooting, dribbling, defense, etc.)
- Schedules sessions on a calendar (multiple per day, select which players attend)
- Records sessions with live speech-to-text (AssemblyAI)
- Generates AI feedback per player (Claude)
- Assigns drills/homework to players (from library or from AI recommendations)
- Views player detail pages with homework status and feedback history

### Player (Client)
- Receives an invite link from their trainer
- Signs up via the invite link (email/password)
- Views their own dashboard: upcoming sessions, recent feedback, homework stats
- Views feedback from past sessions (read-only)
- Views and completes assigned homework/drills
- Adds notes to homework, marks drills as complete

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

## Database Schema

### coaches
- `id` UUID PRIMARY KEY (= auth.uid())
- `name` TEXT NOT NULL
- `email` TEXT UNIQUE NOT NULL
- `created_at` TIMESTAMPTZ DEFAULT now()

### players
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches ON DELETE CASCADE
- `user_id` UUID nullable (links to auth.users when player signs up)
- `invite_token` UUID DEFAULT gen_random_uuid() UNIQUE
- `invite_accepted` BOOLEAN DEFAULT false
- `name` TEXT NOT NULL
- `email` TEXT nullable
- `position` TEXT nullable (Point Guard, Shooting Guard, Small Forward, Power Forward, Center)
- `jersey_number` INT nullable
- `created_at` TIMESTAMPTZ DEFAULT now()

### drills (trainer's drill library)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches ON DELETE CASCADE
- `title` TEXT NOT NULL
- `description` TEXT nullable
- `category` TEXT CHECK (shooting, dribbling, passing, defense, conditioning, footwork, other)
- `difficulty` TEXT CHECK (beginner, intermediate, advanced)
- `estimated_minutes` INT nullable
- `video_url` TEXT nullable
- `sets` INT nullable
- `reps` INT nullable
- `target_metric` TEXT nullable (e.g. "make 50 free throws")
- `created_at` TIMESTAMPTZ DEFAULT now()

### player_drills (assigned homework)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `player_id` UUID FK -> players ON DELETE CASCADE
- `drill_id` UUID FK -> drills ON DELETE CASCADE
- `session_id` UUID FK -> training_sessions nullable (linked to a session or standalone)
- `assigned_at` TIMESTAMPTZ DEFAULT now()
- `due_date` DATE nullable
- `status` TEXT CHECK (assigned, in_progress, completed) DEFAULT 'assigned'
- `notes` TEXT nullable (coach notes)
- `player_notes` TEXT nullable (player's own notes)
- `completed_at` TIMESTAMPTZ nullable

### training_sessions
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches ON DELETE CASCADE
- `title` TEXT NOT NULL
- `date` DATE DEFAULT CURRENT_DATE
- `transcript` TEXT nullable
- `status` TEXT CHECK (recording, transcribed, analyzed) DEFAULT 'recording'
- `created_at` TIMESTAMPTZ DEFAULT now()

### session_players (many-to-many)
- `session_id` UUID FK -> training_sessions ON DELETE CASCADE
- `player_id` UUID FK -> players ON DELETE CASCADE
- PRIMARY KEY (session_id, player_id)

### player_feedback (AI-generated)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `session_id` UUID FK -> training_sessions ON DELETE CASCADE
- `player_id` UUID FK -> players ON DELETE CASCADE
- `summary` TEXT NOT NULL
- `strengths` JSONB DEFAULT '[]'
- `improvements` JSONB DEFAULT '[]'
- `drills_recommended` JSONB DEFAULT '[]'
- `overall_rating` INT CHECK (1-10)
- `raw_ai_response` JSONB nullable
- `created_at` TIMESTAMPTZ DEFAULT now()

### scheduled_sessions (calendar)
- `id` UUID PRIMARY KEY DEFAULT gen_random_uuid()
- `coach_id` UUID FK -> coaches ON DELETE CASCADE
- `title` TEXT NOT NULL
- `description` TEXT nullable
- `scheduled_date` DATE NOT NULL
- `start_time` TIME NOT NULL
- `end_time` TIME NOT NULL
- `location` TEXT nullable
- `status` TEXT CHECK (scheduled, completed, cancelled) DEFAULT 'scheduled'
- `training_session_id` UUID FK -> training_sessions nullable (linked after recording)
- `created_at` TIMESTAMPTZ DEFAULT now()

### scheduled_session_players
- `scheduled_session_id` UUID FK -> scheduled_sessions ON DELETE CASCADE
- `player_id` UUID FK -> players ON DELETE CASCADE
- PRIMARY KEY (scheduled_session_id, player_id)

### Row Level Security
- All tables scoped to `auth.uid()`
- Coach tables: `coach_id = auth.uid()`
- Player tables: player can read their own data via `user_id = auth.uid()`
- player_drills: coach can manage via drill ownership, player can update status on their own assignments
- scheduled_sessions: coach manages, player reads their own

---

## File Structure

```
coach-crm/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                              # Redirect to /dashboard
│   │   ├── globals.css
│   │   ├── login/
│   │   │   ├── page.tsx                          # Coach login/signup
│   │   │   └── actions.ts                        # Server actions
│   │   ├── invite/
│   │   │   └── [token]/
│   │   │       └── page.tsx                      # Player invite acceptance
│   │   ├── dashboard/                            # COACH SIDE
│   │   │   ├── layout.tsx                        # Sidebar + header
│   │   │   ├── page.tsx                          # Overview stats
│   │   │   ├── players/
│   │   │   │   ├── page.tsx                      # Player list + invite links
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                  # Player detail (homework, feedback, schedule)
│   │   │   ├── drills/
│   │   │   │   ├── page.tsx                      # Drill library CRUD
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                  # Drill detail + assignments
│   │   │   ├── sessions/
│   │   │   │   ├── page.tsx                      # Session history
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx                  # New session wizard
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                  # Session detail + feedback + assign drills
│   │   │   └── calendar/
│   │   │       └── page.tsx                      # Week/day calendar view
│   │   ├── player/                               # PLAYER SIDE
│   │   │   ├── layout.tsx                        # Player sidebar + header
│   │   │   ├── login/
│   │   │   │   └── page.tsx                      # Player login
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx                      # Player overview
│   │   │   ├── sessions/
│   │   │   │   ├── page.tsx                      # Player's sessions list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                  # Session feedback (read-only)
│   │   │   └── homework/
│   │   │       ├── page.tsx                      # Homework list
│   │   │       └── [id]/
│   │   │           └── page.tsx                  # Drill detail + update status
│   │   └── api/
│   │       ├── transcribe-token/route.ts
│   │       ├── players/route.ts
│   │       ├── sessions/route.ts
│   │       ├── feedback/route.ts
│   │       ├── drills/
│   │       │   └── route.ts                      # GET/POST drills
│   │       ├── drills/[id]/
│   │       │   └── route.ts                      # GET/PUT/DELETE drill
│   │       ├── player-drills/
│   │       │   └── route.ts                      # GET/POST assignments
│   │       ├── player-drills/[id]/
│   │       │   └── route.ts                      # PUT/DELETE assignment
│   │       ├── calendar/
│   │       │   └── route.ts                      # GET/POST scheduled sessions
│   │       ├── calendar/[id]/
│   │       │   └── route.ts                      # GET/PUT/DELETE scheduled session
│   │       ├── invite/[token]/
│   │       │   └── route.ts                      # GET validate / POST accept
│   │       └── player/
│   │           ├── sessions/route.ts             # Player's own sessions
│   │           ├── feedback/route.ts             # Player's own feedback
│   │           └── homework/
│   │               └── route.ts                  # Player's homework + update
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                       # Coach sidebar
│   │   │   ├── header.tsx                        # Coach header + sign out
│   │   │   ├── mobile-nav.tsx                    # Coach mobile nav
│   │   │   ├── player-sidebar.tsx                # Player sidebar
│   │   │   └── player-header.tsx                 # Player header + sign out
│   │   ├── transcribe-recorder.tsx
│   │   ├── feedback-card.tsx                     # Enhanced with "Assign Drill" buttons
│   │   ├── drill-form.tsx                        # Drill create/edit form
│   │   ├── drill-card.tsx                        # Drill display card
│   │   ├── homework-card.tsx                     # Homework assignment card
│   │   ├── assign-drill-dialog.tsx               # Dialog to assign drill to player
│   │   ├── calendar-view.tsx                     # Week calendar grid component
│   │   ├── schedule-session-dialog.tsx           # Dialog to create scheduled session
│   │   └── ui/                                   # shadcn/ui primitives
│   ├── hooks/
│   │   └── use-transcribe.ts
│   ├── lib/
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   └── supabase/
│   │       ├── client.ts
│   │       ├── server.ts
│   │       └── middleware.ts
│   └── middleware.ts
├── supabase-schema.sql                           # Original schema
├── supabase-schema-v2.sql                        # MVP+ additions
├── V0_PROJECT_SPEC.md                            # Original spec
├── V0_MVP_PLUS_SPEC.md                           # This file
├── .env.local
└── package.json
```

---

## Pages & UI Design

### AUTH PAGES

#### Coach Login (`/login`)
- Centered card, full-screen vertically centered
- Trophy icon + "CoachCRM" branding
- Toggle between Sign In / Sign Up
- Sign Up adds Name field
- Fields: Name (signup only), Email, Password
- Link at bottom: "I'm a player" -> `/player/login`

#### Player Login (`/player/login`)
- Similar centered card layout
- Basketball icon + "CoachCRM Player" branding
- Sign In only (players sign up via invite link)
- Fields: Email, Password
- Link: "I'm a trainer" -> `/login`
- Note text: "Don't have an account? Ask your trainer for an invite link."

#### Invite Page (`/invite/[token]`)
- Centered card
- Shows: "You've been invited by [Coach Name]"
- Player name pre-filled (from the player record)
- Fields: Email, Password
- Submit creates auth account, links to player record
- Redirect to `/player/dashboard`

---

### COACH PAGES

#### Dashboard (`/dashboard`)
- **6 stat cards** in responsive grid:
  - Total Players (Users icon)
  - Training Sessions (ClipboardList icon)
  - Analyzed (Sparkles icon)
  - Drills in Library (Dumbbell icon)
  - Homework Assigned (BookOpen icon)
  - Upcoming Sessions (Calendar icon)
- **3-column grid** below:
  - Today's Schedule: list of scheduled sessions for today with times, player names
  - Recent Sessions: last 5 sessions with status badges
  - Player Homework: players with pending homework count

#### Players (`/dashboard/players`)
- Table with columns: #, Name, Position, Email, Status (invited/active), Actions
- Actions: Edit (pencil), Delete (trash), Copy Invite Link (link icon), View Detail (arrow)
- "Add Player" button opens dialog
- Status badge: "Active" (green) if invite_accepted, "Invited" (yellow) if not, "Pending" (gray) if no invite sent
- Each row links to `/dashboard/players/[id]`

#### Player Detail (`/dashboard/players/[id]`)
- **Header**: Player name, position, jersey number, email, invite status badge
- **Tabs**: Homework | Feedback History | Schedule
- **Homework tab**:
  - Table of assigned drills: title, category badge, status badge, due date, assigned date
  - "Assign Drill" button opens assign-drill-dialog
  - Status: assigned (gray), in_progress (blue), completed (green)
- **Feedback History tab**:
  - List of sessions with feedback cards (same FeedbackCard component)
  - Sorted by date descending
- **Schedule tab**:
  - Upcoming scheduled sessions for this player
  - Past sessions grayed out

#### Drill Library (`/dashboard/drills`)
- Page title "Drill Library" with "Create Drill" button
- Filter bar: category dropdown + difficulty dropdown
- Card grid (3 cols on lg, 2 on md, 1 on sm):
  - Each card shows: title, category badge, difficulty badge, duration, sets/reps if set
  - Click opens drill detail
- "Create Drill" opens dialog with full form

#### Drill Detail (`/dashboard/drills/[id]`)
- Back arrow to drill library
- Card with all drill info: title, description, category, difficulty, duration, video link (clickable), sets, reps, target metric
- **Assigned To** section: list of players this drill is assigned to with status badges
- "Assign to Player" button
- Edit / Delete buttons

#### Drill Form (dialog component)
- Title (required)
- Description (textarea)
- Category (dropdown: Shooting, Dribbling, Passing, Defense, Conditioning, Footwork, Other)
- Difficulty (dropdown: Beginner, Intermediate, Advanced)
- Estimated Minutes (number input)
- Video URL (text input)
- Sets (number input)
- Reps (number input)
- Target Metric (text input, e.g. "make 50 free throws")

#### Sessions List (`/dashboard/sessions`)
- Same as current: table with Title, Date, Players, Status, arrow link
- Enhanced: show time if linked to scheduled session

#### New Session (`/dashboard/sessions/new`)
- Same 3-step wizard: Setup -> Record -> Review
- Enhanced Setup: option to link to a scheduled session (dropdown of today's scheduled sessions)

#### Session Detail (`/dashboard/sessions/[id]`)
- Same as current: transcript card + feedback cards
- **Enhanced feedback cards**: each recommended drill in the feedback card has a "+" button
  - Clicking "+" opens assign-drill-dialog pre-filled with the drill name
  - Can select existing drill from library or create new one
  - Assigns to the specific player

#### Calendar (`/dashboard/calendar`)
- **Week view** by default (Mon-Sun)
- Navigation: prev/next week arrows + "Today" button + week date range display
- Grid: 7 columns (days), rows are time slots
- Each scheduled session shows as a card in the grid: title, time, player count badge
- Click on session opens detail/edit dialog
- "Schedule Session" button opens dialog:
  - Title (required)
  - Date picker
  - Start time + End time
  - Location (optional)
  - Select players (checkbox list)
  - Description (optional)
- Supports multiple sessions per day (stacked in the same column)

---

### PLAYER PAGES

#### Player Dashboard (`/player/dashboard`)
- **Welcome header**: "Welcome back, [Name]"
- **3 stat cards**:
  - Upcoming Sessions (Calendar icon)
  - Homework Pending (BookOpen icon)
  - Sessions Completed (CheckCircle icon)
- **2-column grid**:
  - Upcoming Sessions card: next 3 scheduled sessions with date, time, location
  - Recent Feedback card: latest 3 session feedback summaries with rating badge
- Homework summary: X assigned, Y in progress, Z completed

#### Player Sessions (`/player/sessions`)
- List of sessions the player participated in
- Each row: title, date, status badge (if feedback available)
- Click opens session feedback view

#### Player Session Detail (`/player/sessions/[id]`)
- Read-only view of their FeedbackCard for that session
- Shows: summary, strengths badges, improvements badges, recommended drills, rating
- Transcript NOT shown (coach-only)

#### Player Homework (`/player/homework`)
- Filter tabs: All | Assigned | In Progress | Completed
- Card list of assigned drills:
  - Title, category badge, difficulty badge, due date
  - Status badge with action: "Start" (assigned->in_progress), "Complete" (in_progress->completed)
  - Coach notes shown if present
- Click opens drill detail

#### Player Homework Detail (`/player/homework/[id]`)
- Full drill info: title, description, category, difficulty, duration, video (embedded or link), sets, reps, target metric
- Coach notes card
- Player notes textarea (editable)
- Status update buttons: Mark as In Progress / Mark as Complete
- Completed timestamp shown when done

---

### NAVIGATION

#### Coach Sidebar
- Trophy + "CoachCRM" brand
- Nav items with icons:
  - Dashboard (LayoutDashboard)
  - Players (Users)
  - Drills (Dumbbell)
  - Sessions (ClipboardList)
  - Calendar (CalendarDays)
  - New Session (PlusCircle)

#### Player Sidebar
- Basketball + "CoachCRM" brand
- Nav items:
  - Dashboard (LayoutDashboard)
  - My Sessions (ClipboardList)
  - Homework (BookOpen)

---

## Design System

### Colors (oklch, same as current)
- Background: pure white `oklch(1 0 0)`
- Primary: near-black `oklch(0.205 0 0)`
- Destructive: red `oklch(0.577 0.245 27.325)`
- Dark mode fully supported

### Status Badge Colors
- **Session**: analyzed=default, transcribed=secondary, recording=outline
- **Homework**: assigned=outline(gray), in_progress=secondary(blue tint), completed=default(green tint)
- **Player invite**: active=green, invited=yellow, pending=gray
- **Scheduled session**: scheduled=secondary, completed=default, cancelled=destructive
- **Drill category**: each category gets a distinct badge color
- **Difficulty**: beginner=green, intermediate=yellow, advanced=red
- **Feedback rating**: >=7 green, >=4 yellow, <4 red

### Component Patterns
- Cards with CardHeader + CardContent throughout
- Dialogs for create/edit forms
- Tables for list views (players, sessions, drills assignments)
- Card grids for drill library
- Tabs for player detail page
- Filter dropdowns for drill library
- Checkbox lists for player selection
- ScrollArea for transcripts and long lists
- Badge variants: default, secondary, outline, destructive
- Loading: Loader2 with animate-spin
- Empty states: icon + text + action button

### Layout
- Coach: sidebar (64px) | main (flex-1 with header)
- Player: sidebar (64px) | main (flex-1 with header)
- Login/Invite: centered card (max-w-md)
- Calendar: full-width grid
- Responsive: mobile sheet nav, single column on small screens

---

## Auth Flow

### Coach
1. Visit any `/dashboard/*` -> middleware checks session -> redirect to `/login` if none
2. Sign up -> create auth user + coaches row
3. Sign in -> redirect to `/dashboard`

### Player
1. Coach adds player (name, email, position) -> `invite_token` auto-generated
2. Coach copies invite link `/invite/{token}` and sends to player
3. Player opens link -> sees signup form with name pre-filled
4. Player submits -> creates auth user, sets `player.user_id`, `invite_accepted=true`
5. Redirected to `/player/dashboard`
6. Subsequent logins: player visits `/player/login`, signs in with email/password
7. All `/player/*` routes protected by middleware (checks player has `user_id` linked)

### Middleware Rules
- `/dashboard/*` -> requires auth, must have a coaches row
- `/player/*` (except `/player/login`) -> requires auth, must have a players row with matching `user_id`
- `/login`, `/player/login`, `/invite/*` -> public
- Already authenticated coach visiting `/login` -> redirect to `/dashboard`
- Already authenticated player visiting `/player/login` -> redirect to `/player/dashboard`

---

## API Routes

### Coach APIs (require coach auth)

| Method | Route | Description |
|---|---|---|
| GET | /api/players | List coach's players |
| POST | /api/players | Create player |
| PUT | /api/players | Update player |
| DELETE | /api/players?id=uuid | Delete player |
| GET | /api/sessions | List sessions with players |
| POST | /api/sessions | Create session |
| PUT | /api/sessions | Update session |
| GET | /api/feedback?sessionId=uuid | Get feedback for session |
| POST | /api/feedback | Generate AI feedback |
| GET | /api/transcribe-token | Get AssemblyAI temp token |
| GET | /api/drills | List drill library |
| POST | /api/drills | Create drill |
| GET | /api/drills/[id] | Get drill detail |
| PUT | /api/drills/[id] | Update drill |
| DELETE | /api/drills/[id] | Delete drill |
| GET | /api/player-drills | List assignments (filter by player_id, drill_id) |
| POST | /api/player-drills | Assign drill to player |
| PUT | /api/player-drills/[id] | Update assignment |
| DELETE | /api/player-drills/[id] | Remove assignment |
| GET | /api/calendar | List scheduled sessions (filter by date range) |
| POST | /api/calendar | Create scheduled session |
| GET | /api/calendar/[id] | Get scheduled session detail |
| PUT | /api/calendar/[id] | Update scheduled session |
| DELETE | /api/calendar/[id] | Delete scheduled session |

### Invite API (public)

| Method | Route | Description |
|---|---|---|
| GET | /api/invite/[token] | Validate token, return player name + coach name |
| POST | /api/invite/[token] | Accept invite: create auth user, link to player |

### Player APIs (require player auth)

| Method | Route | Description |
|---|---|---|
| GET | /api/player/sessions | Player's own sessions with feedback |
| GET | /api/player/feedback?sessionId=uuid | Player's own feedback for a session |
| GET | /api/player/homework | Player's assigned drills |
| PUT | /api/player/homework | Update homework status/notes |

---

## Key Flows

### Drill Assignment Flow
1. Coach goes to Drill Library, creates drills with full details
2. Coach can assign drills from: drill detail page, player detail page, or feedback card quick-assign
3. Assignment includes: player, drill, optional due date, optional coach notes, optional link to session
4. Player sees assignment in Homework tab
5. Player can: mark as in_progress, add notes, mark as complete
6. Coach sees status updates on player detail page

### Calendar Flow
1. Coach goes to Calendar page, sees week view
2. Coach clicks "Schedule Session" to create: title, date, start/end time, players, location
3. Session appears on calendar grid
4. Players see upcoming sessions on their dashboard
5. When coach records a session, they can optionally link it to a scheduled session
6. After recording, scheduled session status -> completed

### AI Feedback + Drill Assignment
1. Coach records session -> transcript saved
2. Coach clicks "Generate AI Feedback" -> Claude analyzes, returns per-player feedback
3. Each feedback card shows recommended drills with "+" assign buttons
4. Coach clicks "+" -> assign-drill dialog opens
5. Coach picks existing drill from library OR creates new one on the spot
6. Drill assigned to that player, linked to the session

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
