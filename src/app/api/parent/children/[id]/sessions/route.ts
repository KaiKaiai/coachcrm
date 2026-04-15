import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playerId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify parent has access to this player
  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!parent) {
    return NextResponse.json({ error: "Parent not found" }, { status: 404 });
  }

  const { data: link } = await supabase
    .from("parent_players")
    .select("player_id")
    .eq("parent_id", parent.id)
    .eq("player_id", playerId)
    .single();

  if (!link) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get sessions for this player
  const { data: sessionLinks } = await supabase
    .from("session_players")
    .select("session_id")
    .eq("player_id", playerId);

  if (!sessionLinks || sessionLinks.length === 0) {
    return NextResponse.json([]);
  }

  const sessionIds = sessionLinks.map((s) => s.session_id);

  const { data: sessions, error } = await supabase
    .from("training_sessions")
    .select("id, title, date, status")
    .in("id", sessionIds)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(sessions || []);
}
