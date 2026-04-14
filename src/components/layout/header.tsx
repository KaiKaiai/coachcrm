"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MobileNav } from "./mobile-nav";
import { Button } from "@/components/ui/button";
import { Trophy, LogOut } from "lucide-react";

export function Header() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <MobileNav />
      <div className="flex items-center gap-2 md:hidden">
        <Trophy className="h-5 w-5 text-primary" />
        <span className="font-bold">CoachCRM</span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Basketball Coach Dashboard
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
