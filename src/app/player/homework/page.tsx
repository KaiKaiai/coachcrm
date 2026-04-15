"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PlayerDrillWithDrill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Dumbbell, ArrowRight, Clock } from "lucide-react";

export default function PlayerHomeworkPage() {
  const [homework, setHomework] = useState<PlayerDrillWithDrill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/homework").then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setHomework(d);
    }).finally(() => setLoading(false));
  }, []);

  const statusColor = (s: string) => s === "completed" ? "default" : s === "in_progress" ? "secondary" : "outline";

  const renderList = (items: PlayerDrillWithDrill[]) =>
    items.length === 0 ? (
      <p className="text-muted-foreground text-sm text-center py-8">No drills here.</p>
    ) : (
      <div className="space-y-2">
        {items.map((hw) => (
          <Link key={hw.id} href={`/player/homework/${hw.id}`} className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">{(hw as any).drills?.title || "Drill"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(hw as any).drills?.category && <Badge variant="secondary" className="text-xs">{(hw as any).drills.category}</Badge>}
                {(hw as any).drills?.estimated_minutes && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(hw as any).drills.estimated_minutes}min</span>
                )}
                {hw.due_date && <span>Due: {new Date(hw.due_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusColor(hw.status)}>{hw.status.replace("_", " ")}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homework</h1>
        <p className="text-muted-foreground">Your assigned drills and exercises.</p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({homework.length})</TabsTrigger>
          <TabsTrigger value="assigned">Assigned ({homework.filter((h) => h.status === "assigned").length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({homework.filter((h) => h.status === "in_progress").length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({homework.filter((h) => h.status === "completed").length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">{loading ? <p className="text-center py-8 text-muted-foreground">Loading...</p> : renderList(homework)}</TabsContent>
        <TabsContent value="assigned" className="mt-4">{renderList(homework.filter((h) => h.status === "assigned"))}</TabsContent>
        <TabsContent value="in_progress" className="mt-4">{renderList(homework.filter((h) => h.status === "in_progress"))}</TabsContent>
        <TabsContent value="completed" className="mt-4">{renderList(homework.filter((h) => h.status === "completed"))}</TabsContent>
      </Tabs>
    </div>
  );
}
