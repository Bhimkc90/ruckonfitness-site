"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const FOUNDER_URL = "https://www.bhimbkc.com/";
// Pages are prerendered, so the HTML carries the build year; the browser shows the current year.
const BUILD_YEAR = new Date().getFullYear();

// Copyright and founder credit, shared by the app footer and the Home footer.
export default function SiteCredit({ className = "" }: { className?: string }) {
  const year = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => BUILD_YEAR);
  return (
    <p className={`text-xs leading-relaxed text-ink-2 ${className}`}>
      <span className="block sm:inline">© {year} RuckOn Fitness LLC. All rights reserved.</span>{" "}
      <span className="block sm:inline">
        Founded and built by{" "}
        <a
          href={FOUNDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-sm font-semibold text-ink underline decoration-line-strong decoration-1 underline-offset-2 transition-colors hover:decoration-ink hover:decoration-2"
        >
          Bhim KC<span className="sr-only"> (opens in a new tab)</span>
        </a>
        .
      </span>
    </p>
  );
}
