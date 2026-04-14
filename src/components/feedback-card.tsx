"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ThumbsUp,
  TrendingUp,
  Dumbbell,
  Star,
} from "lucide-react";
import type { PlayerFeedback } from "@/lib/types";

interface FeedbackCardProps {
  feedback: PlayerFeedback;
  playerName: string;
  playerPosition?: string | null;
}

export function FeedbackCard({
  feedback,
  playerName,
  playerPosition,
}: FeedbackCardProps) {
  const ratingColor =
    feedback.overall_rating >= 7
      ? "text-green-600"
      : feedback.overall_rating >= 4
        ? "text-yellow-600"
        : "text-red-600";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{playerName}</CardTitle>
            {playerPosition && (
              <CardDescription>{playerPosition}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Star className={`h-5 w-5 ${ratingColor}`} />
            <span className={`text-xl font-bold ${ratingColor}`}>
              {feedback.overall_rating}/10
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm">{feedback.summary}</p>

        <Separator />

        {feedback.strengths?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              Strengths
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feedback.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {feedback.improvements?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              Areas to Improve
            </div>
            <div className="flex flex-wrap gap-1.5">
              {feedback.improvements.map((s, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {feedback.drills_recommended?.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Dumbbell className="h-4 w-4 text-blue-600" />
              Recommended Drills
            </div>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-0.5">
              {feedback.drills_recommended.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
