import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: player, error } = await supabase
    .from("players")
    .select("id, name, email, coach_id, invite_accepted, coaches(name)")
    .eq("invite_token", token)
    .single();

  if (error || !player) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (player.invite_accepted) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  return NextResponse.json({
    playerName: player.name,
    coachName: (player as any).coaches?.name || "Your Trainer",
    playerId: player.id,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: player, error: findError } = await supabase
    .from("players")
    .select("id, invite_accepted")
    .eq("invite_token", token)
    .single();

  if (findError || !player) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (player.invite_accepted) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (authData.user) {
    await supabase
      .from("players")
      .update({
        user_id: authData.user.id,
        email: body.email,
        invite_accepted: true,
      })
      .eq("id", player.id);
  }

  return NextResponse.json({ success: true });
}
