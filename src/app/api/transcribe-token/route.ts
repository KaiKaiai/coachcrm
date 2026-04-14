import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AssemblyAI API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://streaming.assemblyai.com/v3/token");
    url.search = new URLSearchParams({
      expires_in_seconds: "300",
    }).toString();

    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AssemblyAI token error: ${response.status} ${text}`);
    }

    const data = await response.json();
    return NextResponse.json({ token: data.token });
  } catch (err: any) {
    console.error("Error generating AssemblyAI token:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}
