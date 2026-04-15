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
    .from("drills")
    .select("*")
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
  const { data, error } = await supabase
    .from("drills")
    .update({
      title: body.title,
      description: body.description || null,
      category: body.category || null,
      difficulty: body.difficulty || null,
      estimated_minutes: body.estimated_minutes || null,
      video_url: body.video_url || null,
      sets: body.sets || null,
      reps: body.reps || null,
      target_metric: body.target_metric || null,
    })
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

  const { error } = await supabase.from("drills").delete().eq("id", id).eq("coach_id", coachId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
