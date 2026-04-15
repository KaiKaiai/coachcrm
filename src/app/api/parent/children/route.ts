import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get parent record
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!parent) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  // Get linked players with coach info
  const { data: links } = await supabase
    .from("parent_players")
    .select("player_id")
    .eq("parent_id", parent.id);

  if (!links || links.length === 0) {
    return NextResponse.json([]);
  }

  const playerIds = links.map((l) => l.player_id);

  // Get players with coach info
  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, position, jersey_number, coach_id, coaches(id, name)")
    .in("id", playerIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get session counts for each player
  const { data: sessionCounts } = await supabase
    .from("session_players")
    .select("player_id")
    .in("player_id", playerIds);

  // Get pending homework counts
  const { data: homeworkCounts } = await supabase
    .from("player_drills")
    .select("player_id, status")
    .in("player_id", playerIds)
    .neq("status", "completed");

  // Get latest ratings
  const { data: feedback } = await supabase
    .from("player_feedback")
    .select("player_id, overall_rating, created_at")
    .in("player_id", playerIds)
    .order("created_at", { ascending: false });

  // Build enriched player data
  const enrichedPlayers = players?.map((player) => {
    const sessionCount = sessionCounts?.filter((s) => s.player_id === player.id).length || 0;
    const pendingHomeworkCount = homeworkCounts?.filter((h) => h.player_id === player.id).length || 0;
    const playerFeedback = feedback?.filter((f) => f.player_id === player.id);
    const latestRating = playerFeedback?.[0]?.overall_rating || null;

    return {
      ...player,
      session_count: sessionCount,
      pending_homework_count: pendingHomeworkCount,
      latest_rating: latestRating,
    };
  });

  return NextResponse.json(enrichedPlayers || []);
}
