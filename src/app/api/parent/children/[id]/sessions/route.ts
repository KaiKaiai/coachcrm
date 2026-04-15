import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: playerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("session_players")
    .select("session_id, training_sessions(id, title, date, status, created_at)")
    .eq("player_id", playerId)
    .order("session_id", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = data?.map((sp: any) => sp.training_sessions).filter(Boolean) || [];
  return NextResponse.json(sessions);
}
