"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TRAINING_PLANS_ENABLED } from "@/lib/features";
import {
  BookOpen,
  ClipboardList,
  ClipboardPlus,
  Dumbbell,
  History,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";

const primaryItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Record AFT", icon: ClipboardPlus, href: "/aft-calculator" },
  { name: "AFT Guide", icon: ClipboardList, href: "/aft-guide" },
  { name: "History", icon: History, href: "/score-history" },
  { name: "Library", icon: BookOpen, href: "/workouts" },
  // Personalized plans stay behind the release flag; until then the page shows labeled preview examples.
  { name: "Training plans", icon: Dumbbell, href: "/training-plan", badge: TRAINING_PLANS_ENABLED ? undefined : "Preview" },
  { name: "Profile", icon: User, href: "/profile" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

// Full RuckOn Fitness logo, white-text version for the dark navigation (public/brand/README.md).
function Brand({ className }: { className: string }) {
  return (
    <Link href="/dashboard" className="inline-flex rounded-lg">
      <Image
        src="/brand/ruckon-logo-on-dark.png"
        alt="RuckOn Fitness"
        width={1200}
        height={374}
        sizes="200px"
        loading="eager"
        className={className}
      />
    </Link>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { name: string; icon: typeof User; href: string; badge?: string };
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-surface-2 font-semibold text-ink shadow-[inset_3px_0_0_var(--color-accent)]"
          : "text-ink-2 hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-accent" : ""}`} aria-hidden />
      {item.name}
      {item.badge && (
        <span className="ml-auto rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const mobileNav = useRef<HTMLElement>(null);

  // Keep the current page visible in the horizontally scrolling mobile nav.
  useEffect(() => {
    mobileNav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  return (
    <>
      {/* Mobile: brand bar with a horizontally scrolling nav row. */}
      <header className="theme-dark sticky top-0 z-20 border-b border-line bg-canvas/95 text-ink backdrop-blur lg:hidden">
        <div className="px-4 pt-3">
          <Brand className="h-9 w-auto" />
        </div>
        <nav ref={mobileNav} aria-label="Main" className="flex gap-1 overflow-x-auto px-3 py-2">
          {primaryItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
      </header>

      {/* Desktop: compact fixed sidebar. */}
      <aside className="theme-dark sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-canvas px-3 py-5 text-ink lg:flex">
        <div className="px-2">
          <Brand className="h-auto w-48" />
        </div>
        <nav aria-label="Main" className="mt-8 flex flex-col gap-1">
          {primaryItems.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>
      </aside>
    </>
  );
}
