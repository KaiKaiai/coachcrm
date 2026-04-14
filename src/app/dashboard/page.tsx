"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Player, TrainingSession } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Users,
  ClipboardList,
  PlusCircle,
  ArrowRight,
  Calendar,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface SessionWithPlayers extends TrainingSession {
  session_players: {
    player_id: string;
    players: Pick<Player, "id" | "name" | "position" | "jersey_number">;
  }[];
}

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/players").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
    ])
      .then(([playersData, sessionsData]) => {
        if (Array.isArray(playersData)) setPlayers(playersData);
        if (Array.isArray(sessionsData)) setSessions(sessionsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const analyzedCount = sessions.filter(
    (s) => s.status === "analyzed"
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, Coach. Here&apos;s your team overview.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Players
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : players.length}
            </div>
            <p className="text-xs text-muted-foreground">On your roster</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Training Sessions
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : sessions.length}
            </div>
            <p className="text-xs text-muted-foreground">Sessions recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Analyzed
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : analyzedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              AI feedback generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pending
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "-" : sessions.length - analyzedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting analysis
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest training recordings</CardDescription>
            </div>
            <Link
              href="/dashboard/sessions"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Loading...
              </p>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  No sessions yet
                </p>
                <Link
                  href="/dashboard/sessions/new"
                  className={cn(buttonVariants({ size: "sm" }), "gap-2")}
                >
                  <PlusCircle className="h-4 w-4" />
                  Record First Session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <Link
                    key={session.id}
                    href={`/dashboard/sessions/${session.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{session.title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.session_players?.length || 0} players
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          session.status === "analyzed"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Team Roster</CardTitle>
              <CardDescription>Your registered players</CardDescription>
            </div>
            <Link
              href="/dashboard/players"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Manage
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Loading...
              </p>
            ) : players.length === 0 ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-muted-foreground text-sm">
                  No players yet
                </p>
                <Link
                  href="/dashboard/players"
                  className={cn(buttonVariants({ size: "sm" }), "gap-2")}
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Players
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {players.slice(0, 8).map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {player.jersey_number ?? "#"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{player.name}</p>
                        {player.position && (
                          <p className="text-xs text-muted-foreground">
                            {player.position}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {players.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{players.length - 8} more players
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
