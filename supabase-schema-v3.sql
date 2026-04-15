-- ============================================================
-- Basketball Coach CRM - Parent Dashboard Schema (v3)
-- Run this AFTER supabase-schema.sql and supabase-schema-v2.sql
-- ============================================================

CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

CREATE TABLE parent_players (
  parent_id UUID REFERENCES parents(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, player_id)
);

ALTER TABLE parent_players ENABLE ROW LEVEL SECURITY;

CREATE TABLE parent_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
  accepted BOOLEAN DEFAULT false,
  accepted_by UUID REFERENCES parents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE parent_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper functions (SECURITY DEFINER bypasses RLS to avoid recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION is_coach_of_player(player_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM players WHERE id = player_uuid AND coach_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_parent_of_player(player_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_players pp JOIN parents p ON p.id = pp.parent_id
    WHERE pp.player_id = player_uuid AND p.user_id = auth.uid()
  );
$$;

-- ============================================================
-- RLS Policies
-- ============================================================

CREATE POLICY "Parents manage own row" ON parents
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Parents read own children links" ON parent_players
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM parents WHERE parents.id = parent_players.parent_id AND parents.user_id = auth.uid())
  );

CREATE POLICY "Coaches manage parent player links" ON parent_players
  FOR ALL USING (is_coach_of_player(player_id))
  WITH CHECK (is_coach_of_player(player_id));

CREATE POLICY "Coaches manage parent invites" ON parent_invites
  FOR ALL USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Public read parent invites" ON parent_invites
  FOR SELECT USING (true);

-- Parent read-only access (using SECURITY DEFINER functions to avoid RLS cycles)

CREATE POLICY "Parents read own children" ON players
  FOR SELECT USING (is_parent_of_player(id));

CREATE POLICY "Parents read children sessions" ON training_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM session_players sp
      WHERE sp.session_id = training_sessions.id AND is_parent_of_player(sp.player_id)
    )
  );

CREATE POLICY "Parents read children session players" ON session_players
  FOR SELECT USING (is_parent_of_player(player_id));

CREATE POLICY "Parents read children feedback" ON player_feedback
  FOR SELECT USING (is_parent_of_player(player_id));

CREATE POLICY "Parents read children homework" ON player_drills
  FOR SELECT USING (is_parent_of_player(player_id));

CREATE POLICY "Parents read children drill details" ON drills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_drills pd
      WHERE pd.drill_id = drills.id AND is_parent_of_player(pd.player_id)
    )
  );
