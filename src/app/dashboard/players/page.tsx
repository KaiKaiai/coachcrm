"use client";

import React, { useEffect, useState } from "react";
import type { Player, PlayerDrillWithDrill } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Pencil, Trash2, Users, Link2, ArrowRight, UserPlus } from "lucide-react";
import Link from "next/link";

const POSITIONS = [
  "Point Guard",
  "Shooting Guard",
  "Small Forward",
  "Power Forward",
  "Center",
];

function PlayerForm({
  player,
  onSubmit,
  onCancel,
}: {
  player?: Player;
  onSubmit: (data: Partial<Player>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(player?.name || "");
  const [email, setEmail] = useState(player?.email || "");
  const [position, setPosition] = useState(player?.position || "");
  const [jerseyNumber, setJerseyNumber] = useState(
    player?.jersey_number?.toString() || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...(player?.id && { id: player.id }),
      name,
      email: email || null,
      position: position || null,
      jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Player name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@email.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="position">Position</Label>
        <Select value={position} onValueChange={(val) => setPosition(val ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select position" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="jersey">Jersey Number</Label>
        <Input
          id="jersey"
          type="number"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          placeholder="0"
          min={0}
          max={99}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          {player ? "Update" : "Add"} Player
        </Button>
      </div>
    </form>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [allDrills, setAllDrills] = useState<PlayerDrillWithDrill[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | undefined>();

  const fetchPlayers = async () => {
    try {
      const res = await fetch("/api/players");
      const data = await res.json();
      if (Array.isArray(data)) setPlayers(data);
    } catch (err) {
      console.error("Failed to fetch players:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const res = await fetch("/api/player-drills");
      const data = await res.json();
      if (Array.isArray(data)) setAllDrills(data);
    } catch (err) {
      console.error("Failed to fetch drills:", err);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchDrills();
  }, []);

  const getDrillsForPlayer = (playerId: string) =>
    allDrills.filter((d) => d.player_id === playerId);

  const getDrillCounts = (playerId: string) => {
    const pDrills = getDrillsForPlayer(playerId);
    return {
      total: pDrills.length,
      completed: pDrills.filter((d) => d.status === "completed").length,
      pending: pDrills.filter((d) => d.status !== "completed").length,
    };
  };

  const statusBadge = (s: string) =>
    s === "completed" ? "default" as const : s === "in_progress" ? "secondary" as const : "outline" as const;

  const handleAdd = async (data: Partial<Player>) => {
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchPlayers();
      }
    } catch (err) {
      console.error("Failed to add player:", err);
    }
  };

  const handleEdit = async (data: Partial<Player>) => {
    try {
      const res = await fetch("/api/players", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setDialogOpen(false);
        setEditingPlayer(undefined);
        fetchPlayers();
      }
    } catch (err) {
      console.error("Failed to update player:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this player?")) return;
    try {
      const res = await fetch(`/api/players?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchPlayers();
    } catch (err) {
      console.error("Failed to delete player:", err);
    }
  };

  const openEdit = (player: Player) => {
    setEditingPlayer(player);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingPlayer(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Players</h1>
          <p className="text-muted-foreground">
            Manage your team roster
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}>
          <DialogTrigger className={cn(buttonVariants(), "gap-2")}>
            <PlusCircle className="h-4 w-4" />
            Add Player
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlayer ? "Edit Player" : "Add New Player"}
              </DialogTitle>
            </DialogHeader>
            <PlayerForm
              player={editingPlayer}
              onSubmit={editingPlayer ? handleEdit : handleAdd}
              onCancel={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Roster
          </CardTitle>
          <CardDescription>
            {players.length} player{players.length !== 1 ? "s" : ""} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading players...
            </p>
          ) : players.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No players yet. Add your first player to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Drills</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => (
                  <React.Fragment key={player.id}>
                  <TableRow>
                    <TableCell className="font-mono">
                      {player.jersey_number ?? "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {player.name}
                    </TableCell>
                    <TableCell>
                      {player.position ? (
                        <Badge variant="secondary">{player.position}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const c = getDrillCounts(player.id);
                        return c.total > 0 ? (
                          <button
                            onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
                            className="text-sm text-left hover:underline"
                          >
                            <span className="font-medium">{c.total}</span>
                            <span className="text-muted-foreground text-xs ml-1">
                              ({c.completed} done, {c.pending} pending)
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              {expandedPlayer === player.id ? "▲" : "▼"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">0</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={player.invite_accepted ? "default" : "outline"}>
                        {player.invite_accepted ? "Active" : "Invited"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copy player invite link"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/invite/${player.invite_token}`);
                          }}
                        >
                          <Link2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send parent invite"
                          onClick={async () => {
                            const res = await fetch("/api/parent-invites", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ player_id: player.id }),
                            });
                            if (res.ok) {
                              const invite = await res.json();
                              navigator.clipboard.writeText(`${window.location.origin}/invite/parent/${invite.invite_token}`);
                            }
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(player)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(player.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Link href={`/dashboard/players/${player.id}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedPlayer === player.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="px-6 py-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Assigned Drills for {player.name}
                          </p>
                          {getDrillsForPlayer(player.id).length === 0 ? (
                            <p className="text-sm text-muted-foreground">No drills assigned.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {getDrillsForPlayer(player.id).map((pd) => {
                                const drill = (pd as any).drills;
                                return (
                                  <div
                                    key={pd.id}
                                    className="flex items-center justify-between rounded border bg-background px-3 py-2"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {drill?.title || "Unknown drill"}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {drill?.category && (
                                            <Badge variant="secondary" className="text-xs">
                                              {drill.category}
                                            </Badge>
                                          )}
                                          {drill?.difficulty && (
                                            <span>{drill.difficulty}</span>
                                          )}
                                          {drill?.sets && drill?.reps && (
                                            <span>{drill.sets}x{drill.reps}</span>
                                          )}
                                          {pd.due_date && (
                                            <span>Due: {new Date(pd.due_date).toLocaleDateString()}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <Badge variant={statusBadge(pd.status)}>
                                      {pd.status.replace("_", " ")}
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
