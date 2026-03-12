"use client";

import { Bell, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Topbar() {
  const { theme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-20 mb-5 flex items-center justify-between rounded-xl border bg-card/80 px-4 py-3 backdrop-blur">
      <label className="relative hidden w-full max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm" placeholder="Search employees, candidates, documents" />
        <span className="absolute right-3 top-2 text-xs text-muted-foreground">Ctrl+K</span>
      </label>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" aria-label="Notifications"><Bell className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
