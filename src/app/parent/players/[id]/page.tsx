"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { ParentChildWithCoach, TrainingSession, PlayerFeedback, PlayerDrillWithDrill } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Calendar, Loader2, Star, ThumbsUp, TrendingUp, Dumbbell, ClipboardList, BookOpen, MessageSquare,
} from "lucide-react";

export default function ParentPlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [player, setPlayer] = useState<ParentChildWithCoach | null>(null);
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
      if (Array.isArray(children)) {
        const child = children.find((c: ParentChildWithCoach) => c.id === id);
        if (child) setPlayer(child);
      }
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(f)) setFeedback(f);
      if (Array.isArray(h)) setHomework(h);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="space-y-4">
        <Link href="/parent/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-2")}>
          <ArrowLeft className="h-4 w-4" />Back
        </Link>
        <p className="text-muted-foreground">Player not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parent/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
            {player.jersey_number && <Badge variant="outline">#{player.jersey_number}</Badge>}
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
          </div>
          <p className="text-muted-foreground">Coach: {(player.coaches as any)?.name || "Unknown"}</p>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions" className="gap-2">
            <ClipboardList className="h-4 w-4" />Sessions
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="h-4 w-4" />Feedback
          </TabsTrigger>
          <TabsTrigger value="homework" className="gap-2">
            <BookOpen className="h-4 w-4" />Homework
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No sessions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link key={session.id} href={`/parent/players/${id}/sessions/${session.id}`}>
                  <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="font-medium">{session.title}</p>
                        <p className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={session.status === "analyzed" ? "default" : "secondary"}>
                        {session.status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No feedback yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {feedback.map((fb) => {
                const ratingColor =
                  fb.overall_rating >= 7
                    ? "text-green-600"
                    : fb.overall_rating >= 4
                      ? "text-yellow-600"
                      : "text-red-600";

                return (
                  <Card key={fb.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{player.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Star className={`h-5 w-5 ${ratingColor}`} />
                          <span className={`text-xl font-bold ${ratingColor}`}>{fb.overall_rating}/10</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{fb.summary}</p>
                      <Separator />

                      {fb.strengths?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <ThumbsUp className="h-4 w-4 text-green-600" />Strengths
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fb.strengths.map((s, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {fb.improvements?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="h-4 w-4 text-yellow-600" />Areas to Improve
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {fb.improvements.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {fb.drills_recommended?.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Dumbbell className="h-4 w-4 text-blue-600" />Recommended Drills
                          </div>
                          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
                            {fb.drills_recommended.map((d, i) => (
                              <li key={i}>{typeof d === "string" ? d : d.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="homework" className="space-y-4">
          {homework.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No homework assigned yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {homework.map((hw) => {
                const drill = (hw as any).drills;
                const statusVariant = 
                  hw.status === "completed" ? "default" : 
                  hw.status === "in_progress" ? "secondary" : "outline";

                return (
                  <Card key={hw.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="space-y-1">
                        <p className="font-medium">{drill?.title || "Drill"}</p>
                        <div className="flex items-center gap-2 text-sm">
                          {drill?.category && <Badge variant="secondary" className="text-xs">{drill.category}</Badge>}
                          {drill?.difficulty && <Badge variant="outline" className="text-xs">{drill.difficulty}</Badge>}
                          {hw.due_date && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due: {new Date(hw.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={statusVariant}>{hw.status.replace("_", " ")}</Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
