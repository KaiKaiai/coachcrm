"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrainingSession } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calendar, ArrowRight } from "lucide-react";

export default function PlayerSessionsPage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/sessions").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setSessions(d);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Sessions</h1>
        <p className="text-muted-foreground">View your training session feedback.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Sessions</CardTitle>
          <CardDescription>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground text-center py-8">Loading...</p> :
           sessions.length === 0 ? <p className="text-muted-foreground text-center py-8">No sessions yet.</p> : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Link key={s.id} href={`/player/sessions/${s.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
