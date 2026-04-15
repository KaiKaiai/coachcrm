"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ParentChildWithCoach } from "@/lib/types";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ClipboardList, BookOpen, Star, Users } from "lucide-react";

export default function ParentDashboardPage() {
  const [children, setChildren] = useState<ParentChildWithCoach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/children")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setChildren(data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">View your children&apos;s training progress.</p>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No players linked yet.</p>
            <p className="text-sm text-muted-foreground text-center">Ask your child&apos;s trainer for a parent invite link.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {children.map((child) => {
            const ratingColor = child.latest_rating
              ? child.latest_rating >= 7
                ? "text-green-600"
                : child.latest_rating >= 4
                  ? "text-yellow-600"
                  : "text-red-600"
              : "text-muted-foreground";

            return (
              <Link key={child.id} href={`/parent/players/${child.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        <CardDescription>
                          Coach: {(child.coaches as any)?.name || "Unknown"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {child.position && (
                          <Badge variant="secondary">{child.position}</Badge>
                        )}
                        {child.jersey_number && (
                          <Badge variant="outline">#{child.jersey_number}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <ClipboardList className="h-4 w-4" />
                          <span>{child.session_count || 0} sessions</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <BookOpen className="h-4 w-4" />
                          <span>{child.pending_homework_count || 0} homework</span>
                        </div>
                      </div>
                      {child.latest_rating !== null && child.latest_rating !== undefined && (
                        <div className={`flex items-center gap-1 font-medium ${ratingColor}`}>
                          <Star className="h-4 w-4" />
                          <span>{child.latest_rating}/10</span>
                        </div>
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
