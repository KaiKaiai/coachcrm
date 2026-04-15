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

  // Get homework with drill details
  const { data: homework, error } = await supabase
    .from("player_drills")
    .select("*, drills(id, title, category, difficulty)")
    .eq("player_id", playerId)
    .order("assigned_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(homework || []);
}
