"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Player } from "@/lib/types";
import { TranscribeRecorder } from "@/components/transcribe-recorder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Loader2, Users, FileText } from "lucide-react";

export default function NewSessionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"setup" | "record" | "review">("setup");

  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data);
      })
      .catch(console.error);
  }, []);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleTranscriptReady = (text: string) => {
    setTranscript(text);
    setStep("review");
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a session title");
      return;
    }
    if (!transcript.trim()) {
      setError("No transcript to save. Please record a session first.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          transcript,
          status: "transcribed",
          playerIds: selectedPlayerIds,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save session");
      }

      const session = await res.json();
      router.push(`/dashboard/sessions/${session.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Training Session
        </h1>
        <p className="text-muted-foreground">
          Record a training session and generate AI-powered feedback for each
          player.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {["setup", "record", "review"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge
              variant={
                step === s
                  ? "default"
                  : ["setup", "record", "review"].indexOf(step) > i
                    ? "secondary"
                    : "outline"
              }
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </Badge>
            {i < 2 && (
              <span className="text-muted-foreground text-xs">→</span>
            )}
          </div>
        ))}
      </div>

      {step === "setup" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Details</CardTitle>
              <CardDescription>
                Name your session and select participating players.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Session Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tuesday Shooting Drill"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Players
              </CardTitle>
              <CardDescription>
                Choose which players are in this session.{" "}
                {selectedPlayerIds.length} selected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  No players found. Add players from the Players page first.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {players.map((player) => (
                    <label
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        checked={selectedPlayerIds.includes(player.id)}
                        onCheckedChange={() => togglePlayer(player.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {player.jersey_number != null && (
                            <span className="text-muted-foreground mr-1">
                              #{player.jersey_number}
                            </span>
                          )}
                          {player.name}
                        </div>
                        {player.position && (
                          <div className="text-xs text-muted-foreground">
                            {player.position}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            onClick={() => setStep("record")}
            disabled={!title.trim()}
            className="gap-2"
          >
            Continue to Recording
          </Button>
        </div>
      )}

      {step === "record" && (
        <div className="space-y-4">
          <TranscribeRecorder
            onTranscriptReady={handleTranscriptReady}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("setup")}>
              Back
            </Button>
            {transcript && (
              <Button onClick={() => setStep("review")}>
                Skip to Review
              </Button>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Review Transcript
              </CardTitle>
              <CardDescription>
                Review and edit the transcript before saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Session: {title}</Label>
                {selectedPlayerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedPlayerIds.map((id) => {
                      const p = players.find((p) => p.id === id);
                      return p ? (
                        <Badge key={id} variant="secondary">
                          {p.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={12}
                className="font-mono text-sm"
                placeholder="Transcript will appear here..."
              />
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("record")}>
              Back to Recording
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !transcript.trim()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
