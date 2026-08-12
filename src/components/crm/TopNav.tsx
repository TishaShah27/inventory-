import { Search, Bell, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { QueryTrackerPanel } from "@/components/crm/QueryTrackerPanel";
import { getSession, clearSession } from "@/lib/employeeService";

export function TopNav({ hideSidebarTrigger = false }: { hideSidebarTrigger?: boolean }) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";
  const session = mounted ? getSession() : null;
  const displayName = session?.name ?? "Solar Admin";
  const initials = displayName
    .split(" ")
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function handleLogout() {
    clearSession();
    navigate({ to: "/inventory", search: { tab: "dashboard" }, replace: true } as any);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl md:px-6">
      {!hideSidebarTrigger && <SidebarTrigger className="rounded-lg" />}
      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search leads, customers, projects..."
          className="h-10 w-full rounded-full border border-transparent bg-muted/60 pl-10 pr-4 text-sm outline-none transition focus:border-primary/30 focus:bg-card focus:shadow-soft"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <QueryTrackerPanel />
        <button className="relative grid h-10 w-10 place-items-center rounded-full border bg-card transition hover:shadow-soft">
          <Bell className="h-[18px] w-[18px] text-muted-foreground" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
        </button>
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="grid h-10 w-10 place-items-center rounded-full border bg-card transition hover:shadow-soft"
          aria-label="Toggle theme"
        >
          {mounted && isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
        <div className="ml-1 hidden items-center gap-3 rounded-full border bg-card px-2 py-1.5 pr-4 sm:flex">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="gradient-primary text-xs font-semibold text-white">{initials || "SF"}</AvatarFallback>
          </Avatar>
          <div className="leading-tight">
            <div className="text-xs font-semibold">{displayName}</div>
            <div className="text-[10px] text-muted-foreground">{session?.contactNo ?? "Not signed in"}</div>
          </div>
          <Badge variant="secondary" className="hidden bg-primary-soft text-primary lg:inline-flex">Pro</Badge>
        </div>
        <button
          onClick={handleLogout}
          className="flex h-10 items-center gap-2 rounded-full border bg-card px-3 text-sm font-medium transition hover:bg-muted"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
