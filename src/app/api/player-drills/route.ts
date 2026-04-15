import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getCoachId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null };
  return { supabase, coachId: user.id };
}

export async function GET(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get("playerId");
  const drillId = searchParams.get("drillId");

  let query = supabase
    .from("player_drills")
    .select("*, drills(*), players(id, name, position, jersey_number)")
    .order("assigned_at", { ascending: false });

  if (playerId) query = query.eq("player_id", playerId);
  if (drillId) query = query.eq("drill_id", drillId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("player_drills")
    .insert({
      player_id: body.player_id,
      drill_id: body.drill_id,
      session_id: body.session_id || null,
      due_date: body.due_date || null,
      notes: body.notes || null,
    })
    .select("*, drills(*), players(id, name, position, jersey_number)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
