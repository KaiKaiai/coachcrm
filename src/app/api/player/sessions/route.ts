import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("session_players")
    .select("session_id, training_sessions(id, title, date, status, created_at)")
    .eq("player_id", player.id)
    .order("session_id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = data?.map((sp: any) => sp.training_sessions).filter(Boolean) || [];
  return NextResponse.json(sessions);
}
