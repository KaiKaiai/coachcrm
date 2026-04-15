-- ============================================================
-- Basketball Coach CRM - MVP+ Schema Additions
-- Run this AFTER supabase-schema.sql in your Supabase SQL Editor
-- ============================================================

-- Add invite and player auth columns to players
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_accepted BOOLEAN DEFAULT false;

-- Drill library
CREATE TABLE drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('shooting', 'dribbling', 'passing', 'defense', 'conditioning', 'footwork', 'other')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_minutes INT,
  video_url TEXT,
  sets INT,
  reps INT,
  target_metric TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- Assigned homework
CREATE TABLE player_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  due_date DATE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  notes TEXT,
  player_notes TEXT,
  completed_at TIMESTAMPTZ
);

ALTER TABLE player_drills ENABLE ROW LEVEL SECURITY;

-- Scheduled sessions (calendar)
CREATE TABLE scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  training_session_id UUID REFERENCES training_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;

-- Scheduled session players
CREATE TABLE scheduled_session_players (
  scheduled_session_id UUID REFERENCES scheduled_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (scheduled_session_id, player_id)
);

ALTER TABLE scheduled_session_players ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- Drills: coach manages own
CREATE POLICY "Coaches manage own drills" ON drills
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Player drills: coach manages via player ownership (avoids drills<->player_drills RLS cycle)
CREATE POLICY "Coaches manage drill assignments" ON player_drills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_drills.player_id AND players.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_drills.player_id AND players.coach_id = auth.uid()
    )
  );

CREATE POLICY "Players read own homework" ON player_drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_drills.player_id AND players.user_id = auth.uid()
    )
  );

CREATE POLICY "Players update own homework" ON player_drills
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_drills.player_id AND players.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_drills.player_id AND players.user_id = auth.uid()
    )
  );

-- Scheduled sessions: coach manages
CREATE POLICY "Coaches manage own scheduled sessions" ON scheduled_sessions
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Players can read scheduled sessions they are in
CREATE POLICY "Players read own scheduled sessions" ON scheduled_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_session_players ssp
      JOIN players p ON p.id = ssp.player_id
      WHERE ssp.scheduled_session_id = scheduled_sessions.id AND p.user_id = auth.uid()
    )
  );

-- Scheduled session players: coach manages via player ownership (avoids cycle)
CREATE POLICY "Coaches manage scheduled session players" ON scheduled_session_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = scheduled_session_players.player_id
        AND players.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = scheduled_session_players.player_id
        AND players.coach_id = auth.uid()
    )
  );

CREATE POLICY "Players read own scheduled session players" ON scheduled_session_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = scheduled_session_players.player_id AND players.user_id = auth.uid()
    )
  );

-- Players can read own data
CREATE POLICY "Players read own player row" ON players
  FOR SELECT USING (user_id = auth.uid());

-- Players can read drills assigned to them
CREATE POLICY "Players read assigned drills" ON drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_drills pd
      JOIN players p ON p.id = pd.player_id
      WHERE pd.drill_id = drills.id AND p.user_id = auth.uid()
    )
  );

-- Players can read own feedback
CREATE POLICY "Players read own feedback" ON player_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = player_feedback.player_id AND players.user_id = auth.uid()
    )
  );

-- Players can read own session links
CREATE POLICY "Players read own sessions" ON training_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      JOIN players p ON p.id = sp.player_id
      WHERE sp.session_id = training_sessions.id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Players read own session players" ON session_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players WHERE players.id = session_players.player_id AND players.user_id = auth.uid()
    )
  );
