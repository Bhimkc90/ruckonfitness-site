"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
// Pages are prerendered, so the HTML carries the build year; the browser shows the current year.
const BUILD_YEAR = new Date().getFullYear();

// Copyright and founder credit, shared by the app footer and the Home footer.
export default function SiteCredit({ className = "" }: { className?: string }) {
  const year = useSyncExternalStore(noopSubscribe, () => new Date().getFullYear(), () => BUILD_YEAR);
  return (
    <p className={`text-xs leading-relaxed text-ink-2 ${className}`}>
      <span className="block sm:inline">© {year} RuckOn Fitness LLC. All rights reserved.</span>{" "}
      <span className="block sm:inline">
        Founded and built by <span className="font-semibold text-ink">Bhim KC</span>.
      </span>
    </p>
  );
}
