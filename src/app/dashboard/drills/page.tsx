"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Drill } from "@/lib/types";
import { DRILL_CATEGORIES, DRILL_DIFFICULTIES } from "@/lib/types";
import { DrillForm } from "@/components/drill-form";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Dumbbell, Clock, Target, ArrowRight } from "lucide-react";

const difficultyColor = (d: string | null) =>
  d === "beginner" ? "text-green-600" : d === "intermediate" ? "text-yellow-600" : d === "advanced" ? "text-red-600" : "";

export default function DrillsPage() {
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("");
  const [filterDiff, setFilterDiff] = useState("");

  const fetchDrills = async () => {
    const params = new URLSearchParams();
    if (filterCat) params.set("category", filterCat);
    if (filterDiff) params.set("difficulty", filterDiff);
    const res = await fetch(`/api/drills?${params}`);
    const data = await res.json();
    if (Array.isArray(data)) setDrills(data);
    setLoading(false);
  };

  useEffect(() => { fetchDrills(); }, [filterCat, filterDiff]);

  const handleCreate = async (data: Partial<Drill>) => {
    const res = await fetch("/api/drills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { setDialogOpen(false); fetchDrills(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Drill Library</h1>
          <p className="text-muted-foreground">Create and manage your training drills.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
            <PlusCircle className="h-4 w-4" />
            Create Drill
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Drill</DialogTitle></DialogHeader>
            <DrillForm onSubmit={handleCreate} onCancel={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <Select value={filterCat} onValueChange={(v) => setFilterCat(v === "all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DRILL_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterDiff} onValueChange={(v) => setFilterDiff(v === "all" ? "" : (v ?? ""))}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Levels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DRILL_DIFFICULTIES.map((d) => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Loading drills...</p>
      ) : drills.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No drills yet. Create your first drill to get started.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drills.map((drill) => (
            <Link key={drill.id} href={`/dashboard/drills/${drill.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{drill.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{drill.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {drill.category && <Badge variant="secondary">{drill.category}</Badge>}
                    {drill.difficulty && <Badge variant="outline" className={difficultyColor(drill.difficulty)}>{drill.difficulty}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {drill.estimated_minutes && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{drill.estimated_minutes}min</span>
                    )}
                    {(drill.sets || drill.reps) && (
                      <span>{drill.sets && `${drill.sets}x`}{drill.reps || ""}</span>
                    )}
                    {drill.target_metric && (
                      <span className="flex items-center gap-1"><Target className="h-3 w-3" />{drill.target_metric}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
