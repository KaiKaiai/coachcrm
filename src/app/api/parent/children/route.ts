import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: parent } = await supabase
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!parent) return NextResponse.json({ error: "Parent not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("parent_players")
    .select("player_id, players(*, coaches(name))")
    .eq("parent_id", parent.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const children = data?.map((pp: any) => ({ ...pp.players, coach_name: pp.players?.coaches?.name })) || [];
  return NextResponse.json(children);
}
