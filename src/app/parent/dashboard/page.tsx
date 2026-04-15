"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Player, PlayerFeedback, PlayerDrillWithDrill } from "@/lib/types";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ClipboardList, BookOpen, Star, ArrowRight, Loader2,
} from "lucide-react";

interface ChildPlayer extends Player {
  coach_name?: string;
}

interface ChildStats {
  sessionCount: number;
  pendingHomework: number;
  latestRating: number | null;
}

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ChildPlayer[]>([]);
  const [stats, setStats] = useState<Record<string, ChildStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/children")
      .then((r) => r.json())
      .then(async (data) => {
        if (!Array.isArray(data)) return;
        setChildren(data);

        const statsMap: Record<string, ChildStats> = {};
        await Promise.all(
          data.map(async (child: ChildPlayer) => {
            const [sessionsRes, feedbackRes, homeworkRes] = await Promise.all([
              fetch(`/api/parent/children/${child.id}/sessions`).then((r) => r.json()),
              fetch(`/api/parent/children/${child.id}/feedback`).then((r) => r.json()),
              fetch(`/api/parent/children/${child.id}/homework`).then((r) => r.json()),
            ]);
            const sessions = Array.isArray(sessionsRes) ? sessionsRes : [];
            const feedback = Array.isArray(feedbackRes) ? feedbackRes : [];
            const homework = Array.isArray(homeworkRes) ? homeworkRes : [];

            statsMap[child.id] = {
              sessionCount: sessions.length,
              pendingHomework: homework.filter((h: any) => h.status !== "completed").length,
              latestRating: feedback.length > 0 ? feedback[0].overall_rating : null,
            };
          })
        );
        setStats(statsMap);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          View your children&apos;s training progress and feedback.
        </p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No linked players yet</p>
            <p className="text-sm">Ask your child&apos;s trainer to send you an invite link.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            const s = stats[child.id];
            return (
              <Link key={child.id} href={`/parent/players/${child.id}`}>
                <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {child.jersey_number != null && (
                            <span className="text-muted-foreground mr-1">#{child.jersey_number}</span>
                          )}
                          {child.name}
                        </CardTitle>
                        {child.position && (
                          <CardDescription>
                            <Badge variant="secondary" className="mt-1">{child.position}</Badge>
                          </CardDescription>
                        )}
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {child.coach_name && (
                      <p className="text-xs text-muted-foreground">Coach: {child.coach_name}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                        {s?.sessionCount ?? 0} sessions
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        {s?.pendingHomework ?? 0} pending
                      </span>
                      {s?.latestRating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="font-bold">{s.latestRating}/10</span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
