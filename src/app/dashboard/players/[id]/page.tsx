"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Player, PlayerDrillWithDrill, PlayerFeedback, ScheduledSessionWithPlayers } from "@/lib/types";
import { FeedbackCard } from "@/components/feedback-card";
import { AssignDrillDialog } from "@/components/assign-drill-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Dumbbell, ClipboardList, Calendar, Loader2, PlusCircle } from "lucide-react";

export default function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [player, setPlayer] = useState<Player | null>(null);
  const [homework, setHomework] = useState<PlayerDrillWithDrill[]>([]);
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [schedule, setSchedule] = useState<ScheduledSessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/players").then((r) => r.json()),
      fetch(`/api/player-drills?playerId=${id}`).then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/calendar").then((r) => r.json()),
    ]).then(([players, hw, sessions, cal]) => {
      if (Array.isArray(players)) setPlayer(players.find((p: Player) => p.id === id) || null);
      if (Array.isArray(hw)) setHomework(hw);
      if (Array.isArray(sessions)) {
        const playerSessions = sessions.filter((s: any) =>
          s.session_players?.some((sp: any) => sp.player_id === id)
        );
        const fb: PlayerFeedback[] = [];
        for (const s of playerSessions) {
          fetch(`/api/feedback?sessionId=${s.id}`)
            .then((r) => r.json())
            .then((data) => {
              if (Array.isArray(data)) {
                const playerFb = data.filter((f: PlayerFeedback) => f.player_id === id);
                if (playerFb.length > 0) setFeedback((prev) => [...prev, ...playerFb]);
              }
            });
        }
      }
      if (Array.isArray(cal)) {
        setSchedule(
          cal.filter((s: ScheduledSessionWithPlayers) =>
            s.scheduled_session_players?.some((sp) => sp.player_id === id)
          )
        );
      }
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!player) return <p className="text-muted-foreground">Player not found.</p>;

  const statusColor = (s: string) => s === "completed" ? "default" : s === "in_progress" ? "secondary" : "outline";

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/players" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {player.jersey_number != null && <span className="text-muted-foreground">#{player.jersey_number} </span>}
            {player.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
            <Badge variant={player.invite_accepted ? "default" : "outline"}>
              {player.invite_accepted ? "Active" : "Invited"}
            </Badge>
          </div>
        </div>
      </div>

      <Tabs defaultValue="homework">
        <TabsList>
          <TabsTrigger value="homework" className="gap-2"><Dumbbell className="h-3.5 w-3.5" />Homework</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2"><ClipboardList className="h-3.5 w-3.5" />Feedback</TabsTrigger>
          <TabsTrigger value="schedule" className="gap-2"><Calendar className="h-3.5 w-3.5" />Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="homework" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-2"><PlusCircle className="h-4 w-4" />Assign Drill</Button>
          </div>
          {homework.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No homework assigned yet.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {homework.map((hw) => (
                <Card key={hw.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{(hw as any).drills?.title || "Unknown drill"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {(hw as any).drills?.category && <Badge variant="secondary" className="text-xs">{(hw as any).drills.category}</Badge>}
                        {hw.due_date && <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Badge variant={statusColor(hw.status)}>{hw.status.replace("_", " ")}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
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

        <TabsContent value="schedule" className="space-y-4 mt-4">
          {schedule.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No scheduled sessions.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {schedule.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-sm">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.scheduled_date).toLocaleDateString()} &middot; {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                        {s.location && ` &middot; ${s.location}`}
                      </p>
                    </div>
                    <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>{s.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AssignDrillDialog open={assignOpen} onOpenChange={setAssignOpen} playerId={id} onAssigned={() => {
        fetch(`/api/player-drills?playerId=${id}`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setHomework(d); });
      }} />
    </div>
  );
}
