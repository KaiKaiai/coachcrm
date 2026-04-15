"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { PlayerDrillWithDrill } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Dumbbell, Clock, Target, Video, CheckCircle, PlayCircle, Loader2,
} from "lucide-react";

export default function PlayerHomeworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [hw, setHw] = useState<PlayerDrillWithDrill | null>(null);
  const [playerNotes, setPlayerNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/player/homework").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) {
        const found = data.find((h: PlayerDrillWithDrill) => h.id === id);
        if (found) { setHw(found); setPlayerNotes(found.player_notes || ""); }
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    await fetch("/api/player/homework", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, player_notes: playerNotes }),
    });
    setHw((prev) => prev ? { ...prev, status: status as any, completed_at: status === "completed" ? new Date().toISOString() : prev.completed_at } : prev);
    setSaving(false);
  };

  const saveNotes = async () => {
    setSaving(true);
    await fetch("/api/player/homework", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, player_notes: playerNotes }),
    });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!hw) return <p className="text-muted-foreground">Homework not found.</p>;

  const drill = (hw as any).drills;
  const statusColor = hw.status === "completed" ? "default" : hw.status === "in_progress" ? "secondary" : "outline";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/player/homework" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{drill?.title || "Drill"}</h1>
          <div className="flex items-center gap-2 mt-1">
            {drill?.category && <Badge variant="secondary">{drill.category}</Badge>}
            {drill?.difficulty && <Badge variant="outline">{drill.difficulty}</Badge>}
            <Badge variant={statusColor}>{hw.status.replace("_", " ")}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" />Drill Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {drill?.description && <p className="text-sm">{drill.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {drill?.estimated_minutes && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{drill.estimated_minutes} minutes</div>}
            {drill?.sets && <div>Sets: {drill.sets}</div>}
            {drill?.reps && <div>Reps: {drill.reps}</div>}
            {drill?.target_metric && <div className="flex items-center gap-2 col-span-2"><Target className="h-4 w-4 text-muted-foreground" />{drill.target_metric}</div>}
            {drill?.video_url && <a href={drill.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 col-span-2 text-primary hover:underline"><Video className="h-4 w-4" />Watch Video</a>}
          </div>
        </CardContent>
      </Card>

      {hw.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Coach Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{hw.notes}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Your Notes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={playerNotes} onChange={(e) => setPlayerNotes(e.target.value)} rows={3} placeholder="Add your notes here..." />
          <Button variant="outline" size="sm" onClick={saveNotes} disabled={saving}>Save Notes</Button>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex gap-2">
        {hw.status === "assigned" && (
          <Button onClick={() => updateStatus("in_progress")} disabled={saving} className="gap-2">
            <PlayCircle className="h-4 w-4" />Mark as In Progress
          </Button>
        )}
        {hw.status === "in_progress" && (
          <Button onClick={() => updateStatus("completed")} disabled={saving} className="gap-2">
            <CheckCircle className="h-4 w-4" />Mark as Complete
          </Button>
        )}
        {hw.status === "completed" && hw.completed_at && (
          <p className="text-sm text-muted-foreground">Completed on {new Date(hw.completed_at).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
}
