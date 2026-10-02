"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANDING_PAGES } from "@/lib/settings/settings";
import { useSettings } from "@/lib/storage/settings";
import { buttonClass } from "@/components/ui/Button";

// The explicit way into the app from Home. It opens the start page chosen in Settings (Dashboard by default).
// Home itself never redirects, so the logo can always bring people back here.
export default function AppEntryLink({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { landingPage } = useSettings();
  const label = landingPage === "/dashboard" ? "Open dashboard" : `Open ${LANDING_PAGES.find((p) => p.href === landingPage)?.label ?? "app"}`;
  return (
    <Link href={landingPage} onClick={onNavigate} className={buttonClass("primary", className)}>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
