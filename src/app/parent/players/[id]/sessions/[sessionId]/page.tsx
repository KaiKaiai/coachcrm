"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { PlayerFeedback, TrainingSession } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Star, ThumbsUp, TrendingUp, Dumbbell, Loader2, Calendar } from "lucide-react";

export default function ParentSessionDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; sessionId: string }> 
}) {
  const { id: playerId, sessionId } = use(params);
  const [feedback, setFeedback] = useState<PlayerFeedback[]>([]);
  const [session, setSession] = useState<TrainingSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/parent/children/${playerId}/feedback?sessionId=${sessionId}`).then((r) => r.json()),
      fetch(`/api/parent/children/${playerId}/sessions`).then((r) => r.json()),
    ]).then(([f, sessions]) => {
      if (Array.isArray(f)) setFeedback(f);
      if (Array.isArray(sessions)) {
        const s = sessions.find((sess: TrainingSession) => sess.id === sessionId);
        if (s) setSession(s);
      }
    }).finally(() => setLoading(false));
  }, [playerId, sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fb = feedback[0];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href={`/parent/players/${playerId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{session?.title || "Session Feedback"}</h1>
          {session && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {new Date(session.date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {!fb ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No feedback available for this session yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Feedback</CardTitle>
              <div className="flex items-center gap-1">
                <Star className={`h-5 w-5 ${
                  fb.overall_rating >= 7 ? "text-green-600" : 
                  fb.overall_rating >= 4 ? "text-yellow-600" : "text-red-600"
                }`} />
                <span className={`text-xl font-bold ${
                  fb.overall_rating >= 7 ? "text-green-600" : 
                  fb.overall_rating >= 4 ? "text-yellow-600" : "text-red-600"
                }`}>{fb.overall_rating}/10</span>
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
      )}
    </div>
  );
}
