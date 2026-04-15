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
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");

  let query = supabase.from("drills").select("*").eq("coach_id", coachId).order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  if (difficulty) query = query.eq("difficulty", difficulty);

  const { data, error } = await query;
  if (error) {
    console.error("Drills GET error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { supabase, coachId } = await getCoachId();
  if (!coachId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("drills")
    .insert({
      coach_id: coachId,
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
    .select()
    .single();

  if (error) {
    console.error("Drills POST error:", error);
    return NextResponse.json({ error: error.message, details: error }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
