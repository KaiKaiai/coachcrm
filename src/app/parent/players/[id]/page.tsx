"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Player, PlayerFeedback, PlayerDrillWithDrill, TrainingSession } from "@/lib/types";
import { FeedbackCard } from "@/components/feedback-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ClipboardList, Dumbbell, Star, Calendar, ArrowRight, Loader2, Clock,
} from "lucide-react";

export default function ParentPlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [player, setPlayer] = useState<(Player & { coach_name?: string }) | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [homework, setHomework] = useState<PlayerDrillWithDrill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/parent/children").then((r) => r.json()),
      fetch(`/api/parent/children/${id}/sessions`).then((r) => r.json()),
      fetch(`/api/parent/children/${id}/feedback`).then((r) => r.json()),
      fetch(`/api/parent/children/${id}/homework`).then((r) => r.json()),
    ]).then(([children, s, f, h]) => {
      if (Array.isArray(children)) setPlayer(children.find((c: any) => c.id === id) || null);
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(f)) setFeedback(f);
      if (Array.isArray(h)) setHomework(h);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!player) return <p className="text-muted-foreground">Player not found.</p>;

  const statusColor = (s: string) => s === "completed" ? "default" as const : s === "in_progress" ? "secondary" as const : "outline" as const;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/parent/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {player.jersey_number != null && <span className="text-muted-foreground">#{player.jersey_number} </span>}
            {player.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
            {player.coach_name && <span className="text-sm text-muted-foreground">Coach: {player.coach_name}</span>}
          </div>
        </div>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2"><ClipboardList className="h-3.5 w-3.5" />Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2"><Star className="h-3.5 w-3.5" />Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="homework" className="gap-2"><Dumbbell className="h-3.5 w-3.5" />Homework ({homework.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-2 mt-4">
          {sessions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No sessions yet.</CardContent></Card>
          ) : (
            sessions.map((s) => (
              <Link key={s.id} href={`/parent/players/${id}/sessions/${s.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
                <div>
                  <p className="font-medium text-sm">{s.title}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />{new Date(s.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.status === "analyzed" ? "default" : "secondary"}>{s.status}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4 mt-4">
          {feedback.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback yet.</CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {feedback.map((fb) => (
                <FeedbackCard key={fb.id} feedback={fb} playerName={player.name} playerPosition={player.position} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="homework" className="space-y-2 mt-4">
          {homework.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No homework assigned.</CardContent></Card>
          ) : (
            homework.map((hw) => (
              <Card key={hw.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">{(hw as any).drills?.title || "Drill"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {(hw as any).drills?.category && <Badge variant="secondary" className="text-xs">{(hw as any).drills.category}</Badge>}
                      {(hw as any).drills?.estimated_minutes && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(hw as any).drills.estimated_minutes}min</span>
                      )}
                      {hw.due_date && <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Badge variant={statusColor(hw.status)}>{hw.status.replace("_", " ")}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
