import { PlayerSidebar } from "@/components/layout/player-sidebar";
import { PlayerHeader } from "@/components/layout/player-header";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <PlayerSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlayerHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
