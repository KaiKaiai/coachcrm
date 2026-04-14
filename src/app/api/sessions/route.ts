import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function getCoachId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, coachId: null };
  return { supabase, coachId: user.id };
}

export async function GET() {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("training_sessions")
    .select(
      `
      *,
      session_players(player_id, players(id, name, position, jersey_number))
    `
    )
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: session, error: sessionError } = await supabase
    .from("training_sessions")
    .insert({
      coach_id: coachId,
      title: body.title,
      transcript: body.transcript || null,
      status: body.status || "recording",
    })
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json(
      { error: sessionError.message },
      { status: 500 }
    );
  }

  if (body.playerIds?.length > 0) {
    const sessionPlayers = body.playerIds.map((playerId: string) => ({
      session_id: session.id,
      player_id: playerId,
    }));

    const { error: spError } = await supabase
      .from("session_players")
      .insert(sessionPlayers);

    if (spError) {
      return NextResponse.json({ error: spError.message }, { status: 500 });
    }
  }

  return NextResponse.json(session, { status: 201 });
}

export async function PUT(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const updateData: Record<string, unknown> = {};
  if (body.transcript !== undefined) updateData.transcript = body.transcript;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.title !== undefined) updateData.title = body.title;

  const { data, error } = await supabase
    .from("training_sessions")
    .update(updateData)
    .eq("id", body.id)
    .eq("coach_id", coachId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
