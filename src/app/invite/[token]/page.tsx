"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Loader2 } from "lucide-react";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [coachName, setCoachName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); }
        else { setPlayerName(data.playerName); setCoachName(data.coachName); }
      })
      .catch(() => setError("Invalid invite link"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSubmitting(false); return; }
    router.push("/player/login");
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><Trophy className="h-10 w-10 text-primary" /></div>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <CardDescription>{coachName} has invited you to CoachCRM</CardDescription>
        </CardHeader>
        <CardContent>
          {error === "Invite already accepted" ? (
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">This invite has already been accepted.</p>
              <Button onClick={() => router.push("/player/login")}>Go to Player Login</Button>
            </div>
          ) : error === "Invalid invite link" ? (
            <p className="text-center text-muted-foreground">This invite link is invalid or expired.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-sm text-muted-foreground">Welcome,</p>
                <p className="font-semibold text-lg">{playerName}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Create Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Create Account
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
