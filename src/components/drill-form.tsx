"use client";

import { useState } from "react";
import type { Drill } from "@/lib/types";
import { DRILL_CATEGORIES, DRILL_DIFFICULTIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DrillFormProps {
  drill?: Drill;
  onSubmit: (data: Partial<Drill>) => void;
  onCancel: () => void;
}

export function DrillForm({ drill, onSubmit, onCancel }: DrillFormProps) {
  const [title, setTitle] = useState(drill?.title || "");
  const [description, setDescription] = useState(drill?.description || "");
  const [category, setCategory] = useState(drill?.category || "");
  const [difficulty, setDifficulty] = useState(drill?.difficulty || "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(drill?.estimated_minutes?.toString() || "");
  const [videoUrl, setVideoUrl] = useState(drill?.video_url || "");
  const [sets, setSets] = useState(drill?.sets?.toString() || "");
  const [reps, setReps] = useState(drill?.reps?.toString() || "");
  const [targetMetric, setTargetMetric] = useState(drill?.target_metric || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(drill?.id && { id: drill.id }),
      title,
      description: description || null,
      category: (category || null) as Drill["category"],
      difficulty: (difficulty || null) as Drill["difficulty"],
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      video_url: videoUrl || null,
      sets: sets ? parseInt(sets) : null,
      reps: reps ? parseInt(reps) : null,
      target_metric: targetMetric || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="drill-title">Title *</Label>
        <Input id="drill-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Free Throw Practice" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="drill-desc">Description</Label>
        <Textarea id="drill-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the drill..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(val) => setCategory(val ?? "")}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {DRILL_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={(val) => setDifficulty(val ?? "")}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {DRILL_DIFFICULTIES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="drill-sets">Sets</Label>
          <Input id="drill-sets" type="number" value={sets} onChange={(e) => setSets(e.target.value)} min={0} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drill-reps">Reps</Label>
          <Input id="drill-reps" type="number" value={reps} onChange={(e) => setReps(e.target.value)} min={0} placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="drill-mins">Minutes</Label>
          <Input id="drill-mins" type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} min={0} placeholder="0" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="drill-target">Target Metric</Label>
        <Input id="drill-target" value={targetMetric} onChange={(e) => setTargetMetric(e.target.value)} placeholder="e.g. make 50 free throws" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="drill-video">Video URL</Label>
        <Input id="drill-video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={!title.trim()}>{drill ? "Update" : "Create"} Drill</Button>
      </div>
    </form>
  );
}
