import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getCoachId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null };
  return { supabase, coachId: user.id };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scheduled_sessions")
    .select("*, scheduled_session_players(player_id, players(id, name, position, jersey_number))")
    .eq("id", id)
    .eq("coach_id", coachId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const updateData: Record<string, unknown> = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.scheduled_date !== undefined) updateData.scheduled_date = body.scheduled_date;
  if (body.start_time !== undefined) updateData.start_time = body.start_time;
  if (body.end_time !== undefined) updateData.end_time = body.end_time;
  if (body.location !== undefined) updateData.location = body.location;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.training_session_id !== undefined) updateData.training_session_id = body.training_session_id;

  const { data, error } = await supabase
    .from("scheduled_sessions")
    .update(updateData)
    .eq("id", id)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("scheduled_sessions").delete().eq("id", id).eq("coach_id", coachId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
