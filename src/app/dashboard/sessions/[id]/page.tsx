"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { TrainingSession, PlayerFeedback, Player } from "@/lib/types";
import { FeedbackCard } from "@/components/feedback-card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Loader2,
  Calendar,
  Users,
} from "lucide-react";

interface SessionWithPlayers extends TrainingSession {
  session_players: {
    player_id: string;
    players: Pick<Player, "id" | "name" | "position" | "jersey_number">;
  }[];
}

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [session, setSession] = useState<SessionWithPlayers | null>(null);
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [players, setPlayers] = useState<
    Pick<Player, "id" | "name" | "position" | "jersey_number">[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
    fetchFeedback();
  }, [id]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      if (Array.isArray(data)) {
        const found = data.find((s: SessionWithPlayers) => s.id === id);
        if (found) {
          setSession(found);
          const sessionPlayers =
            found.session_players?.map((sp: any) => sp.players) || [];
          setPlayers(sessionPlayers);
        }
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`/api/feedback?sessionId=${id}`);
      const data = await res.json();
      if (Array.isArray(data)) setFeedback(data);
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    }
  };

  const handleGenerateFeedback = async () => {
    if (!session?.transcript || players.length === 0) {
      setError("Transcript and players are required to generate feedback");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: id,
          transcript: session.transcript,
          playerNames: players.map((p) => ({ id: p.id, name: p.name })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate feedback");

      setFeedback(data.feedback || []);
      setSession((prev) => (prev ? { ...prev, status: "analyzed" } : prev));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Session not found.</p>
        <Link
          href="/dashboard/sessions"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to Sessions
        </Link>
      </div>
    );
  }

  const statusColor =
    session.status === "analyzed"
      ? "default"
      : session.status === "transcribed"
        ? "secondary"
        : "outline";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/sessions"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {session.title}
            </h1>
            <Badge variant={statusColor}>{session.status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(session.date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {players.length} player{players.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {players.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <Badge key={p.id} variant="secondary">
              {p.jersey_number != null && `#${p.jersey_number} `}
              {p.name}
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </CardTitle>
          <CardDescription>
            Full session transcript from AssemblyAI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] rounded-lg border bg-muted/50 p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {session.transcript || "No transcript available."}
            </p>
          </ScrollArea>
        </CardContent>
      </Card>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Player Feedback
          </h2>
          {session.status !== "analyzed" && (
            <Button
              onClick={handleGenerateFeedback}
              disabled={generating || !session.transcript}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate AI Feedback
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {feedback.length === 0 && !generating && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No feedback generated yet.</p>
              <p className="text-sm">
                Click &quot;Generate AI Feedback&quot; to analyze the transcript.
              </p>
            </CardContent>
          </Card>
        )}

        {generating && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>Analyzing transcript with AI...</p>
              <p className="text-sm">This may take a moment.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {feedback.map((fb) => {
            const player = players.find((p) => p.id === fb.player_id);
            return (
              <FeedbackCard
                key={fb.id}
                feedback={fb}
                playerName={player?.name || "Unknown Player"}
                playerPosition={player?.position}
                playerId={fb.player_id}
                sessionId={id}
                showAssign={true}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
