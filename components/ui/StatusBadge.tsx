import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// Pass/fail always pairs color with an icon and a word.
export function PassFailBadge({ passed, size = "sm" }: { passed: boolean; size?: "sm" | "lg" }) {
  const Icon = passed ? CheckCircle2 : XCircle;
  const sizing = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizing} ${
        passed ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
      }`}
    >
      <Icon className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden />
      {passed ? "Pass" : "Fail"}
    </span>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink-2">
      {children}
    </span>
  );
}

// Event points, flagged with an icon and words (not color alone) when below the event minimum.
export function EventPoints({ points, minimum }: { points: number; minimum: number }) {
  const below = points < minimum;
  return (
    <span className={`inline-flex items-center justify-end gap-1 ${below ? "text-bad" : "text-ink"}`}>
      {below && <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      {points}
      {below && <span className="sr-only"> (below the {minimum}-point minimum)</span>}
    </span>
  );
}
