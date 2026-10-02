"use client";

import { usePathname } from "next/navigation";

// Routes that use the light reading surface. Navigation (the sidebar and mobile bar) stays dark everywhere.
const LIGHT_ROUTES = ["/workouts"];

export default function ContentArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const light = LIGHT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  return <div className={`flex min-w-0 flex-1 flex-col bg-canvas text-ink ${light ? "theme-light" : ""}`}>{children}</div>;
}
