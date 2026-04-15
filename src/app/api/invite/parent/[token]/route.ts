import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: invite, error } = await supabase
    .from("parent_invites")
    .select("id, coach_id, player_id, accepted, coaches(name), players(name)")
    .eq("invite_token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.accepted) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  return NextResponse.json({
    playerName: (invite as any).players?.name || "Your Child",
    coachName: (invite as any).coaches?.name || "Your Trainer",
    inviteId: invite.id,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Validate invite
  const { data: invite, error: findError } = await supabase
    .from("parent_invites")
    .select("id, player_id, accepted")
    .eq("invite_token", token)
    .single();

  if (findError || !invite) {
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }

  if (invite.accepted) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (authData.user) {
    // Create parent record
    const { data: parent, error: parentError } = await supabase
      .from("parents")
      .insert({
        user_id: authData.user.id,
        name: body.email.split("@")[0], // Default name from email
        email: body.email,
      })
      .select("id")
      .single();

    if (parentError) {
      return NextResponse.json({ error: "Failed to create parent account" }, { status: 500 });
    }

    // Create parent-player link
    await supabase
      .from("parent_players")
      .insert({
        parent_id: parent.id,
        player_id: invite.player_id,
      });

    // Mark invite as accepted
    await supabase
      .from("parent_invites")
      .update({
        parent_id: parent.id,
        accepted: true,
      })
      .eq("id", invite.id);
  }

  return NextResponse.json({ success: true });
}
