import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";

function createAnonClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createAnonClient();

  // Try the RPC function first (SECURITY DEFINER, bypasses RLS)
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_parent_invite_details",
    { token_uuid: token }
  );

  if (!rpcError && rpcData && rpcData.length > 0) {
    const invite = rpcData[0];
    if (invite.invite_accepted) {
      return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
    }
    return NextResponse.json({
      playerName: invite.player_name || "Your Child",
      coachName: invite.coach_name || "Your Trainer",
    });
  }

  // Fallback: query parent_invites directly (public SELECT policy)
  console.log("RPC fallback - function may not exist:", rpcError?.message);

  const { data: invite, error } = await supabase
    .from("parent_invites")
    .select("id, player_id, coach_id, accepted")
    .eq("invite_token", token)
    .single();

  if (error || !invite) {
    console.error("Parent invite lookup failed:", error);
    return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  }
  if (invite.accepted) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });
  }

  return NextResponse.json({
    playerName: "Your Child",
    coachName: "Your Trainer",
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const anonClient = createAnonClient();
  const body = await request.json();

  const { data: invite, error: findError } = await anonClient
    .from("parent_invites")
    .select("id, player_id, accepted")
    .eq("invite_token", token)
    .single();

  if (findError || !invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  if (invite.accepted) return NextResponse.json({ error: "Invite already accepted" }, { status: 400 });

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: body.email,
    password: body.password,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  if (authData.user) {
    const { error: rpcError } = await anonClient.rpc("accept_parent_invite", {
      invite_id: invite.id,
      parent_user_id: authData.user.id,
      parent_name: body.name || body.email.split("@")[0],
      parent_email: body.email,
      linked_player_id: invite.player_id,
    });

    if (rpcError) {
      console.error("Accept parent invite RPC error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
