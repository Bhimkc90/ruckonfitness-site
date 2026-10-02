"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandLink from "@/components/layout/BrandLink";
import AppEntryLink from "./AppEntryLink";

const links = [
  { href: "/aft-guide", label: "AFT Guide" },
  { href: "/workouts", label: "Exercise Library" },
];

// Header for the public Home page: logo, two guide links, and the app entry. Below md the links move into a
// disclosure menu.
export default function PublicHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);

  // Escape closes the menu and returns focus to its button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="theme-dark sticky top-0 z-30 border-b border-line bg-canvas text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandLink tone="dark" className="h-10 w-auto" />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
              {link.label}
            </Link>
          ))}
          <AppEntryLink className="ml-2" />
        </nav>

        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls="home-menu"
          onClick={() => setOpen(!open)}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-semibold text-ink md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          Menu
        </button>
      </div>

      <nav id="home-menu" aria-label="Main" hidden={!open} className="border-t border-line px-4 pb-4 pt-2 md:hidden">
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium text-ink hover:bg-surface-2">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <AppEntryLink className="mt-3 w-full" onNavigate={() => setOpen(false)} />
      </nav>
    </header>
  );
}
