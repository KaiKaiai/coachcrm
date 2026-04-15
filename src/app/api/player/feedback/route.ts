import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  let query = supabase
    .from("player_feedback")
    .select("*")
    .eq("player_id", player.id)
    .order("created_at", { ascending: false });

  if (sessionId) query = query.eq("session_id", sessionId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
