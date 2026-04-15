"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import type { Drill, PlayerDrillWithPlayer } from "@/lib/types";
import { DrillForm } from "@/components/drill-form";
import { AssignDrillDialog } from "@/components/assign-drill-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Trash2, Clock, Target, Video, Dumbbell, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DrillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [drill, setDrill] = useState<Drill | null>(null);
  const [assignments, setAssignments] = useState<PlayerDrillWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchDrill = async () => {
    const res = await fetch(`/api/drills/${id}`);
    if (res.ok) setDrill(await res.json());
    setLoading(false);
  };

  const fetchAssignments = async () => {
    const res = await fetch(`/api/player-drills?drillId=${id}`);
    const data = await res.json();
    if (Array.isArray(data)) setAssignments(data);
  };

  useEffect(() => { fetchDrill(); fetchAssignments(); }, [id]);

  const handleUpdate = async (data: Partial<Drill>) => {
    const res = await fetch(`/api/drills/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setEditOpen(false); fetchDrill(); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this drill?")) return;
    await fetch(`/api/drills/${id}`, { method: "DELETE" });
    router.push("/dashboard/drills");
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!drill) return <p className="text-muted-foreground">Drill not found.</p>;

  const statusColor = (s: string) => s === "completed" ? "default" : s === "in_progress" ? "secondary" : "outline";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/drills" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{drill.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {drill.category && <Badge variant="secondary">{drill.category}</Badge>}
            {drill.difficulty && <Badge variant="outline">{drill.difficulty}</Badge>}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2"><Pencil className="h-3 w-3" />Edit</Button>
        <Button variant="ghost" size="sm" onClick={handleDelete} className="gap-2 text-destructive"><Trash2 className="h-3 w-3" />Delete</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" />Drill Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {drill.description && <p className="text-sm">{drill.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {drill.estimated_minutes && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />{drill.estimated_minutes} minutes</div>}
            {drill.sets && <div>Sets: {drill.sets}</div>}
            {drill.reps && <div>Reps: {drill.reps}</div>}
            {drill.target_metric && <div className="flex items-center gap-2 col-span-2"><Target className="h-4 w-4 text-muted-foreground" />{drill.target_metric}</div>}
            {drill.video_url && <a href={drill.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 col-span-2 text-primary hover:underline"><Video className="h-4 w-4" />Watch Video</a>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Assigned To</CardTitle>
          <CardDescription>{assignments.length} player{assignments.length !== 1 ? "s" : ""}</CardDescription></div>
          <Button size="sm" onClick={() => setAssignOpen(true)} className="gap-2">Assign to Player</Button>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Not assigned to any players yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{(a as any).players?.name || "Unknown"}</p>
                    {a.due_date && <p className="text-xs text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>}
                  </div>
                  <Badge variant={statusColor(a.status)}>{a.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Drill</DialogTitle></DialogHeader>
          <DrillForm drill={drill} onSubmit={handleUpdate} onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AssignDrillDialog open={assignOpen} onOpenChange={setAssignOpen} onAssigned={fetchAssignments} />
    </div>
  );
}
