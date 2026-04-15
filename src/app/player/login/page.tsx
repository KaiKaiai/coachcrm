"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trophy, Loader2 } from "lucide-react";

export default function PlayerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    router.push("/player/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2"><Trophy className="h-10 w-10 text-primary" /></div>
          <CardTitle className="text-2xl">Player Login</CardTitle>
          <CardDescription>Sign in to view your training feedback and homework</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="your@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Your password" />
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}Sign In
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account? Ask your trainer for an invite link.
            </p>
            <p className="text-center text-sm">
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">I&apos;m a trainer</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
