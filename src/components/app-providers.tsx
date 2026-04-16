"use client";

import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { DemoModeBootstrapper } from "@/components/demo-mode-bootstrapper";
import { type ReactNode } from "react";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DemoModeBootstrapper />
      {children}
      <Toaster richColors closeButton position="top-right" />
    </ThemeProvider>
  );
}
