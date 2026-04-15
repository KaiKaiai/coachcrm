"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrainingSession, PlayerFeedback, PlayerDrillWithDrill, ScheduledSession } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, BookOpen, CheckCircle, ClipboardList, Star, ArrowRight,
} from "lucide-react";

export default function PlayerDashboardPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [homework, setHomework] = useState<PlayerDrillWithDrill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/player/sessions").then((r) => r.json()),
      fetch("/api/player/feedback").then((r) => r.json()),
      fetch("/api/player/homework").then((r) => r.json()),
    ]).then(([s, f, h]) => {
      if (Array.isArray(s)) setSessions(s);
      if (Array.isArray(f)) setFeedback(f);
      if (Array.isArray(h)) setHomework(h);
    }).finally(() => setLoading(false));
  }, []);

  const pendingHw = homework.filter((h) => h.status !== "completed").length;
  const completedHw = homework.filter((h) => h.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s your training overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : sessions.length}</div>
            <p className="text-xs text-muted-foreground">Training sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Homework</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : pendingHw}</div>
            <p className="text-xs text-muted-foreground">Pending assignments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : completedHw}</div>
            <p className="text-xs text-muted-foreground">Drills completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Recent Feedback</CardTitle><CardDescription>Your latest session feedback</CardDescription></div>
            <Link href="/player/sessions" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {feedback.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No feedback yet.</p>
            ) : (
              <div className="space-y-3">
                {feedback.slice(0, 5).map((fb) => (
                  <div key={fb.id} className="rounded-lg border p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium line-clamp-1">{fb.summary}</p>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Star className="h-3.5 w-3.5 text-yellow-500" />{fb.overall_rating}/10
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {fb.strengths?.slice(0, 2).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Homework</CardTitle><CardDescription>Your assigned drills</CardDescription></div>
            <Link href="/player/homework" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>View All</Link>
          </CardHeader>
          <CardContent>
            {homework.filter((h) => h.status !== "completed").length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {homework.filter((h) => h.status !== "completed").slice(0, 5).map((hw) => (
                  <Link key={hw.id} href={`/player/homework/${hw.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
                    <div>
                      <p className="font-medium text-sm">{(hw as any).drills?.title || "Drill"}</p>
                      {hw.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(hw.due_date).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={hw.status === "in_progress" ? "secondary" : "outline"}>{hw.status.replace("_", " ")}</Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
