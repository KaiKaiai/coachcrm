import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("player_feedback")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, transcript, playerNames } = body as {
    sessionId: string;
    transcript: string;
    playerNames: { id: string; name: string }[];
  };

  if (!sessionId || !transcript || !playerNames?.length) {
    return NextResponse.json(
      { error: "sessionId, transcript, and playerNames are required" },
      { status: 400 }
    );
  }

  const playerList = playerNames.map((p) => p.name).join(", ");

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert basketball coaching analyst. Below is a transcript from a basketball training session. The following players were present: ${playerList}.

Analyze the transcript and extract specific feedback for EACH player mentioned or discussed. If a player's name is not directly mentioned in the transcript, provide general feedback based on the session content.

Return your response as a JSON array with the following structure for each player:

\`\`\`json
[
  {
    "playerName": "Player Name",
    "summary": "2-3 sentence summary of the coach's feedback for this player",
    "strengths": ["strength 1", "strength 2"],
    "improvements": ["area for improvement 1", "area for improvement 2"],
    "drillsRecommended": [
      {
        "title": "Free Throw Practice",
        "description": "Practice free throws focusing on consistent form and follow-through",
        "category": "shooting",
        "difficulty": "intermediate",
        "sets": 5,
        "reps": 10,
        "estimated_minutes": 15,
        "target_metric": "make 40 out of 50 free throws"
      }
    ],
    "overallRating": 7
  }
]
\`\`\`

For drillsRecommended, each drill must be a structured object. category must be one of: shooting, dribbling, passing, defense, conditioning, footwork, other. difficulty must be one of: beginner, intermediate, advanced. Include realistic sets, reps, estimated_minutes, and a target_metric where applicable.

overallRating should be 1-10 based on the coach's tone and feedback.

IMPORTANT: Return ONLY the JSON array, no other text.

Transcript:
${transcript}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let feedbackArray: any[];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      feedbackArray = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as JSON", raw: responseText },
        { status: 500 }
      );
    }

    const feedbackInserts = feedbackArray.map((fb: any) => {
      const matchedPlayer = playerNames.find(
        (p) => p.name.toLowerCase() === fb.playerName?.toLowerCase()
      );
      return {
        session_id: sessionId,
        player_id: matchedPlayer?.id || playerNames[0]?.id,
        summary: fb.summary || "No summary available",
        strengths: fb.strengths || [],
        improvements: fb.improvements || [],
        drills_recommended: fb.drillsRecommended || [],
        overall_rating: Math.min(10, Math.max(1, fb.overallRating || 5)),
        raw_ai_response: fb,
      };
    });

    const { data: inserted, error: insertError } = await supabase
      .from("player_feedback")
      .insert(feedbackInserts)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    await supabase
      .from("training_sessions")
      .update({ status: "analyzed" })
      .eq("id", sessionId);

    return NextResponse.json({ feedback: inserted });
  } catch (err: any) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
