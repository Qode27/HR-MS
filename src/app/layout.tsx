import "@/app/globals.css";
import { AppProviders } from "@/components/app-providers";
import type { Metadata } from "next";
import { type ReactNode } from "react";

export const metadata: Metadata = {
  title: "PeopleFlow HR",
  description: "Enterprise-grade HRMS + ATS platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
