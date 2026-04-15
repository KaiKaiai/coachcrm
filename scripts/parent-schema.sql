-- ============================================================
-- Parent Dashboard Schema
-- Run this AFTER supabase-schema-v2.sql in your Supabase SQL Editor
-- ============================================================

-- Parents table
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

-- Parent-Player join table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS parent_players (
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (parent_id, player_id)
);

ALTER TABLE parent_players ENABLE ROW LEVEL SECURITY;

-- Parent invites table
CREATE TABLE IF NOT EXISTS parent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  invite_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parent_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies for Parents
-- ============================================================

-- Parents can read their own row
CREATE POLICY "Parents read own row" ON parents
  FOR SELECT USING (user_id = auth.uid());

-- Parents can read their linked players via parent_players
CREATE POLICY "Parents read own links" ON parent_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parents WHERE parents.id = parent_players.parent_id AND parents.user_id = auth.uid()
    )
  );

-- Parents can read their linked players
CREATE POLICY "Parents read linked players" ON players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_players pp
      JOIN parents p ON p.id = pp.parent_id
      WHERE pp.player_id = players.id AND p.user_id = auth.uid()
    )
  );

-- Parents can read training sessions of their linked players
CREATE POLICY "Parents read linked player sessions" ON training_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      JOIN parent_players pp ON pp.player_id = sp.player_id
      JOIN parents p ON p.id = pp.parent_id
      WHERE sp.session_id = training_sessions.id AND p.user_id = auth.uid()
    )
  );

-- Parents can read session_players for their linked players
CREATE POLICY "Parents read linked session players" ON session_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_players pp
      JOIN parents p ON p.id = pp.parent_id
      WHERE pp.player_id = session_players.player_id AND p.user_id = auth.uid()
    )
  );

-- Parents can read feedback for their linked players
CREATE POLICY "Parents read linked player feedback" ON player_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_players pp
      JOIN parents p ON p.id = pp.parent_id
      WHERE pp.player_id = player_feedback.player_id AND p.user_id = auth.uid()
    )
  );

-- Parents can read homework (player_drills) for their linked players
CREATE POLICY "Parents read linked player homework" ON player_drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM parent_players pp
      JOIN parents p ON p.id = pp.parent_id
      WHERE pp.player_id = player_drills.player_id AND p.user_id = auth.uid()
    )
  );

-- Parents can read drills assigned to their linked players
CREATE POLICY "Parents read linked player drills" ON drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_drills pd
      JOIN parent_players pp ON pp.player_id = pd.player_id
      JOIN parents p ON p.id = pp.parent_id
      WHERE pd.drill_id = drills.id AND p.user_id = auth.uid()
    )
  );

-- Parents can read coaches of their linked players
CREATE POLICY "Parents read linked coaches" ON coaches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players pl
      JOIN parent_players pp ON pp.player_id = pl.id
      JOIN parents p ON p.id = pp.parent_id
      WHERE pl.coach_id = coaches.id AND p.user_id = auth.uid()
    )
  );

-- ============================================================
-- RLS Policies for Parent Invites
-- ============================================================

-- Coaches can manage their own invites
CREATE POLICY "Coaches manage own parent invites" ON parent_invites
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Allow anonymous read for invite token validation (needed during signup)
CREATE POLICY "Anyone can validate parent invite token" ON parent_invites
  FOR SELECT USING (true);
