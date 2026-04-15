import { ParentSidebar } from "@/components/layout/parent-sidebar";
import { ParentHeader } from "@/components/layout/parent-header";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <ParentSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ParentHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
