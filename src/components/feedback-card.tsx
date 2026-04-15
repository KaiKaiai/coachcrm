"use client";

import { useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThumbsUp, TrendingUp, Dumbbell, Star, PlusCircle } from "lucide-react";
import type { PlayerFeedback, RecommendedDrill } from "@/lib/types";
import { AssignDrillDialog } from "@/components/assign-drill-dialog";

interface FeedbackCardProps {
  feedback: PlayerFeedback;
  playerName: string;
  playerPosition?: string | null;
  playerId?: string;
  sessionId?: string;
  showAssign?: boolean;
}

function getDrillDisplay(d: string | RecommendedDrill): { title: string; drill?: RecommendedDrill } {
  if (typeof d === "string") return { title: d };
  return { title: d.title, drill: d };
}

export function FeedbackCard({
  feedback,
  playerName,
  playerPosition,
  playerId,
  sessionId,
  showAssign = false,
}: FeedbackCardProps) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [prefillDrill, setPrefillDrill] = useState<RecommendedDrill | undefined>();

  const ratingColor =
    feedback.overall_rating >= 7
      ? "text-green-600"
      : feedback.overall_rating >= 4
        ? "text-yellow-600"
        : "text-red-600";

  const handleQuickAssign = (d: string | RecommendedDrill) => {
    const { drill } = getDrillDisplay(d);
    setPrefillDrill(typeof d === "string" ? { title: d } : d);
    setAssignOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{playerName}</CardTitle>
              {playerPosition && <CardDescription>{playerPosition}</CardDescription>}
            </div>
            <div className="flex items-center gap-1">
              <Star className={`h-5 w-5 ${ratingColor}`} />
              <span className={`text-xl font-bold ${ratingColor}`}>{feedback.overall_rating}/10</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{feedback.summary}</p>
          <Separator />

          {feedback.strengths?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ThumbsUp className="h-4 w-4 text-green-600" />Strengths
              </div>
              <div className="flex flex-wrap gap-1.5">
                {feedback.strengths.map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {feedback.improvements?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-yellow-600" />Areas to Improve
              </div>
              <div className="flex flex-wrap gap-1.5">
                {feedback.improvements.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {feedback.drills_recommended?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Dumbbell className="h-4 w-4 text-blue-600" />Recommended Drills
              </div>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                {feedback.drills_recommended.map((d, i) => {
                  const { title, drill } = getDrillDisplay(d);
                  return (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-foreground">{title}</span>
                        {drill && (drill.sets || drill.reps || drill.category) && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {drill.category && `${drill.category}`}
                            {drill.sets && ` ${drill.sets}x${drill.reps || ""}`}
                            {drill.estimated_minutes && ` ${drill.estimated_minutes}min`}
                          </span>
                        )}
                      </div>
                      {showAssign && playerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Assign this drill"
                          onClick={() => handleQuickAssign(d)}
                        >
                          <PlusCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {showAssign && playerId && (
        <AssignDrillDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          playerId={playerId}
          sessionId={sessionId}
          prefill={prefillDrill}
        />
      )}
    </>
  );
}
