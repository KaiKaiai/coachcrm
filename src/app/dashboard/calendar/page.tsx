"use client";

import { useEffect, useState } from "react";
import type { Player, ScheduledSessionWithPlayers } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, PlusCircle, CalendarDays, Clock, MapPin, Users, Loader2 } from "lucide-react";

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sessions, setSessions] = useState<ScheduledSessionWithPlayers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const weekDates = getWeekDates(currentDate);

  const fetchSessions = async () => {
    const start = formatDate(weekDates[0]);
    const end = formatDate(weekDates[6]);
    const res = await fetch(`/api/calendar?startDate=${start}&endDate=${end}`);
    const data = await res.json();
    if (Array.isArray(data)) setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
    fetch("/api/players").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setPlayers(d); });
  }, [currentDate]);

  const prevWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); };
  const nextWeek = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); };
  const goToday = () => setCurrentDate(new Date());

  const handleCreate = async () => {
    if (!title.trim() || !scheduledDate) return;
    setSaving(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description: description || null, scheduled_date: scheduledDate,
        start_time: startTime, end_time: endTime, location: location || null,
        playerIds: selectedPlayerIds,
      }),
    });
    if (res.ok) {
      setDialogOpen(false);
      setTitle(""); setDescription(""); setLocation(""); setSelectedPlayerIds([]);
      fetchSessions();
    }
    setSaving(false);
  };

  const openCreate = (date?: string) => {
    setScheduledDate(date || formatDate(new Date()));
    setDialogOpen(true);
  };

  const today = formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground">Schedule and manage training sessions.</p>
        </div>
        <Button onClick={() => openCreate()} className="gap-2"><PlusCircle className="h-4 w-4" />Schedule Session</Button>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
        <Button variant="outline" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
        <span className="text-sm font-medium">
          {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, i) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === today;
          const daySessions = sessions.filter((s) => s.scheduled_date === dateStr);

          return (
            <div key={dateStr} className={`min-h-[180px] rounded-lg border p-2 ${isToday ? "border-primary bg-primary/5" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {DAY_NAMES[i]} {date.getDate()}
                </span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openCreate(dateStr)}>
                  <PlusCircle className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {daySessions.map((s) => (
                  <div key={s.id} className="rounded border bg-card p-1.5 text-xs">
                    <p className="font-medium truncate">{s.title}</p>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {s.start_time.slice(0, 5)}
                    </p>
                    {s.scheduled_session_players?.length > 0 && (
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        {s.scheduled_session_players.length}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Date *</Label><Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Start</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
              <div className="space-y-2"><Label>End</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Main Court" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="space-y-2">
              <Label>Players</Label>
              <div className="grid gap-2 sm:grid-cols-2 max-h-[150px] overflow-y-auto">
                {players.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-accent text-sm">
                    <Checkbox checked={selectedPlayerIds.includes(p.id)} onCheckedChange={() => {
                      setSelectedPlayerIds((prev) => prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]);
                    }} />
                    {p.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !title.trim() || !scheduledDate} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
