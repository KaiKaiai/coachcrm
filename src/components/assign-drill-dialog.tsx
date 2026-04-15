"use client";

import { useEffect, useState } from "react";
import type { Drill, Player, RecommendedDrill } from "@/lib/types";
import { DRILL_CATEGORIES, DRILL_DIFFICULTIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Library, PlusCircle } from "lucide-react";

interface AssignDrillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId?: string;
  sessionId?: string;
  drillTitle?: string;
  prefill?: RecommendedDrill;
  onAssigned?: () => void;
}

export function AssignDrillDialog({
  open,
  onOpenChange,
  playerId,
  sessionId,
  drillTitle,
  prefill,
  onAssigned,
}: AssignDrillDialogProps) {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedDrillId, setSelectedDrillId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState(playerId || "");
  const [dueDate, setDueDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<string>("create");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("");
  const [newMinutes, setNewMinutes] = useState("");
  const [newSets, setNewSets] = useState("");
  const [newReps, setNewReps] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/drills")
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setDrills(d);
        });
      if (!playerId) {
        fetch("/api/players")
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d)) setPlayers(d);
          });
      }
    }
  }, [open, playerId]);

  useEffect(() => {
    if (!open) return;
    const src = prefill || (drillTitle ? { title: drillTitle } : null);
    if (src) {
      setNewTitle(src.title || "");
      setNewDescription(src.description || "");
      setNewCategory(src.category || "");
      setNewDifficulty(src.difficulty || "");
      setNewSets(src.sets?.toString() || "");
      setNewReps(src.reps?.toString() || "");
      setNewMinutes(src.estimated_minutes?.toString() || "");
      setNewTarget(src.target_metric || "");
      setTab("create");

      const match = drills.find((d) =>
        d.title.toLowerCase().includes(src.title.toLowerCase())
      );
      if (match) setSelectedDrillId(match.id);
    }
  }, [prefill, drillTitle, drills, open]);

  useEffect(() => {
    if (!open) {
      setSelectedDrillId("");
      setDueDate("");
      setAssignNotes("");
      setNewTitle("");
      setNewDescription("");
      setNewCategory("");
      setNewDifficulty("");
      setNewMinutes("");
      setNewSets("");
      setNewReps("");
      setNewTarget("");
      setNewVideoUrl("");
    }
  }, [open]);

  const handleAssignExisting = async () => {
    if (!selectedDrillId || !selectedPlayerId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/player-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: selectedPlayerId,
          drill_id: selectedDrillId,
          session_id: sessionId || null,
          due_date: dueDate || null,
          notes: assignNotes || null,
        }),
      });
      if (res.ok) {
        onOpenChange(false);
        onAssigned?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!newTitle.trim() || !selectedPlayerId) return;
    setSaving(true);
    try {
      const drillRes = await fetch("/api/drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          category: newCategory || null,
          difficulty: newDifficulty || null,
          estimated_minutes: newMinutes ? parseInt(newMinutes) : null,
          video_url: newVideoUrl || null,
          sets: newSets ? parseInt(newSets) : null,
          reps: newReps ? parseInt(newReps) : null,
          target_metric: newTarget || null,
        }),
      });

      if (!drillRes.ok) return;
      const newDrill = await drillRes.json();

      const assignRes = await fetch("/api/player-drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: selectedPlayerId,
          drill_id: newDrill.id,
          session_id: sessionId || null,
          due_date: dueDate || null,
          notes: assignNotes || null,
        }),
      });

      if (assignRes.ok) {
        onOpenChange(false);
        onAssigned?.();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Drill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!playerId && (
            <div className="space-y-2">
              <Label>Player</Label>
              <Select
                value={selectedPlayerId}
                onValueChange={(v) => setSelectedPlayerId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1 gap-1.5">
                <PlusCircle className="h-3.5 w-3.5" />
                Create New
              </TabsTrigger>
              <TabsTrigger value="existing" className="flex-1 gap-1.5">
                <Library className="h-3.5 w-3.5" />
                From Library
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Free Throw Practice"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe the drill..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newCategory}
                    onValueChange={(v) => setNewCategory(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRILL_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={newDifficulty}
                    onValueChange={(v) => setNewDifficulty(v ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {DRILL_DIFFICULTIES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Sets</Label>
                  <Input
                    type="number"
                    value={newSets}
                    onChange={(e) => setNewSets(e.target.value)}
                    min={0}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reps</Label>
                  <Input
                    type="number"
                    value={newReps}
                    onChange={(e) => setNewReps(e.target.value)}
                    min={0}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Minutes</Label>
                  <Input
                    type="number"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    min={0}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Metric</Label>
                <Input
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. make 50 free throws"
                />
              </div>
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </TabsContent>

            <TabsContent value="existing" className="space-y-3 mt-3">
              <div className="space-y-2">
                <Label>Select Drill</Label>
                <Select
                  value={selectedDrillId}
                  onValueChange={(v) => setSelectedDrillId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from library" />
                  </SelectTrigger>
                  <SelectContent>
                    {drills.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.title}
                        {d.category ? ` (${d.category})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {drills.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No drills in your library yet. Use &quot;Create New&quot; instead.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Due Date (optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Coach Notes (optional)</Label>
            <Input
              value={assignNotes}
              onChange={(e) => setAssignNotes(e.target.value)}
              placeholder="Notes for the player..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {tab === "create" ? (
              <Button
                onClick={handleCreateAndAssign}
                disabled={saving || !newTitle.trim() || !selectedPlayerId}
                className="gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create & Assign
              </Button>
            ) : (
              <Button
                onClick={handleAssignExisting}
                disabled={saving || !selectedDrillId || !selectedPlayerId}
                className="gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Assign
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
