-- ============================================================
-- Basketball Coach CRM - Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Make sure you have DISABLED email confirmation in:
--   Authentication > Providers > Email > Confirm email = OFF
-- ============================================================

-- Coaches table (id comes from auth.users, not auto-generated)
CREATE TABLE coaches (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  position TEXT,
  jersey_number INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Training sessions table
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  transcript TEXT,
  status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'transcribed', 'analyzed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

-- Session-Players join table (many-to-many)
CREATE TABLE session_players (
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, player_id)
);

ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;

-- AI-generated per-player feedback
CREATE TABLE player_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  drills_recommended JSONB DEFAULT '[]'::jsonb,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 10),
  raw_ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE player_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies - scoped to authenticated user
-- ============================================================

-- Coaches: users can only read/write their own row
CREATE POLICY "Users manage own coach row" ON coaches
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Players: coaches see only their own players
CREATE POLICY "Coaches manage own players" ON players
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Training sessions: coaches see only their own sessions
CREATE POLICY "Coaches manage own sessions" ON training_sessions
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Session players: accessible if the player belongs to the coach
CREATE POLICY "Coaches manage own session players" ON session_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = session_players.player_id
        AND players.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = session_players.player_id
        AND players.coach_id = auth.uid()
    )
  );

-- Player feedback: accessible if the session belongs to the coach
CREATE POLICY "Coaches manage own feedback" ON player_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = player_feedback.session_id
        AND training_sessions.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM training_sessions
      WHERE training_sessions.id = player_feedback.session_id
        AND training_sessions.coach_id = auth.uid()
    )
  );
