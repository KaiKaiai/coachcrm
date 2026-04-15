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
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let query = supabase
    .from("scheduled_sessions")
    .select("*, scheduled_session_players(player_id, players(id, name, position, jersey_number))")
    .eq("coach_id", coachId)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (startDate) query = query.gte("scheduled_date", startDate);
  if (endDate) query = query.lte("scheduled_date", endDate);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data: session, error: sessionError } = await supabase
    .from("scheduled_sessions")
    .insert({
      coach_id: coachId,
      title: body.title,
      description: body.description || null,
      scheduled_date: body.scheduled_date,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location || null,
    })
    .select()
    .single();

  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  if (body.playerIds?.length > 0) {
    const rows = body.playerIds.map((pid: string) => ({
      scheduled_session_id: session.id,
      player_id: pid,
    }));
    const { error: spError } = await supabase.from("scheduled_session_players").insert(rows);
    if (spError) return NextResponse.json({ error: spError.message }, { status: 500 });
  }

  return NextResponse.json(session, { status: 201 });
}
