"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TrainingSession, Player } from "@/lib/types";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  PlusCircle,
  Calendar,
  Users,
  ArrowRight,
} from "lucide-react";

interface SessionWithPlayers extends TrainingSession {
  session_players: {
    player_id: string;
    players: Pick<Player, "id" | "name" | "position" | "jersey_number">;
  }[];
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (status: string) => {
    switch (status) {
      case "analyzed":
        return <Badge>Analyzed</Badge>;
      case "transcribed":
        return <Badge variant="secondary">Transcribed</Badge>;
      default:
        return <Badge variant="outline">Recording</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            View all training session recordings and feedback.
          </p>
        </div>
        <Link
          href="/dashboard/sessions/new"
          className={cn(buttonVariants(), "gap-2")}
        >
          <PlusCircle className="h-4 w-4" />
          New Session
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Training Sessions
          </CardTitle>
          <CardDescription>
            {sessions.length} session{sessions.length !== 1 ? "s" : ""} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-muted-foreground">
                No sessions yet. Record your first training session!
              </p>
              <Link
                href="/dashboard/sessions/new"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                Create New Session
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const playerCount =
                    session.session_players?.length || 0;
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">
                        {session.title}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground text-sm">
                          <Users className="h-3.5 w-3.5" />
                          {playerCount}
                        </span>
                      </TableCell>
                      <TableCell>{statusBadge(session.status)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/sessions/${session.id}`}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "icon" })
                          )}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
